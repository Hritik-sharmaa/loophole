import type { TestResult, WebCheck } from '@loophole/shared';
import { is, selectAll } from 'css-select';
import {
  AttributeAction,
  parse as parseSelector,
  SelectorType,
  type Selector,
} from 'css-what';
import type { AnyNode, Element } from 'domhandler';
import { getAttributeValue, textContent } from 'domutils';
import { parseDocument } from 'htmlparser2';
import postcss, { type Declaration } from 'postcss';
import type { Grade } from './grading.js';
import { STDERR_MAX } from './grading.js';

// Grading for web exercises (ADR-024). The learner's page is parsed, never
// run: no scripts execute and nothing renders. Each check is a rule about
// the page's elements, attributes or CSS.
//
// CSS is "declared", not computed: a style check looks for the winning
// declaration of a property on each matching element across the page's
// <style> blocks and style="" attributes, by !important, specificity and
// source order. There is no inheritance, layout or default browser style,
// so content must check the element the learner is told to style.

type StyleEntry = {
  selector: string;
  specificity: Specificity;
  decls: Declaration[];
  order: number;
};

// [inline, ids, classes/attributes/pseudo-classes, types/pseudo-elements]
type Specificity = [number, number, number, number];

type Candidate = {
  value: string;
  important: boolean;
  specificity: Specificity;
  order: number;
};

const INLINE: Specificity = [1, 0, 0, 0];

// Checks a page against every rule. `cssErrors` are syntax errors found in
// <style> blocks, so the learner can be told why a style check failed.
export function checkPage(
  html: string,
  checks: readonly WebCheck[],
): { results: { label: string; passed: boolean }[]; cssErrors: string[] } {
  const doc = parseDocument(html, {
    lowerCaseTags: true,
    lowerCaseAttributeNames: true,
  });
  const { entries, errors } = collectStyles(doc.children);

  const results = checks.map((check) => {
    let passed = false;
    try {
      passed = passes(check, doc.children, entries);
    } catch {
      // A selector css-select can't handle is a failed check, not a crash.
    }
    return { label: check.label, passed };
  });
  return { results, cssErrors: errors };
}

// The same Grade shape as program exercises, so submissions, XP and the
// results panel need no special case. Every check is visible: there are no
// hidden checks, because meeting them is the exercise.
export function gradeChecks(outcome: ReturnType<typeof checkPage>): Grade {
  const results: TestResult[] = outcome.results.map((r) => ({
    kind: 'check',
    passed: r.passed,
    label: r.label,
  }));
  const testsPassed = results.filter((r) => r.passed).length;
  return {
    status: testsPassed === results.length ? 'passed' : 'failed',
    testsPassed,
    totalTests: results.length,
    results,
    stderr: outcome.cssErrors.join('\n').slice(0, STDERR_MAX),
  };
}

function passes(
  check: WebCheck,
  nodes: AnyNode[],
  styles: StyleEntry[],
): boolean {
  const elements = selectAll<AnyNode, Element>(check.selector, nodes);

  switch (check.type) {
    case 'element': {
      const matching =
        check.text === undefined
          ? elements
          : elements.filter(
              (el) => collapse(textContent(el)) === collapse(check.text!),
            );
      return matching.length >= (check.min ?? 1);
    }
    case 'attribute':
      return elements.some((el) => {
        const value = getAttributeValue(el, check.name);
        return (
          value !== undefined &&
          (check.value === undefined || value.trim() === check.value)
        );
      });
    case 'style': {
      const accepted = [check.value].flat().map(normalizeValue);
      const property = check.property.toLowerCase();
      return (
        elements.length > 0 &&
        elements.every((el) => {
          const value = declaredValue(el, property, styles);
          return value !== null && accepted.includes(normalizeValue(value));
        })
      );
    }
  }
}

// Every rule in the page's <style> blocks, one entry per selector in a
// selector list. Rules inside @media still count; @keyframes steps don't.
function collectStyles(nodes: AnyNode[]): {
  entries: StyleEntry[];
  errors: string[];
} {
  const entries: StyleEntry[] = [];
  const errors: string[] = [];
  let order = 0;

  for (const style of selectAll<AnyNode, Element>('style', nodes)) {
    let root: postcss.Root;
    try {
      root = postcss.parse(textContent(style));
    } catch (err) {
      errors.push(`CSS error: ${cssErrorMessage(err)}`);
      continue;
    }
    root.walkRules((rule) => {
      if (
        rule.parent?.type === 'atrule' &&
        /keyframes$/i.test((rule.parent as postcss.AtRule).name)
      ) {
        return;
      }
      const decls = rule.nodes.filter(
        (n): n is Declaration => n.type === 'decl',
      );
      for (const selector of rule.selectors) {
        const specificity = specificityOf(selector);
        if (specificity) {
          entries.push({ selector, specificity, decls, order: order++ });
        }
      }
    });
  }
  return { entries, errors };
}

// The value that wins for `property` on `el`, or null if nothing sets it.
function declaredValue(
  el: Element,
  property: string,
  styles: StyleEntry[],
): string | null {
  const candidates: Candidate[] = [];

  for (const entry of styles) {
    if (!matches(el, entry.selector)) continue;
    for (const decl of entry.decls) {
      if (decl.prop.toLowerCase() === property) {
        candidates.push({
          value: decl.value,
          important: decl.important,
          specificity: entry.specificity,
          order: entry.order,
        });
      }
    }
  }

  const inline = getAttributeValue(el, 'style');
  if (inline) {
    try {
      postcss.parse(`x{${inline}}`).walkDecls((decl) => {
        if (decl.prop.toLowerCase() === property) {
          candidates.push({
            value: decl.value,
            important: decl.important,
            specificity: INLINE,
            order: Number.MAX_SAFE_INTEGER,
          });
        }
      });
    } catch {
      // A broken style attribute sets nothing.
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort(compareCandidates);
  return candidates[candidates.length - 1].value;
}

// Ascending: the last one wins.
function compareCandidates(a: Candidate, b: Candidate): number {
  if (a.important !== b.important) return a.important ? 1 : -1;
  for (let i = 0; i < 4; i++) {
    if (a.specificity[i] !== b.specificity[i]) {
      return a.specificity[i] - b.specificity[i];
    }
  }
  return a.order - b.order;
}

function matches(el: Element, selector: string): boolean {
  try {
    return is<AnyNode, Element>(el, selector);
  } catch {
    // e.g. :hover or ::before, which never match a parsed page.
    return false;
  }
}

// Specificity of one selector, or null if it can't be parsed.
export function specificityOf(selector: string): Specificity | null {
  let parsed: Selector[][];
  try {
    parsed = parseSelector(selector);
  } catch {
    return null;
  }
  return parsed.length === 1 ? specificityOfTokens(parsed[0]) : null;
}

function specificityOfTokens(tokens: Selector[]): Specificity {
  const s: Specificity = [0, 0, 0, 0];
  for (const token of tokens) {
    switch (token.type) {
      case SelectorType.Attribute:
        if (token.name === 'id' && token.action === AttributeAction.Equals) {
          s[1]++;
        } else {
          s[2]++;
        }
        break;
      case SelectorType.Pseudo:
        if (token.name === 'where') break;
        if (
          Array.isArray(token.data) &&
          ['is', 'not', 'has', 'matches'].includes(token.name)
        ) {
          // The most specific selector in the list counts.
          const inner = token.data.map(specificityOfTokens);
          const max = inner.sort((a, b) => compareSpec(b, a))[0];
          if (max) for (let i = 0; i < 4; i++) s[i] += max[i];
          break;
        }
        s[2]++;
        break;
      case SelectorType.PseudoElement:
      case SelectorType.Tag:
        s[3]++;
        break;
      default:
        // Universal selector and combinators add nothing.
        break;
    }
  }
  return s;
}

function compareSpec(a: Specificity, b: Specificity): number {
  for (let i = 0; i < 4; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

// "Orange", " #FFA500 ", "'Arial', sans-serif" compare as written in
// content: lower case, single spaces, no quotes, no space around commas.
export function normalizeValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/!important\s*$/, '')
    .replace(/["']/g, '')
    .replace(/\s*,\s*/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
}

function cssErrorMessage(err: unknown): string {
  if (err instanceof postcss.CssSyntaxError) {
    return `${err.reason} (line ${err.line ?? '?'} of your <style>)`;
  }
  return String(err);
}
