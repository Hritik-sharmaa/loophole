import type { WebCheck } from '@loophole/shared';
import {
  checkPage,
  gradeChecks,
  normalizeValue,
  specificityOf,
} from '../web-checks.js';

const passed = (html: string, check: WebCheck) =>
  checkPage(html, [check]).results[0].passed;

const orangeH1: WebCheck = {
  type: 'style',
  label: 'The h1 is orange',
  selector: 'h1',
  property: 'color',
  value: ['orange', '#ffa500'],
};

describe('element checks', () => {
  const h1: WebCheck = {
    type: 'element',
    label: 'Has an h1',
    selector: 'h1',
  };

  it('finds an element, in any letter case', () => {
    expect(passed('<H1>Hi</H1>', h1)).toBe(true);
    expect(passed('<h2>Hi</h2>', h1)).toBe(false);
  });

  it('matches text exactly after collapsing whitespace', () => {
    const check = { ...h1, text: 'Hello, web!' };
    expect(passed('<h1>\n  Hello,   web!\n</h1>', check)).toBe(true);
    expect(passed('<h1>Hello, Web!</h1>', check)).toBe(false);
    expect(passed('<h1>Hello, web!!</h1>', check)).toBe(false);
  });

  it('counts with min', () => {
    const three = {
      type: 'element' as const,
      label: '3 items',
      selector: 'ul > li',
      min: 3,
    };
    expect(passed('<ul><li>a</li><li>b</li><li>c</li></ul>', three)).toBe(true);
    expect(passed('<ul><li>a</li><li>b</li></ul>', three)).toBe(false);
    // Outside a ul they don't count.
    expect(passed('<li>a</li><li>b</li><li>c</li>', three)).toBe(false);
  });

  it('ignores the text inside comments and attributes', () => {
    expect(passed('<!-- <h1>Hi</h1> -->', h1)).toBe(false);
    expect(passed('<p title="<h1>">x</p>', h1)).toBe(false);
  });
});

describe('attribute checks', () => {
  const link: WebCheck = {
    type: 'attribute',
    label: 'Links to example.com',
    selector: 'a',
    name: 'href',
    value: 'https://example.com',
  };

  it('needs the attribute with the value, trimmed', () => {
    expect(passed('<a href=" https://example.com ">x</a>', link)).toBe(true);
    expect(passed('<a href="https://example.org">x</a>', link)).toBe(false);
    expect(passed('<a>x</a>', link)).toBe(false);
  });

  it('accepts any value when none is given', () => {
    const alt = { ...link, selector: 'img', name: 'alt', value: undefined };
    expect(passed('<img src="a.png" alt="A cat">', alt)).toBe(true);
    expect(passed('<img src="a.png">', alt)).toBe(false);
  });
});

describe('style checks', () => {
  it('reads a rule in a <style> block, any accepted value', () => {
    expect(
      passed('<style>h1 { color: orange; }</style><h1>x</h1>', orangeH1),
    ).toBe(true);
    expect(
      passed('<style>h1 { color: #FFA500 }</style><h1>x</h1>', orangeH1),
    ).toBe(true);
    expect(
      passed('<style>h1 { color: blue; }</style><h1>x</h1>', orangeH1),
    ).toBe(false);
  });

  it('matches the element, not the selector text', () => {
    // Styled through a class or a list: still the h1 that is orange.
    expect(
      passed(
        '<style>.title { color: orange }</style><h1 class="title">x</h1>',
        orangeH1,
      ),
    ).toBe(true);
    expect(
      passed('<style>h2, h1 { color: orange }</style><h1>x</h1>', orangeH1),
    ).toBe(true);
  });

  it('needs every matching element to have the value', () => {
    const html =
      '<style>.a { color: orange }</style><h1 class="a">x</h1><h1>y</h1>';
    expect(passed(html, orangeH1)).toBe(false);
  });

  it('fails when there is no matching element at all', () => {
    expect(
      passed('<style>h1 { color: orange }</style><p>x</p>', orangeH1),
    ).toBe(false);
  });

  it('follows the cascade: later wins at equal specificity', () => {
    const html =
      '<style>h1 { color: orange } h1 { color: blue }</style><h1>x</h1>';
    expect(passed(html, orangeH1)).toBe(false);
  });

  it('follows the cascade: higher specificity wins over order', () => {
    const html =
      '<style>h1.t { color: orange } h1 { color: blue }</style><h1 class="t">x</h1>';
    expect(passed(html, orangeH1)).toBe(true);
  });

  it('follows the cascade: !important wins, inline beats rules', () => {
    expect(
      passed(
        '<style>#a { color: blue } h1 { color: orange !important }</style><h1 id="a">x</h1>',
        orangeH1,
      ),
    ).toBe(true);
    expect(
      passed(
        '<style>h1 { color: blue }</style><h1 style="color: orange">x</h1>',
        orangeH1,
      ),
    ).toBe(true);
  });

  it('does not inherit: a colour on body is not the h1 colour', () => {
    expect(
      passed(
        '<style>body { color: orange }</style><body><h1>x</h1></body>',
        orangeH1,
      ),
    ).toBe(false);
  });

  it('normalizes case, spaces and quotes in values', () => {
    const font: WebCheck = {
      type: 'style',
      label: 'Arial',
      selector: 'p',
      property: 'font-family',
      value: 'arial, sans-serif',
    };
    expect(
      passed(
        '<style>p { font-family: "Arial" ,  Sans-Serif }</style><p>x</p>',
        font,
      ),
    ).toBe(true);
  });

  it('ignores rules it cannot match, like :hover, without failing others', () => {
    const html =
      '<style>h1:hover { color: blue } p::before { color: red } h1 { color: orange }</style><h1>x</h1><p>y</p>';
    expect(passed(html, orangeH1)).toBe(true);
  });

  it('reports broken CSS and fails the style check', () => {
    const outcome = checkPage('<style>h1 { color: orange</style><h1>x</h1>', [
      orangeH1,
    ]);
    expect(outcome.results[0].passed).toBe(false);
    expect(outcome.cssErrors[0]).toMatch(/^CSS error: .*line 1/);
  });
});

describe('specificityOf', () => {
  it.each([
    ['h1', [0, 0, 0, 1]],
    ['.title', [0, 0, 1, 0]],
    ['#main', [0, 1, 0, 0]],
    ['nav a:first-child', [0, 0, 1, 2]],
    ['ul > li.item[data-x]', [0, 0, 2, 2]],
    [':where(#a) p', [0, 0, 0, 1]],
    [':not(#a) p', [0, 1, 0, 1]],
    ['*', [0, 0, 0, 0]],
  ])('%s', (selector, expected) => {
    expect(specificityOf(selector)).toEqual(expected);
  });

  it('returns null for something that is not a selector', () => {
    expect(specificityOf('h1[')).toBeNull();
  });
});

describe('normalizeValue', () => {
  it('lowercases, trims, drops quotes and !important', () => {
    expect(normalizeValue('  "Comic Sans MS" ,  Cursive !important ')).toBe(
      'comic sans ms,cursive',
    );
  });
});

describe('gradeChecks', () => {
  it('passes only when every check passes, with labels as results', () => {
    const outcome = checkPage('<h1>Hi</h1>', [
      { type: 'element', label: 'Has an h1', selector: 'h1' },
      { type: 'element', label: 'Has a p', selector: 'p' },
    ]);
    expect(gradeChecks(outcome)).toEqual({
      status: 'failed',
      testsPassed: 1,
      totalTests: 2,
      results: [
        { kind: 'check', passed: true, label: 'Has an h1' },
        { kind: 'check', passed: false, label: 'Has a p' },
      ],
      stderr: '',
    });
  });

  it('a bad selector in content fails its check instead of throwing', () => {
    const outcome = checkPage('<h1>x</h1>', [
      { type: 'element', label: 'Broken', selector: 'h1[' },
    ]);
    expect(gradeChecks(outcome).status).toBe('failed');
  });

  it('copes with a large hostile page', () => {
    const html =
      '<style>' +
      'div div div { color: red } '.repeat(200) +
      '</style>' +
      '<div>'.repeat(300) +
      '<h1>x</h1>' +
      '</div>'.repeat(300);
    const started = Date.now();
    checkPage(html, [orangeH1]);
    expect(Date.now() - started).toBeLessThan(2000);
  });
});
