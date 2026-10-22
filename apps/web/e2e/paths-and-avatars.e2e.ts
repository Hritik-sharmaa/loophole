import { expect, test } from '@playwright/test';
import { finishWelcome, passFirstLessonQuickly, signUp } from './helpers';

// Career paths on the catalog (ADR-045) and avatars (ADR-044): a new
// learner sees where each path starts, finishes a lesson, picks an avatar
// on the profile, and finds it next to their name on the leaderboard.
test('a learner follows a career path and picks an avatar', async ({
  page,
}) => {
  await signUp(page, 'av');
  await finishWelcome(page);
  await passFirstLessonQuickly(page);

  await page.goto('/learn');
  const paths = page.getByRole('region', { name: 'Career paths' });
  await expect(paths.getByText('Frontend developer')).toBeVisible();
  await expect(
    paths.getByRole('list', { name: 'Python programmer courses' }),
  ).toContainText('Python Basics');
  // One Python lesson done: the Python paths carry on, Frontend starts.
  await expect(
    paths.getByRole('link', { name: /Next: Python Basics/ }).first(),
  ).toBeVisible();
  await expect(
    paths.getByRole('link', { name: /Start with/ }).first(),
  ).toBeVisible();

  await page.goto('/profile');
  const curly = page.getByRole('button', { name: 'Curly hair and earrings' });
  await curly.click();
  await expect(curly).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Curly hair and earrings' }),
  ).toHaveAttribute('aria-pressed', 'true');

  await page.goto('/leaderboard');
  await page.getByRole('tab', { name: 'This week' }).click();
  const mine = page.getByRole('listitem').filter({ hasText: '(you)' });
  await expect(mine.locator('svg').first()).toBeVisible();
});
