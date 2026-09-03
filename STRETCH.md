# Stretch goals — only after core scope in README.md is fully working and tested

Do not start any of these until the full end-to-end flow in README.md passes
all 5 testing steps, including the ChatGPT in-app browser test. Order below is
priority order — stop whenever time runs out, in order.

## 1. Second inaccessible widget: custom combobox provider search
Add a second genuinely-inaccessible pattern (ARIA-mislabeled autocomplete for
provider search) so the demo shows the agent solving two distinct widget
classes, not just the calendar. Reinforces "this generalizes" for judges.

## 2. Cancel / reschedule tool
`cancel_booking()` / `reschedule_booking()` — shows the agent handling a
second, different task in the same session, demonstrating the tool set isn't
a single scripted path.

## 3. Voice input capture on the page itself
Instead of the agent prompt happening "off-page" (e.g. typed into a chat
sidebar), wire an in-page mic button so the whole interaction — voice prompt
in, agent tool calls, aria-live narration out — happens within the site
itself. Strengthens the "lives in the page" WebMCP story.

## 4. Second booking type (e.g. pickup/errand scheduling)
Only if time allows — a second flow using the same tool pattern shows
reusability of the approach beyond one narrow use case.

## 5. Visual "agent activity" indicator
A subtle on-screen log/timeline of tool calls as they happen (separate from
aria-live, for sighted co-viewers / judges watching the demo video) — purely
a presentation polish item, not core to the accessibility story.

## 6. Real provider data / calendar variety
Replace the single mocked provider (Dr. Chen) with a small realistic dataset
of providers and time slots, so the search/filter tools look less like a
fixed demo path.

## 7. Error handling — no available slots / tool failure path
Show the agent handling a "no slots found, try next available day" case
gracefully, and surface that clearly via aria-live too.

## 8. Dedicated mobile-responsive design pass
Core build uses Tailwind and should be non-broken at common widths by
default, but a deliberate pass to optimize the layout specifically for
mobile/tablet is stretch-only — the judged demo happens in ChatGPT's in-app
browser and Chrome desktop, not on a phone.

## Explicitly out of scope even as stretch (do not attempt)
- Real authentication / user accounts
- Payment integration
- Multi-language support
- Actual production-grade accessibility audit (WCAG conformance testing) —
  the demo should be *convincing*, not formally certified, given the timeline
