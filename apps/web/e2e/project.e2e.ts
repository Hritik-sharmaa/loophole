import { expect, test } from '@playwright/test';
import type { CoursePath, LessonDetail } from '@loophole/shared';
import { finishWelcome, signUp, typeCode } from './helpers';

const MOCK = 'http://localhost:4010';

// Checkpoint projects (ADR-043): the end of unit 1 is a project. The unit's
// lessons are passed straight through the mock API (its grader passes a
// program that contains the expected output), then the project is done in
// the browser: its step-by-step brief, the run, and 30 XP.
test('a learner finishes a unit and builds its project', async ({
  page,
  request,
}) => {
  const email = await signUp(page, 'proj');
  await finishWelcome(page);

  const { access_token: token } = (await (
    await request.post(`${MOCK}/auth/v1/token`, { data: { email } })
  ).json()) as { access_token: string };
  const api = (path: string) =>
    request
      .get(`${MOCK}${path}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json() as Promise<unknown>);
  const course = (await api('/courses/python/path')) as CoursePath;
  for (const lesson of course.units[0].lessons.filter((l) => !l.project)) {
    const detail = (await api(`/lessons/${lesson.id}`)) as LessonDetail;
    await request.post(`${MOCK}/submissions`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        exerciseId: detail.exercise.id,
        code: detail.exercise.sampleTests
          .map((t) => `print("${t.expectedOutput.replaceAll('\n', '\\n')}")`)
          .join('\n'),
      },
    });
  }

  // The path: the project is open, and so is unit 2.
  await page.goto('/learn/python');
  const project = page.getByRole('link', { name: /Project: Samosa party/ });
  await expect(project).toBeVisible();
  await expect(page.getByText('Project · +30 XP')).toBeVisible();
  await expect(
    page
      .getByRole('link', { name: /Positive, negative or zero \(start here\)/ })
      .first(),
  ).toBeVisible();

  // The unit's Bug hunt opens with its lessons, project or not.
  await expect(
    page.getByRole('link', { name: /Bug hunt/ }).first(),
  ).toBeVisible();

  // The project: no cards, a brief in steps, then a run.
  await project.click();
  await expect(page.getByText('Your project · +30 XP')).toBeVisible();
  await expect(page.getByText(/Samosas come in packs of 6/)).toBeVisible();
  await expect(page.getByText(/3\. Print/)).toBeVisible();
  await typeCode(page, 'print("Samosas: 12\\nPacks: 2\\nSpare: 0")\n');
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Project complete!' }),
  ).toBeVisible();
  await expect(page.getByText('+30', { exact: true })).toBeVisible();
});
