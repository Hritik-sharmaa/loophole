import { expect, test } from '@playwright/test';
import { finishWelcome, HELLO, signUp, typeCode } from './helpers';

// J-1 First lesson (PRD §5), as the app works today: sign up → welcome →
// Learn cards (ending with a bug to spot) → quick check → exercise → Run →
// finish screen → the next lesson is open on the path.
test('J-1: a new learner finishes their first lesson', async ({ page }) => {
  await signUp(page, 'j1');
  await finishWelcome(page, 'Python Basics', 'Regular');
  await expect(page.getByText(/2 lessons a day/)).toBeVisible();
  await page.getByRole('link', { name: 'Start my first lesson' }).click();

  // Learn cards: Continue until the spot-the-bug card.
  await expect(
    page.getByRole('heading', { level: 1, name: 'Hello, world' }),
  ).toBeVisible();
  const lines = page.getByRole('button', { name: /^Line \d+/ });
  while (!(await lines.first().isVisible())) {
    await page.getByRole('button', { name: 'Continue' }).click();
  }

  // Spot the bug: tap lines until the right one lights up.
  const found = page.getByText('You found it!');
  for (const line of await lines.all()) {
    if (await found.isVisible()) break;
    if (await line.isEnabled()) await line.click();
  }
  await expect(found.or(page.getByText(/The bug is on line/))).toBeVisible();
  await page.getByRole('button', { name: 'Quick check' }).click();

  // Quick check: try the answers in turn until it says so.
  const right = page.getByText("That's it!");
  const options = page.locator('section ul li button:visible');
  for (const option of await options.all()) {
    if (await right.isVisible()) break;
    if (await option.isEnabled()) await option.click();
  }
  await expect(right).toBeVisible();
  await page.getByRole('button', { name: 'Start the exercise' }).click();

  // The exercise: write the answer and run it.
  await expect(page.getByText('Your task')).toBeVisible();
  await typeCode(page, HELLO);
  await page.getByRole('button', { name: 'Run', exact: true }).click();

  // The finish screen: XP, the streak and the daily goal.
  await expect(
    page.getByRole('heading', { name: 'Lesson complete!' }),
  ).toBeVisible();
  await expect(page.getByText('+10')).toBeVisible();
  await expect(page.getByText('1 day', { exact: true })).toBeVisible();
  await expect(page.getByText(/Daily goal: 10 of 20 XP/)).toBeVisible();

  // Back on the path: lesson 1 done, lesson 2 is next.
  await page.getByRole('link', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/learn\/python$/);
  await expect(
    page.getByRole('link', { name: /Hello, world.*\(completed\)/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Greet by name.*\(start here\)/ }),
  ).toBeVisible();
});
