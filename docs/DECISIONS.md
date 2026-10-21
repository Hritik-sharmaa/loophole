# Loophole — Decision Log

Every significant choice gets an entry: what was decided, why, and what was given up. Add new entries at the top. AI assistants must not reverse a decision here without the developer adding a new entry.

Format: **ADR-NNN · Title** — Status (Accepted / Superseded by ADR-NNN) · Date

---

**ADR-040 · Duels in JavaScript: pick a language, then duel** — Accepted · 2026-10-21

- Decision: a second duel pool, `content/duels/javascript/`: the 15 Python problems ported (slugs `js-<slug>`, same titles, levels and tests; one extra hidden test for `js-second-largest`). Input comes from `prompt()`, as in the JavaScript track (ADR-025), and where JavaScript has its own classic trap it is one of the bugs: numbers left as strings from `prompt()` (`+` joins text, comparisons go alphabetical), `sort()` without a compare function, `''.split(' ')` giving `['']`, `words.reverse` without `()`. Each was checked in Node with the `prompt()` helper: the solution passes every test; the buggy code passes at least one and fails at least one. The duels page opens with "Duel in: Python | JavaScript" (remembered in the browser; locked while queued). `queue:join` takes `{ language }` (no payload means Python, for older clients); the queue pairs only players who picked the same language, and `queue:joined.position` counts only that language's line. `POST /bot-duels` takes `language` too. `duel:start` and `BotDuel` problems carry `language`, which picks the editor's file name and highlighting, and the guide who hosts (Priya, Arjun). No migration: `duel_problems.language` already existed.
- Why: the developer asked for the language to be picked first, then the duel. JavaScript learners (20 lessons, ADR-025) had no duel in their language.
- Trade-off: two queues halve the chance of finding a live opponent while there are few learners; the crew bots (ADR-039) cover the wait. Ratings stay one Elo across languages, so a strong Python player starts JavaScript duels at the same rating. Bug of the day stays Python. Problems were checked locally in Node 24, not yet in Piston's Node 20.11.1 (they use nothing newer than `replaceAll`, Node 15).

**ADR-039 · Practice duels against a guide bot** — Accepted · 2026-10-21

- Decision: the duels page gets "Practice with the crew": race Meera (easy, about 4 minutes), Arjun (medium, about 3) or Harpreet (hard, about 2) on a random problem from the live duel pool. `POST /bot-duels` stores a `bot_duels` row (migration 0015) with the problem, a five-minute clock and the bot's schedule: when it passes each test, picked at the start (`botSchedule` in `modules/bot-duels/bot-duel-rules.ts`, unit-tested: it reads for 30% of its time, then passes one test per slot, finishing at its pace give or take 15 s). Submissions are graded like a live duel (Piston, sample and hidden tests). A full pass received before the bot's finish wins; once the bot's finish has passed, the next read marks the race lost, dated at the bot's finish. A pass received earlier beats a loss recorded while it was being graded. The result is set by a conditional update, once. Plain HTTP, so it works when the duel socket is down. Web: three crew cards under the lobby; `/duels/bot/[id]` reuses the duel room (Ink header with the bot's face, progress drawn from its schedule, countdown), and ends with the bot speaking the result and a Rematch button (a new problem).
- Why: from the ideas backlog: with few learners online, "Find a duel" often waits forever, so the app's main feature went unused. A bot gives the same race any time, and the crew are already the app's characters.
- Trade-off: no Elo and no XP, so a bot can't be farmed for rewards, and a win means only practice. The schedule reaches the browser to draw the bot's bar, so a curious learner can see when the bot will finish; harmless, since nothing is paid. The bot doesn't adapt to the learner's skill, and the pool is still Python only (15 problems), so problems repeat.

**ADR-038 · Weekly leagues with promotion and demotion** — Accepted · 2026-10-21

- Decision: four tiers, Bronze, Silver, Gold and Diamond. Each IST week (Monday 00:00 to Monday 00:00) learners are placed in groups of up to 20 per tier: `league_groups` (week, tier) and `league_members` (week, user, group; one row per user per week; migration 0014). A learner joins with their first XP of the week: `GamificationService` calls `LeaguesService.join` after a lesson or a Bug of the day pays XP. They go to the oldest group in their tier with room, or a new one. Standings are the XP each member earned that week (`xp_events`), then who joined first. The top quarter of a group (at most 5) moves up a tier and, in groups of 10 or more, the bottom quarter moves down; nobody moves up from Diamond or down from Bronze (`league-rules.ts`, pure and unit-tested). There is no weekly job: a learner's tier for the new week is worked out when they join, from where they finished in their last league week. `GET /leagues/current` returns the group ranked with each member's zone if the week ended now, plus how last week ended. The leaderboard opens on a new League tab (tier badge, time left, a banner for last week's move, promotion and demotion lines); "This week" and "Duel rating" stay.
- Why: from the ideas backlog: Duolingo's leagues are its strongest weekly hook, because a group of 20 gives everyone a race they can win, where the global weekly board only rewards the top few.
- Trade-off: no cron means nothing happens to a learner who earns no XP: they keep their last result and move when they next join, even weeks later (a missed week isn't a demotion). Results are recomputed from `xp_events` on each read, not stored, which costs a query per view but can't drift. Two learners joining at the same instant can push a group to 21. Groups fill in join order, not by skill, so early starters in a week meet each other. No reward beyond the tier yet.

**ADR-037 · The practice stop: a mixed review of finished lessons** — Accepted · 2026-10-21

- Decision: `GET /courses/:slug/practice` returns up to 8 items drawn from the lessons the user has finished in that course: each lesson's quick check and its spot-the-bug card. `pickPractice` (`modules/lessons/practice.ts`, unit-tested) samples without replacement, weighting each lesson by how long ago it was finished (oldest weighs the most, the newest still 1): a light spaced repetition with no new table. The course page shows "Practice what you've learned" once a lesson is done; `/learn/[slug]/practice` plays the items full screen with the quick check and spot-the-bug components and ends with "n of m right the first time". Every visit is a new mix. Ungraded, unrecorded, no XP.
- Why: from the ideas backlog: Duolingo puts practice on the path so old lessons come back before they're forgotten. Both question types already exist in every lesson (ADR-021, ADR-031), so practice needs no new content.
- Trade-off: no memory of what the learner got wrong, so weak spots aren't targeted yet; that would need storing answers. No XP, so practice doesn't move the daily goal (the same choice as the Bug hunt).

**ADR-036 · "Explain it differently" on Learn cards** — Accepted · 2026-10-21

- Decision: under each teaching card a quiet link, "Didn't get it? Explain it differently", calls `POST /ai/explain-card { lessonId, card }`. The server reads the card (title, body, example) from the lesson itself, checks the lesson is unlocked, and asks Gemini (`GeminiClient.explainCard`) to explain the same idea again in simpler words with an everyday comparison; the answer is cut to 120 words and shown as the guide's second bubble ("In other words"), with read aloud. It counts toward the same daily cap (20) and the 10-a-minute limit as Hint and Explain my error. Spot-the-bug cards are refused (404), since their code holds the answer.
- Why: from the ideas backlog: Coddy offers "Ask AI" on every lesson, and a beginner stuck on a card had no help until the exercise. Reusing the tutor keeps one AI path, one cap and one set of guards.
- Trade-off: costs Gemini quota per tap; the answer is not cached, so asking again on the same card makes a new request. Only the card's index travels from the browser, so a learner can't make the tutor explain arbitrary text.

**ADR-035 · Bug of the day: one buggy program a day, a daily board** — Accepted · 2026-10-20

- Decision: every IST day, everyone gets the same bug from the Python duel pool (`content/duels/python`), the problems taken in slug order, one a day, wrapping round (`dailyPick`, pure and unit-tested). `GET /bug-of-the-day` returns it (sample tests only) and, on the caller's first call of the day, starts their clock by inserting a `daily_bug_plays` row (`opened_at`, unique per user and day; migration 0013). `POST /bug-of-the-day/submissions` grades with the duel grading path (Piston, sample and hidden tests, hidden ones only as pass/fail); the first pass sets `solved_at` with a conditional update, and the time is `solved_at − opened_at`, both server times. The first solve pays 20 XP once per play (`xp_events` source `daily-bug`): it counts toward the weekly board and the daily goal, not the streak. `GET /bug-of-the-day/board` ranks today's solves by time (then who finished first, then name), top 10 plus the caller's place, and never starts a clock. FR-28's "bracket" is built as this daily board. Web: `/bug-of-the-day` (Priya hosts; running clock, countdown to the next bug, a finish card with time, place and XP), a Pink card on the signed-in home and a link on the duels page.
- Why: the next item in the ideas backlog and a PRD stretch goal (FR-28): one shared reason to open the app every day, and solo practice for the skill duels test, available even when nobody is online to duel. Reusing the duel pool and grading needs no new content or runner. 20 XP is two lessons' worth: a duel problem hides one to three bugs in a whole program, so it takes longer than a lesson, and it comes once a day.
- Trade-off: the clock starts when the page is opened, so a learner who opens it and walks away gets a slow time (the board is for fun, not ranking). The pool has 15 problems, so a bug repeats every 15 days, and adding a problem shifts the rotation from the next day on. Not counting toward the streak keeps FR-10 simple, but a learner may expect it to. Board ties use finish time, not a shared rank.

**ADR-034 · Playwright journeys against a mock backend** — Accepted · 2026-10-20

- Decision: `apps/web/e2e/*.e2e.ts` run the PRD journeys in Chromium (J-1 first lesson, also at phone size; J-2 stuck with explain and hint; J-3 first duel; J-4 coming back) against a production build of the web app. The build goes to its own folder (`NEXT_DIST_DIR=.next-e2e`, read in `next.config.ts`), with `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SUPABASE_URL` pointed at `e2e/mock-backend.mts`: one Node server (run with Node's own TypeScript support) for Supabase Auth, every REST route the web app calls and the `/duels` Socket.io namespace, typed with `@loophole/shared` and reading the real `content/`. State is per user and each test signs up its own, so tests run in parallel. CI runs them in a separate `e2e` job and uploads the HTML report on failure. `@playwright/test` and `socket.io` (for the mock) are web dev dependencies.
- Why: the real API needs Supabase Auth and Postgres, which CI doesn't have, and the API is already tested end to end on PGlite (`apps/api/test`). What was untested is the web app's flows: sign-up, the welcome, the Learn step, grading results, the tutor, the duel socket, the finish screen. A mock keeps those tests fast (about a minute and a half, mostly the build) and deterministic.
- Trade-off: nothing proves the web app and the real API agree beyond the shared types; a behaviour change on the server (not a shape change) is not caught here. The mock's grading is a stand-in (a program passes when it contains the expected output; a duel passes once the code changes), so these tests cover the web app, not grading. Every new route the web app calls needs a mock route too.

**ADR-033 · First-run welcome, a daily goal and a streak calendar** — Accepted · 2026-10-20

- Decision: `profiles.daily_goal` (smallint, 10, 20 or 30 XP: one, two or three lessons, shown as 5, 10 or 15 minutes; null until picked; migration 0012). `GET /me` adds `dailyGoal` and `todayXp` (XP since 00:00 IST); `PATCH /me` accepts `dailyGoal`. `GET /me/activity` returns XP per IST day for five weeks (Monday four weeks ago to today), bucketed from `xp_events`. In the web app, `/learn` sends anyone without a goal to `/welcome`: the crew says hello, the learner picks a first course, then a goal, then that course's guide greets them and opens their next lesson. The header shows a goal ring (`todayXp/goal`, Orange filling, Blue with a tick when met); the finish screen says how many lessons are left today; the profile has a five-week streak calendar and the goal picker.
- Why: from the ideas backlog: a new learner used to land on a list of courses with nothing asking them to commit. Duolingo's first minute (pick a goal, meet the character, start a lesson) and Coddy's streak calendar are what bring learners back daily.
- Trade-off: existing users also see the welcome once, since their goal starts null. The calendar judges every past day against today's goal, not the goal at that time (no goal history is stored). The goal is a nudge only: it pays nothing and doesn't affect the streak (FR-10 stays one lesson a day).

**ADR-032 · Read aloud with the browser's speech** — Accepted · 2026-10-20

- Decision: guide speech bubbles that teach (Learn cards, the quick check, spot-the-bug cards, the task) get a speaker button that reads the bubble aloud with the Web Speech API (`speechSynthesis`), preferring an Indian English (`en-IN`) voice, at 0.95 speed and a pitch per guide. Tap again to stop; changing card stops it. The button is hidden where speech isn't supported.
- Why: from the ideas backlog (ROADMAP "Ideas backlog"): Coddy offers audio on every lesson, and many beginners in India read English more slowly than they listen. The browser does it for free, with no server, key or cost.
- Trade-off: voices depend on the device (Windows has Microsoft Ravi and Heera for en-IN; some phones have none, so a default English voice reads it). Code in backticks is read as plain text, which can sound odd for symbols.

**ADR-031 · Spot-the-bug cards and a Bug hunt per unit** — Accepted · 2026-10-20

- Decision: a Learn card may carry `bug: { line, fix }`: short code with exactly one wrong line, which the learner taps (any course language; never run, so no input or output). It is checked in the browser and recorded nowhere, like the quick check. A wrong tap strikes the line; "Show me" reveals it; the fix then shows in the bottom bar. Every lesson (all 90) ends its cards with one: the first units came first, the other 67 lessons the same day. `GET /courses/:slug/units/:unitId/bug-hunt` returns a unit's bug cards; each unit with bugs gets a Bug hunt stop at its end of the path (Pink, like a duel; open once the unit's badge is earned) that replays them full screen and ends with how many were found on the first try. No XP. `CoursePath` units gain `bugs` (the hunt's length); cheat sheets leave bug cards out.
- Why: the developer wanted more on the Learn step. Reading only is passive (Coddy reviewers asked for more practice); finding bugs is Loophole's own skill, the one duels test, so each lesson now trains it, and the unit review mirrors Duolingo's practice at the end of a unit.
- Trade-off: answers reach the browser, so a determined learner can read them; acceptable because nothing is paid or ranked. Bug hunts are open to anyone who finished the unit, but nothing on the server enforces that order (it doesn't need to: no rewards).

**ADR-030 · Course page: unit badges, cheat sheets and a certificate stop** — Accepted · 2026-10-20

- Decision: each unit earns a badge when all its lessons are done (computed in the browser from the path's lesson states; no new table). The course header shows "Badges n/m"; each unit header shows its badge and a Cheat sheet button. `GET /courses/:slug/units/:unitId/cheatsheet` returns that unit's Learn cards (title, body, example code) lesson by lesson, with no quick checks, outputs or exercises; it is open for locked units too, like a guidebook. `GET /courses/:slug/path` gains `certificateSlug` (the user's certificate for the course, or null), and the path ends with a certificate stop that links to it once earned.
- Why: Codédex's course page gives learners goals beyond the next lesson (chapter badges, cheat sheets, the certificate as the last stop), and Duolingo has a guidebook per unit. The developer asked for "more on the learn thing".
- Trade-off: learners can read a locked unit's cards before reaching it; the cards teach and hold nothing graded, so nothing secret leaks (hard rule 2 still holds). Badges are not stored, so they can't be shown elsewhere (profile, leaderboard) without recomputing them.

**ADR-029 · Full-screen lessons and a finish screen** — Accepted · 2026-10-20 · Amends ADR-021

- Decision: the lesson page drops the app menu. Its only header is ✕ (back to the path), the course logo, one progress bar (one notch per Learn card, one for the quick check, one for practice) and "Skip to practice". Learn cards and the quick check put Continue in a bar fixed to the screen's foot; the quick check's verdict colours that bar (Blue-tint right, Surface wrong). The Learn / Check / Practice tabs are gone; practice links back to the cards. A passing submission opens a finish screen: the guide cheering, XP counting up, the streak, Continue and "Back to my code"; confetti only when XP was paid.
- Why: the developer found the Learn step cluttered. Duolingo's lessons show one idea per screen, keep Continue in one place and end with a reward moment; ours stacked a header, tabs, a carousel card, an editor and a console in one view.
- Trade-off: no menu during a lesson, so moving elsewhere means leaving it (✕). The finish screen replaces the inline "Lesson complete" banner, which stays only as a short reminder after "Back to my code".

**ADR-028 · The crew: four Indian guides, one per course; Byte becomes the logo** — Accepted · 2026-10-20 · Amends ADR-020

- Decision: the characters are four young Indian learners drawn flat in a Duolingo-like cartoon style (no outlines, big eyes, the mood shown by face and pose): Priya teaches Python, Arjun JavaScript, Meera HTML & CSS, Harpreet Git & GitHub (`components/guide.tsx`, picked by course language). The course's guide teaches the Learn cards, asks the quick check, reads out the task, voices the AI tutor ("Stuck? Ask Priya") and cheers on the finish screen with their own cheer. Pages without a course use Priya or all four (`CrewLineup`). Byte stays only as the logo mark and app icon. Each course card says who teaches it.
- Why: Byte was too close to Coddy's robot mascot Bit (whose head is Coddy's logo) and Codédex's computer-faced hero. The developer rejected an animal mascot, asked for people, then for a Duolingo-style look, then for Indian characters, and approved the result on a comparison board.
- Trade-off: the characters break "everything is a sticker" (DESIGN_SYSTEM §1 rule 3) and the old "Not Duolingo" rule 4 is rewritten. Four characters are four times the drawing to keep consistent; their colours follow their course's brand colours (ADR-027).

**ADR-027 · Language logos and a banner per course; new tagline** — Accepted · 2026-10-20

- Decision: every course shows its language's real logo (Python, JavaScript, HTML5, Git) in the logo's own colours, from Simple Icons 13.21.0 path data (CC0), drawn inline by `components/language-logo.tsx`. Each course also gets a hand-drawn SVG banner (`components/course-banner.tsx`): a tint of the language's colour, a dotted track, four code stickers and the logo on a big Paper sticker. Banners top the catalog cards and the course path header; logos sit on the continue card, the lesson page's way back and the landing hero. The tagline "Learn to code, one bug at a time" becomes "Learn to code. Then out-code your friends." everywhere (hero, footer, page title, PWA manifest, README).
- Why: the developer found the redesign still missing something after comparing Codédex (a "land" with its own art per course) and Coddy (a logo per language). Text marks like `py` did not tell beginners which course was which at a glance. The old tagline was about bugs only; Loophole is lessons first, then duels.
- Trade-off: logo and banner colours are the one exception to "one colour, one meaning" (DESIGN_SYSTEM §1); they appear only inside logos and banners, never on buttons, text or state. The logos are their owners' trademarks, used only to name the language.

**ADR-026 · Git & GitHub track: a simulated terminal and repository** — Accepted · 2026-10-20

- Decision: a course with `language: "git"` has git exercises. A pure, deterministic simulator in the API (`modules/git/git-sim.ts`) models a home folder with one level of folders, files, and per-folder repositories (index, commits, branches, merges, remotes) plus a pretend GitHub, and prints output modelled on real git. Each exercise stores a hidden `setup` (commands, including setup-only `@github` and `@config-reset`) and checks on the final state, in `exercises.git_scenario`. The browser's terminal sends every command typed so far to `POST /git/run` (stateless replay, 60/min); "Check my work" submits them through `POST /submissions`, graded by `gradeGit()`, with `kind: "check"` results. The first course has 15 lessons in 3 units (first repository, branches, GitHub).
- Why: the last agreed track (ADR-023). Real `git` in Piston would need a shell runtime, network-free remotes and a way to inspect repository state; a simulator is safe, instant, needs no new infrastructure, and makes GitHub (push, pull, clone) possible without a network.
- Trade-off: it is not real git: only the commands and flags listed in CONTENT_GUIDE work, merge conflicts are refused rather than simulated, and there is no `diff`, `stash`, `rebase` or `reset`. The simulator is about 1,100 lines that must be kept honest; 40 unit tests compare its behaviour and messages with real git. Every keystroke-Enter replays the whole session (cheap: pure computation, at most 200 commands).

**ADR-025 · JavaScript track: Node in Piston, with prompt() for input** — Accepted · 2026-10-20

- Decision: a course with `language: "javascript"` runs in Piston's Node 20.11.1 (package `node`, installed by `infra/install-runtimes.sh`) and is graded like Python: stdin in, trimmed stdout compared. `withProgramHelpers()` (`src/common/program-helpers.ts`) appends a `prompt()` function after the learner's code before every Piston run (submissions, duels, `/runs`): it returns the next stdin line, or `null` at the end, like the browser's `prompt()`. It is a hoisted function declaration placed last, so it works from line 1 and error line numbers stay correct. The first course has 20 lessons in 5 units, with Learn steps, all checked in Piston. The web editor picks highlighting and file names (`main.js`) from the lesson's course language, now part of `GET /lessons/:id`.
- Why: the agreed order after HTML & CSS (ADR-023). Raw Node needs `require('fs').readFileSync(0, …)` to read input, which a beginner can't be expected to write; `prompt()` is real browser JavaScript, so the habit carries over to the web.
- Trade-off: the course teaches core JavaScript only; the DOM needs a browser and is left for later. A learner who declares their own `prompt` gets a redeclaration error. On Docker Desktop, Node sometimes takes more than 3 s of wall clock to start (status `TO` with ~250 ms of CPU), which grades as a time-out; the run limit stays at 3 s (NFR-04) until Node is re-tested on the VPS, as Python was for ADR-018.
- Also fixed: `install-runtimes.sh` checked installed runtimes by package name, but the `node` package's runtime is called `javascript`, so a second run would have tried to reinstall it and failed. It now checks Piston's package list.

**ADR-024 · HTML & CSS track: pages checked by rules on the server** — Accepted · 2026-10-20

- Decision: a course with `language: "html"` has web exercises. The learner edits one page with a live preview (an `<iframe sandbox="">` with `srcDoc`, so nothing in it can run scripts or reach the app). On submit, the API parses the page with `htmlparser2`, matches elements with `css-select` (selectors parsed with `css-what`), reads `<style>` blocks with `postcss`, and checks it against the exercise's rules (`element`, `attribute`, `style`) in `modules/submissions/web-checks.ts`. Results reuse the submission shape (`kind: "check"`), so XP, streaks, progress and certificates are unchanged. All checks are visible. `exercises.checks` stores them; `exerciseKind()` picks the grader from the course language. `POST /runs` refuses web lessons. The first course has 15 lessons in 3 units.
- Why: HTML and CSS print nothing for stdout grading. Of the options offered (parse on the server, render in headless Chromium, check in the browser), the developer left the choice to the AI; parsing is fast, runs no learner code, and keeps grading on the server (hard rule 1).
- Trade-off: CSS is checked as declared, not computed: no inheritance, browser defaults or layout ("is it centred on screen?" can't be checked), so prompts must name the element and property. Adds six small dependencies to the API (`htmlparser2`, `css-select`, `css-what`, `domutils`, `domhandler`, `postcss`) and `@codemirror/lang-html` to the web app.

**ADR-023 · More than one track: the course catalog** — Accepted · 2026-10-20 · Amends PRD §3

- Decision: lift the v1 non-goal "more than one language track". `/learn` becomes a course catalog: a "continue where you left off" card for the latest started course, then every course with the user's progress, then the agreed upcoming tracks (HTML & CSS, JavaScript, Git & GitHub) as "Coming soon" cards hard-coded in the web app. Each course's path moves to `/learn/[slug]`. `GET /courses` returns per-user counts (`lessonCount`, `completedCount`, `lastActivityAt`), ordered by `orderCourses()` (unit-tested). `courses.description` comes from `course.json`. `GET /lessons/:id` names its course so the lesson page links back to the right path.
- Why: the developer wants a Frontend Developer path and Git & GitHub after Python, and the old `/learn` always opened the first course.
- Trade-off: one extra click from `/learn` to a path. The "Coming soon" list lives in the web app (`app/learn/page.tsx`) and must be trimmed as each course is seeded. Duels stay Python-only for now.

**ADR-022 · Installable PWA, no new dependencies** — Accepted · 2026-10-19

- Decision: Loophole is a Progressive Web App: `app/manifest.ts`, PNG icons in `public/icons/` and `app/apple-icon.png` (rendered from Byte's SVG), and a hand-written `public/sw.js` registered in production only. The service worker caches Next's hashed `/_next/static/` files on first use, serves pages network-first with the last copy (or `/offline`) as fallback, and never touches the API or Supabase (other origins). `next.config.ts` serves `sw.js` uncached with a strict CSP. On phones, signed-in navigation moves to a bottom tab bar.
- Why: the developer wants students to install it on their phones. Grading, XP and auth need the server anyway, so a full offline mode (e.g. Serwist) would add a dependency for little gain.
- Trade-off: offline, the app only shows pages already visited (without data) or the offline page. No push notifications yet; they would need VAPID keys and a subscription table.

**ADR-021 · Teach before test: the Learn step and `POST /runs`** — Accepted · 2026-10-19

- Decision: every lesson opens with a Learn step (2–4 cards with runnable examples) and one multiple-choice quick check, then the graded exercise. The content lives in each lesson file's `learn` block and the nullable `lessons.learn` jsonb column. Examples run through a new `POST /runs` route (RunsModule): ungraded, nothing stored, throttled at 10/min, unlocked lessons only, language taken from the course. The quick check's answer is sent with the lesson and checked in the browser.
- Why: lesson 1 used to open straight onto the editor, so only people who already knew Python could pass. The developer wants complete beginners to be able to learn on Loophole.
- Trade-off: sending the check's answer looks like trusting the client (hard rule 1), but the check pays nothing and records nothing; only the exercise is graded. `/runs` adds Piston load, kept in check by its throttle and the shared queue (ADR-018). Content takes longer to write: every example must be run through Piston before committing.

**ADR-020 · "Sticker Lab" visual identity and Byte the mascot** — Accepted · 2026-10-19 · Supersedes ADR-005

- Decision: replace black/white/orange with "Sticker Lab": Ink #1B1433 outlines and hard shadows on a dotted lilac canvas, Orange for your move, Blue for done, Lemon for rewards and labels, Pink for rivals. Bricolage Grotesque, DM Sans and JetBrains Mono replace Baloo 2 and Nunito. The mascot is Byte, a robot with a terminal face; the logo is Byte's head plus the wordmark. Spec in `docs/DESIGN_SYSTEM.md`.
- Why: the developer felt the old look was dull and too close to Duolingo. Picked from three directions (Night Shift, Sticker Lab, Blueprint) and three mascots (Loopy, Glitch, Byte) on 2026-10-19.
- Trade-off: four accent colours instead of one, so each needs a fixed meaning (DESIGN_SYSTEM §1) to stay readable. Every page was restyled at once rather than one at a time.

**ADR-019 · Streak freeze rules** — Accepted · 2026-10-19

- Decision: a freeze is earned on every 7th day of a streak (7, 14, 21, …), at most 2 in hand. When the next new lesson comes after missed days, each missed day spends one freeze and the streak continues. If there are fewer freezes than missed days, the streak restarts at 1 and the freezes are kept. The streak shown stays alive while the freezes in hand cover every missed day so far.
- Why: FR-10 and ADR-012 fix the earn rate and the cap but not what happens when freezes cannot cover a gap; keeping them is the kinder reading and keeps the rule simple to explain.
- Trade-off: a user can lose a long streak while still holding freezes (e.g. one freeze, two missed days). Freezes are spent only when a lesson is completed, not at midnight, so no background job is needed.

**ADR-018 · Piston runs one job at a time** — Accepted · 2026-10-18

- Decision: `PistonClient` queues every run, so Piston never receives two jobs at once, across all users. A submission runs its tests one after another and skips the rest after the first time-out.
- Why: the local Piston image (Docker Desktop) crashes its sandbox when jobs overlap ("Sandbox keeper received fatal signal 6"). In testing, about half of parallel runs failed, even at two at a time; every sequential run passed. A crashed sandbox looked like a wrong answer to the learner.
- Trade-off: a run takes about 0.6 s locally, so an 8-test exercise takes about 5 s, over NFR-09 (3 s). Concurrent submissions wait for each other. The queue lives in one `PistonClient` instance, so the API must have exactly one (a shared module once duels use it). Re-test parallel runs on the VPS in S6 and raise the limit if they are stable.
- Re-test 2026-10-18 on the AWS VPS (t3.small, Ubuntu 24.04): sequential 40/40 and parallel 40/40 passed, about 50 ms per run. The crashes are specific to Docker Desktop. Kept at one at a time anyway: an 8-test exercise grades in about 0.4 s on the VPS, well inside NFR-09, and the limit still protects local development. Raise it only if many users grade at the same moment.

**ADR-017 · PGlite for API database tests** — Accepted · 2026-10-17

- Decision: API tests that need a database use `@electric-sql/pglite` (pinned dev dependency): real Postgres compiled to WebAssembly, running inside the test process. `test/support/test-db.ts` applies the real migrations and stubs Supabase's `auth.users`. e2e tests run in CI with no services.
- Why: the unlock rules and "hidden tests never leak" depend on real SQL; fakes would not catch a wrong query. PGlite needs no Docker, no Supabase project and no CI setup.
- Trade-off: PGlite is not Supabase: the `auth` schema and Supabase extensions are absent, and RLS policies are not exercised (the API connects as owner anyway). A staging check against Supabase still happens at deploy (S6).

**ADR-016 · MVP-first slice roadmap and lighter review** — Accepted · 2026-10-17 · Amends ADR-014

- Decision: the roadmap becomes vertical slices (S1–S8), each ending in a feature usable in the browser; M1 "Domain and fakes" is removed and deployment moves before duels. One reviewable piece is one feature slice (backend route + the page that uses it), not one file; explanations are short, with no quiz or Excalidraw step required.
- Why: one-file-at-a-time review and scaffolding-only milestones made progress too slow to finish the project.
- Trade-off: bigger pieces mean less depth per file in review; polish, hardening and scalability work move to Phase 3.

**ADR-015 · Plain NestJS layering for v1** — Accepted · 2026-10-17

- Decision: controllers → services → `DbService` (Drizzle), `PistonClient`, `GeminiClient`. No domain interfaces, Symbol DI tokens, repository classes, hand-written fakes, domain events or typed domain errors. Services query Drizzle directly, call each other directly, and throw Nest's built-in HTTP exceptions with the codes in `API_SPEC.md`. Only the two client files touch Piston and Gemini. Tests cover only logic that is easy to get wrong (grading, streaks, ELO, duel winner, hidden-test leaks).
- Why: the extra layers doubled the files per feature before anything worked. The goal now is a working app first; scalability later.
- Trade-off: swapping a vendor or the ORM touches services, not just a module binding; fewer tests means less safety on refactors. Interfaces, events and Redis can be reintroduced in Phase 3 if needed.
- Changes the layering in `ARCHITECTURE.md` §2, `AGENTS.md` hard rules 4–6, `CODING_STANDARDS.md` §3 and §5, and `AI_TUTOR.md` §2.

**ADR-014 · AI writes the code; developer reviews** — Accepted · 2026-10-11 · Supersedes ADR-001 · Piece size amended by ADR-016

- Decision: AI assistants write the code in small, verified pieces and explain each one; the developer reviews, asks questions, makes changes, and approves before anything is committed. Design decisions stay with the developer: the AI presents options and trade-offs, the developer picks.
- Why: writing every file from scratch, including setup and boilerplate, was slowing progress more than it was teaching. Reviewing working code with explanations keeps the learning goal (G-3) while moving faster.
- Trade-off: reading code teaches less than writing it, so review must be active: the developer follows each request through the code, answers the check questions, and rewrites parts when something is unclear.

**ADR-013 · Tooling: Vitest everywhere, ESLint, Node 24 LTS, Tailwind v4** — Accepted · 2026-10-11

- Decision: Vitest for all unit and integration tests in both apps (Jest is dropped; Playwright stays for e2e). ESLint for linting both apps, replacing the oxlint the API currently uses. Node.js 24 LTS. Tailwind CSS v4, with design tokens defined in CSS through `@theme` instead of `tailwind.config.ts`.
- Why: Vitest already runs in the API and handles its ES-module setup (`"type": "module"`, `.js` import paths) with no extra config, while Jest needs a transformer and module mapping for the same setup; one test runner across the repo means one API to learn. ESLint matches the web app, so there is one linter and one config style everywhere, and it has the larger rule and plugin ecosystem. Node 24 is the current LTS and the installed version; 22 is in maintenance. Tailwind v4 is the version installed with Next.js, and v4 moves configuration into CSS.
- Trade-off: most NestJS docs and tutorials show Jest, so their test snippets need translating (`jest.fn()` → `vi.fn()`, `jest.mock` → `vi.mock`). ESLint is slower than oxlint. Node 26 becomes the next LTS later and will need another bump. Tailwind v3 tutorials and `tailwind.config.ts` examples no longer apply directly.
- Updates the Jest, Node 22 and `tailwind.config.ts` references in `AGENTS.md`, `CODING_STANDARDS.md`, `ROADMAP.md`, `AI_TUTOR.md` and `DESIGN_SYSTEM.md`.

**ADR-012 · Default numeric rules for gamification and duels** — Accepted · 2026-10-02

- Decision: 10 XP per lesson; one streak freeze earned per 7-day streak, max 2; weekly board resets Monday 00:00 IST; duels last 5 minutes; ELO K = 32, start 1200; disconnect forfeit after 30 s.
- Why: sensible starting values so implementation is not blocked. Tune after real play.

**ADR-011 · Exact-match grading on trimmed stdout** — Accepted · 2026-10-02

- Decision: a test passes when trimmed stdout equals trimmed expected output.
- Why: "contains" lets wrong programs pass (printing extra values). Exact match is predictable for beginners if prompts state the output format.

**ADR-010 · In-memory matchmaking queue for v1** — Accepted · 2026-10-02

- Decision: the queue lives in API memory, not Postgres or Redis.
- Why: one API instance, under 100 users; a restart only drops people waiting.
- Trade-off: must move to Redis before running more than one API instance.

**ADR-009 · Socket.io through NestJS for duels** — Accepted · 2026-10-02

- Decision: duel events use NestJS WebSocket gateways with Socket.io. Supersedes the draft idea of Supabase Realtime.
- Why: the server must grade and decide the winner before anything is broadcast; a gateway keeps that authority in one place.

**ADR-008 · Gemini for the AI tutor** — Accepted · 2026-10-02

- Decision: Google Gemini via `@google/genai`, model name from env (default `gemini-flash-latest`), behind `IAiTutor` (changed by ADR-015: behind the plain `GeminiClient` class).
- Why: developer's choice of provider; free tier for development; keeping the SDK in one class keeps a later switch to another provider small.

**ADR-007 · API and Piston on one VPS** — Accepted · 2026-10-02

- Decision: Docker Compose on a single VPS runs the API, Piston and Caddy; the web app is on Vercel.
- Why: Piston needs a privileged container, which managed platforms like Railway, Render and Fly do not offer; WebSockets also need a long-running process.

**ADR-006 · Self-hosted Piston** — Accepted · 2026-10-02

- Decision: run Piston ourselves rather than the public endpoint.
- Why: the public Piston API now requires approval from its maintainer; self-hosting gives control over limits and languages.

**ADR-005 · Black, white and orange visual identity** — Superseded by ADR-020 · 2026-10-02

- Decision: Ink #171717, Paper #FFFFFF, Orange #FF6A00 as the only accent; Baloo 2 and Nunito.
- Why: keeps the Duolingo-style feel while being clearly its own brand; three colours map to three states.

**ADR-004 · Drizzle ORM over the Supabase JS client for data access** — Accepted · 2026-10-02

- Decision: repositories use Drizzle against Supabase Postgres; the Supabase client is used only for auth. (ADR-015: no repository classes; services use Drizzle through `DbService`.)
- Why: typed queries and migrations in code; keeps the database vendor behind repositories.

**ADR-003 · NestJS for the backend** — Accepted · 2026-10-02

- Decision: NestJS rather than plain Express or Next.js API routes.
- Why: its modules, DI container, guards and gateways enforce the layered design the developer wants to learn.

**ADR-002 · Live debugging duels as the differentiator** — Accepted · 2026-10-02

- Decision: build 1v1 real-time duels on buggy programs, not more languages or features Coddy already has.
- Why: a different engagement loop that solo-lesson platforms do not offer; a strong system-design exercise.

**ADR-001 · Developer writes the code; AI tutors** — Superseded by ADR-014 · 2026-10-02

- Decision: AI assistants default to explaining and reviewing; they write full code only in "build mode".
- Why: the project's purpose includes learning HLD and LLD by building.
