import { expect, test } from '@playwright/test';
import { finishWelcome, passFirstLessonQuickly, signUp } from './helpers';

// Career paths on the catalog (ADR-045) and the avatar maker (ADR-046): a
// new learner sees where each path starts, finishes a lesson, makes an
// avatar, and finds it next to their name on the leaderboard.
test('a learner follows a career path and makes an avatar', async ({
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
  await page.getByRole('link', { name: 'Edit avatar' }).click();
  await expect(
    page.getByRole('heading', { name: 'Make your avatar' }),
  ).toBeVisible();
  // Nothing to save until something changes.
  const save = page.getByRole('button', { name: 'Save avatar' });
  await expect(save).toBeDisabled();

  await page.getByRole('button', { name: 'Braid' }).click();
  await page.getByRole('button', { name: 'Hair colour: Auburn' }).click();
  await page.getByRole('tab', { name: 'Item' }).click();
  const cat = page.getByRole('button', { name: 'Cat on your head' });
  await cat.click();
  await expect(cat).toHaveAttribute('aria-pressed', 'true');
  await save.click();
  await expect(page.getByText(/Saved/)).toBeVisible();

  // Saved on the server: a fresh load comes back with the same parts.
  await page.reload();
  await page.getByRole('tab', { name: 'Item' }).click();
  await expect(
    page.getByRole('button', { name: 'Cat on your head' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('tab', { name: 'Hair' }).click();
  await expect(page.getByRole('button', { name: 'Braid' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.goto('/leaderboard');
  await page.getByRole('tab', { name: 'This week' }).click();
  const mine = page.getByRole('listitem').filter({ hasText: '(you)' });
  await expect(mine.locator('svg').first()).toBeVisible();
});
