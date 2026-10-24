# Friend test (Gate 1)

How to put Loophole in front of real beginners and learn where they get stuck. Gate 1 (`docs/ROADMAP.md`) is done when **a friend on another network signs up and finishes a lesson**; this checklist turns that into something you can learn from.

## Who

- 3 to 5 people who have **never coded**, or tried once and gave up. Not developer friends: they will figure everything out and tell you nothing.
- At least one who would pick **Hinglish**, and at least one on a **phone**.

## Before

- [ ] The live site works: open <https://loophole-psi.vercel.app>, sign up with a new email, finish lesson 1. Delete nothing afterwards; it proves the path works today.
- [ ] `https://<api-domain>/health` says `{"status":"ok","piston":"ok"}`.
- [ ] Paste the link into a WhatsApp chat with yourself: the preview card with the loop logo should show (ADR-051).
- [ ] 20 to 30 minutes per person, a quiet place or a video call with screen sharing.

## During

Say only this, then stay quiet:

> "This is a website for learning to code. Please use it as if you found it yourself. Think out loud: say what you're looking at and what you expect. I can't help you, because I want to see where it's confusing. You can't do anything wrong; if something is hard, that's the app's fault."

Then give them these tasks one at a time. Don't explain the buttons.

1. **From the landing page, start learning.** (Do they understand what Loophole is? Do they find the button?)
2. **Pick a course and finish your first lesson.** (Learn cards, quick check, writing code, the finish screen.)
3. **Do the next lesson.** (Do they find their way back to the map?)
4. **Get stuck on purpose:** in the next exercise, ask them to submit something wrong first, then get help. (Do they find "Hint" and "Explain my error"? Does the hint help without giving the answer?)
5. **Try a duel against one of the crew.** (Duels page, picking Meera, the race.)
6. **Change your avatar.**

Write down, with the time:

| What to note                                              | Example                               |
| --------------------------------------------------------- | ------------------------------------- |
| Where they paused for 5 s or more                         | "stared at the quick check for 20 s"  |
| What they said they expected                              | "I thought Run would submit"          |
| Anything they tapped that did nothing, or the wrong thing | "tapped the book title, not the book" |
| Words they didn't understand                              | "XP?", "streak freeze?"               |
| When they smiled or said "oh nice"                        | "the confetti", "Priya said shabaash" |

## After (5 minutes, then stop)

Ask exactly these, and write the answers word for word:

1. "What is Loophole, in one sentence, to a friend?"
2. "What was the most confusing moment?"
3. "Would you come back tomorrow? Why or why not?"
4. "Would you send this to someone? Who?"

## Then

- [ ] Put every note in one list. Mark each **blocker** (they couldn't go on without you), **friction** (slowed down, but got through) or **delight**.
- [ ] Anything that blocked 2 or more people is the next slice. Give the list to your AI assistant with "fix the blockers from the friend test".
- [ ] When one person on another network signed up and finished a lesson without your help, tick Gate 1 in `docs/ROADMAP.md`.
