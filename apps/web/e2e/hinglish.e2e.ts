import { expect, test } from '@playwright/test';
import { finishWelcome, HELLO, signUp, typeCode } from './helpers';

// Hinglish lessons (ADR-042): picked in the welcome, the first Python
// lesson's cards, bug card, quick check, task and finish line are in
// Hinglish; code stays the same. The profile switches back to English.
test('a learner picks Hinglish, learns in it, then switches to English', async ({
  page,
}) => {
  await signUp(page, 'hi');
  await finishWelcome(page, 'Python Basics', 'Regular', 'Hinglish');
  await page.getByRole('link', { name: 'Start my first lesson' }).click();

  await expect(page.getByText('Python ki pehli line')).toBeVisible();
  await expect(page.getByText('print("Hello!")')).toBeVisible();
  const lines = page.getByRole('button', { name: /^Line \d+/ });
  while (!(await lines.first().isVisible())) {
    await page.getByRole('button', { name: 'Continue' }).click();
  }
  await expect(page.getByText('Bug wali line par tap karo.')).toBeVisible();
  await page.getByRole('button', { name: 'Line 2', exact: true }).click();
  await expect(page.getByText('Bug mil gaya!')).toBeVisible();
  await expect(page.getByText(/closing quote nahi hai/)).toBeVisible();
  await page.getByRole('button', { name: 'Quick check' }).click();

  await expect(page.getByText('Yeh kya print karega?')).toBeVisible();
  await page.getByText('Hi, there!', { exact: true }).click();
  await expect(page.getByText('Bilkul sahi!')).toBeVisible();
  await page.getByRole('button', { name: 'Start the exercise' }).click();

  await expect(
    page.getByText(/Har programmer yahin se shuru karta hai/),
  ).toBeVisible();
  await typeCode(page, HELLO);
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(
    page.getByText(/Aapne\s+Hello, world\s+poora kar liya/),
  ).toBeVisible();

  // The profile switches it back; the lesson follows.
  await page.goto('/profile');
  await page.getByRole('button', { name: /^English/ }).click();
  await expect(page.getByRole('button', { name: /^English/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.goto('/learn/python');
  await page.getByRole('link', { name: /Hello, world/ }).click();
  // A finished lesson opens on its task, now in English.
  await expect(page.getByText(/Every programmer starts here/)).toBeVisible();
});
