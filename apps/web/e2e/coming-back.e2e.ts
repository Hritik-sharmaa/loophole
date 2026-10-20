import { expect, test } from '@playwright/test';
import { finishWelcome, passFirstLessonQuickly, signUp } from './helpers';

// J-4 Coming back (PRD §5): after a lesson, a fresh visit goes straight to
// the courses (no welcome again), the header shows the streak and today's
// goal, and the leaderboard has the learner's weekly XP.
test('J-4: a returning learner sees their streak, goal and rank', async ({
  page,
}) => {
  await signUp(page, 'j4');
  await finishWelcome(page, 'Python Basics', 'Regular');
  await passFirstLessonQuickly(page);

  await page.goto('/learn');
  await page.reload();
  await expect(page.getByText('Ready to keep going?')).toBeVisible();
  await expect(page).toHaveURL(/\/learn$/);
  await expect(page.getByText('1 day streak')).toBeAttached();
  await expect(page.getByText('Daily goal: 10 of 20 XP today')).toBeAttached();

  // The learner's own row on this week's board, marked "(you)".
  await page.goto('/leaderboard');
  await expect(
    page.getByRole('listitem').filter({ hasText: '(you)' }),
  ).toContainText('10 XP');
});
