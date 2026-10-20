import { expect, type Page } from '@playwright/test';

// Steps shared by the journeys. Every test signs up its own user, so the
// mock backend's state never leaks between tests.

export function uniqueEmail(prefix: string): string {
  const tag = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return `${prefix}-${tag}@loophole.test`;
}

// Sign up on /login; a new learner lands on the welcome (ADR-033).
export async function signUp(page: Page, prefix: string): Promise<string> {
  const email = uniqueEmail(prefix);
  await page.goto('/login');
  // The link under the form switches to sign-up mode.
  await page.getByRole('button', { name: 'Sign up' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page).toHaveURL(/\/welcome$/);
  return email;
}

// The welcome: pick a course and a goal, then meet the guide.
export async function finishWelcome(
  page: Page,
  course = 'Python Basics',
  goal = 'Regular',
): Promise<void> {
  await page.getByRole('button', { name: new RegExp(course) }).click();
  await page.getByRole('button', { name: new RegExp(`^${goal}`) }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: /I'm / })).toBeVisible();
}

// Replace the code in the (only visible) CodeMirror editor. insertText
// skips CodeMirror's bracket auto-closing, so the code lands as written.
export async function typeCode(page: Page, code: string): Promise<void> {
  const editor = page.locator('.cm-content:visible').last();
  await editor.click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText(code);
}

// The Python "Hello, world" answer, accepted by the mock grader.
export const HELLO = 'print("Hello, Loophole!")';

// Skip the Learn step and pass lesson 1, ending on the finish screen.
export async function passFirstLessonQuickly(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Start my first lesson' }).click();
  await page.getByRole('button', { name: /^Skip/ }).click();
  await typeCode(page, HELLO);
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Lesson complete!' }),
  ).toBeVisible();
}
