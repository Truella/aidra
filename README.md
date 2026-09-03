# aidra

**WebMCP Challenge submission — Devpost**
Deadline: Sep 3, 2026 @ 1:00pm PDT / 9:00pm WAT

## One-line pitch

A booking app built with the exact UI patterns known to break screen readers and
motor-impaired navigation — where an AI agent completes the booking via WebMCP
tools instead of fighting the inaccessible widgets, while the page stays live
and narrated (via `aria-live`) so the user never loses oversight or control.

## The problem (verified, not invented)

- **Interactive elements such as menus, tabs, and dialogs that don't behave as
  expected** are the #2 most cited barrier for screen reader users, every year,
  per WebAIM's ongoing annual Screen Reader User Survey. CAPTCHA is #1.
- The average home page carried 56.1 accessibility errors in 2026, a 10.1%
  increase over the prior year (WebAIM, The WebAIM Million 2026) — the problem
  is compounding, not shrinking.
- "Screen reader user" is not synonymous with "blind" — 10% of regular screen
  reader users in WebAIM's 2024 survey use it for reasons other than a vision
  disability. Framing should stay broad: vision, motor, and cognitive access
  needs, not just blindness.
- Generic agent automation (DOM scraping / simulated clicks) **inherits the
  same barrier the human has** — if a widget can't be perceived or interacted
  with reliably, an agent guessing through the DOM fails the same way a screen
  reader does. WebMCP's typed, in-page tools sidestep this: the agent calls a
  named function instead of needing to perceive or manipulate the widget.

## Core feature (non-negotiable — do not cut)

1. The agent completes a task that **cannot be reliably done via clicking or
   scraping**, because the widget it replaces is a genuinely inaccessible
   pattern (drag-based calendar grid).
2. The user can **watch it happen live** via `aria-live` announcements as each
   tool executes — not just receive a final result. This is what makes it
   "better together" rather than "agent replaces human."
3. A **human confirmation gate** before the final, consequential action
   (submitting the booking) — the user stays in control of the outcome.

If time runs short, everything else in this doc is cuttable. These three are not.

## End-to-end user flow (demo script)

1. **Landing** — booking site is open, screen reader announces the page normally.
2. **User prompt to agent** — "Book me the earliest Tuesday morning appointment
   with Dr. Chen, and remind me to bring my insurance card."
3. **Agent calls tools in sequence**, each mutating the page live and firing an
   `aria-live` announcement:
   - `search_providers({ name: "Chen" })` → provider found, announced
   - `list_available_slots({ provider_id, day: "Tuesday", time_range: "morning" })` → slots returned
   - `select_slot({ slot_id })` → drag-calendar UI updates; announced ("Tuesday 9:00 AM selected")
   - `fill_intake_form({ reason, notes })` → form fields populate live on screen
   - `submit_booking()` → **blocked pending human confirmation**
4. **Human checkpoint** — UI presents "Agent wants to submit — Confirm / Cancel."
   User confirms via keyboard or voice.
5. **Result** — booking confirmed, reminder set. User never had to
   click/drag the calendar widget directly.

## Scope lock — build only this

- 1 page, 1 flow, 5 tools (listed above)
- 1 realistic inaccessible widget: **drag-based calendar grid** (more visually
  demoable than a custom combobox — pick one, not both)
- `aria-live` region wired to every tool call
- One human-confirmation gate before final submit
- Plain HTML/JS, styled with Tailwind (via CDN, no build step) — layout
  should be reasonably non-broken across common widths by default (Tailwind
  utilities make this close to free), but a dedicated mobile-responsive
  design pass is NOT in scope — see STRETCH.md
- Type safety via **JSDoc annotations in plain JS** (`@typedef` blocks for
  each tool's input/output schema) — no TypeScript build step. Reasoning:
  the WebMCP API is still Draft CG Report status with no official `@types`
  package, so a real TS setup would require hand-written ambient
  declarations anyway; JSDoc gives editor-level type checking with zero risk
  of a broken build blocking deployment
- Deploy to Vercel

**Explicitly cut from this build:** multi-provider support, auth/login,
payment, multiple booking types, a dedicated mobile-responsiveness design
pass, error-recovery flows beyond the one happy path.

## Testing plan

1. **Functional** — manually trigger each tool via browser console before
   wiring an actual agent; confirm state updates and ARIA announcements fire.
2. **Agent integration test** — open the deployed URL in ChatGPT's in-app
   browser (the spec's required test surface) and run the real prompt
   end-to-end.
3. **Chrome fallback test** — enable `chrome://flags/#enable-webmcp-testing`,
   repeat the same flow.
4. **Accessibility sanity check** — run VoiceOver/NVDA yourself during agent
   execution, confirm the announcements are actually narratable in practice.
5. **Regression pass** — confirm a human can still complete the booking
   manually without the agent (judges may check the non-agent path too).

## Submission checklist

- [ ] Live URL, tested in ChatGPT in-app browser AND Chrome w/ WebMCP flag
- [ ] Public GitHub repo, open-source license visible in repo "About" section
- [ ] Repo README includes a working `registerTool` code sample
- [ ] Text writeup (why WebMCP fits / better UX / what was impossible before /
      how implemented) — written **after** the build works, not before
- [ ] Demo video, <3 min, public YouTube, with audio — script around the
      5-step flow above; lead with the drag-calendar failure, then show the
      agent solving it
- [ ] Recording finished with buffer before ~6pm WAT on Sep 3 for
      upload/submission risk
