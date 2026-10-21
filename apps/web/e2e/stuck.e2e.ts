import { expect, test } from '@playwright/test';
import { finishWelcome, HELLO, signUp, typeCode } from './helpers';

// J-2 Stuck on an exercise (PRD §5): a failing run with an error →
// "Explain my error" → "Hint" → fix it → pass.
test('J-2: a stuck learner gets an explanation and a hint, then passes', async ({
  page,
}) => {
  await signUp(page, 'j2');
  await finishWelcome(page);
  await page.getByRole('link', { name: 'Start my first lesson' }).click();

  // The first card didn't land: the guide says it another way (ADR-036).
  await page
    .getByRole('button', { name: /Explain it differently/ })
    .first()
    .click();
  await expect(page.getByText('In other words')).toBeVisible();
  await expect(page.getByText(/Think of it like this/)).toBeVisible();

  await page.getByRole('button', { name: /^Skip/ }).click();

  // A typo: the run fails with a NameError.
  await typeCode(page, 'pront("Hello, Loophole!")');
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(page.getByText(/0 of 4 tests passed/)).toBeVisible();
  await expect(page.getByText(/NameError: name 'pront'/)).toBeVisible();

  // The tutor explains, pointing at the line, then nudges.
  await page.getByRole('button', { name: 'Explain my error' }).click();
  await expect(page.getByText(/What went wrong · line 1/)).toBeVisible();
  await expect(
    page.getByText(/does not know the name on line 1/),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Hint' }).click();
  await expect(
    page.getByText('Look closely at the word before the brackets.'),
  ).toBeVisible();

  // Fixed: it passes.
  await typeCode(page, HELLO);
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Lesson complete!' }),
  ).toBeVisible();
});
