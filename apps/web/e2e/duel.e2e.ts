import { expect, test } from '@playwright/test';
import { finishWelcome, signUp, typeCode } from './helpers';

// J-3 First duel (PRD §5), against the mock's /duels socket: find a duel →
// matched → the buggy program and the clock → the opponent's progress →
// submit a fix → the server declares the win and the rating moves.
test('J-3: a learner wins their first duel', async ({ page }) => {
  await signUp(page, 'j3');
  await finishWelcome(page);
  await page.goto('/duels');

  await page.getByRole('button', { name: 'Find a duel' }).click();
  await expect(
    page.getByRole('heading', { name: 'Average of a list' }),
  ).toBeVisible();
  await expect(page.getByRole('timer')).toBeVisible();
  await expect(page.getByText(/vs ananya/)).toBeVisible();
  await expect(page.getByText(/2 \/ 5\s+tests passing/)).toBeVisible();

  // Any change to the buggy program counts as the fix for the mock.
  await typeCode(
    page,
    'n = int(input())\nnums = list(map(int, input().split()))\nprint(f"{sum(nums) / n:.2f}")\n',
  );
  await page.getByRole('button', { name: 'Submit fix' }).click();

  await expect(page.getByText('You won!')).toBeVisible();
  await expect(page.getByText('You beat ananya.')).toBeVisible();
  await expect(page.getByText('Rating +16')).toBeVisible();
});
