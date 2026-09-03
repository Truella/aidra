# aidra — Build Plan

Companion to README.md (locked scope) and STRETCH.md (post-core additions).
This doc is the how, not the what/why — see README.md for those.

## Confirmed WebMCP API (from spec, verified against
webmachinelearning/webmcp README — not guessed)

```js
await document.modelContext.registerTool({
  name: "tool-name",
  description: "Natural language description for the agent.",
  inputSchema: {
    type: "object",
    properties: { /* JSON Schema */ },
    required: ["..."]
  },
  async execute(input, options) {
    // options.signal is an AbortSignal for cancellation
    // reuse existing client-side app logic, mutate UI directly
    return {
      content: [{ type: "text", text: "Human-readable result for the agent." }]
    };
  }
}, { signal: controller.signal }); // second arg optional, for unregistering later
```

Key facts that affect our build:
- Tools are exposed to the browser's built-in agent by default in the
  top-level document (no `exposedTo` needed for our single-page case).
- `execute` can be async and should return `{ content: [{ type: "text", text: "..." }] }`.
- A `toolchange` event exists if tools are added/removed dynamically — not
  needed for our fixed 5-tool set, but worth knowing exists.
- There is an official `webmcp-types` npm package with real TS types. We are
  not installing it (no build step), but we will **mirror its shapes by hand
  in JSDoc `@typedef` blocks** so we get equivalent editor-level type safety
  without a package install or bundler.

## Stack (locked)

- **HTML/CSS/JS**, no framework, no bundler, no build step
- **Tailwind** via CDN `<script src="https://cdn.tailwindcss.com"></script>`
- **JSDoc** `@typedef` blocks for type safety on tool schemas — checked via
  editor's TS language server (VS Code does this automatically for `.js`
  files with JSDoc, zero config needed)
- **Deploy:** Vercel (static site, zero config — just points at `index.html`)

## Folder structure

```
aidra/
├── index.html              # single page: layout, calendar widget, form, aria-live regions
├── css/
│   └── styles.css          # any custom CSS beyond Tailwind utilities (calendar drag styling)
├── js/
│   ├── types.js             # JSDoc @typedef definitions for all tool I/O shapes
│   ├── mock-data.js         # hardcoded provider (Dr. Chen), slots, patient form fields
│   ├── state.js              # small in-memory app state object + render functions
│   ├── calendar.js           # drag-based calendar grid widget logic (the "inaccessible" pattern)
│   ├── announcer.js           # aria-live helper: announce(message) function
│   ├── tools.js                # registerTool() calls for all 5 tools, wired to state.js
│   └── main.js                  # entry point: init state, render initial UI, call tools.js setup
├── README.md                 # (already created — locked scope)
├── STRETCH.md                 # (already created — stretch goals)
├── BUILD_PLAN.md               # (this file)
└── LICENSE                      # MIT — required by submission rules, must be visible in repo "About"
```

Why split this way: each file maps to one responsibility and one person's
mental model of "what am I touching right now" — useful when you're moving
fast solo and don't want to scroll one giant file at 3am.

## Types (`js/types.js`)

JSDoc typedefs mirroring the actual `inputSchema` / return shapes for each
tool, so every tool's `execute` function gets real autocomplete + type
checking in-editor without a build step.

```js
/**
 * @typedef {Object} Provider
 * @property {string} id
 * @property {string} name
 * @property {string} specialty
 */

/**
 * @typedef {Object} Slot
 * @property {string} id
 * @property {string} providerId
 * @property {string} day       // e.g. "Tuesday"
 * @property {string} time      // e.g. "09:00"
 * @property {"morning"|"afternoon"} timeRange
 */

/**
 * @typedef {Object} SearchProvidersInput
 * @property {string} name
 */

/**
 * @typedef {Object} ListAvailableSlotsInput
 * @property {string} providerId
 * @property {string} [day]
 * @property {"morning"|"afternoon"} [timeRange]
 */

/**
 * @typedef {Object} SelectSlotInput
 * @property {string} slotId
 */

/**
 * @typedef {Object} FillIntakeFormInput
 * @property {string} reason
 * @property {string} [notes]
 */

/**
 * @typedef {Object} ToolTextContent
 * @property {"text"} type
 * @property {string} text
 */

/**
 * @typedef {Object} ToolResult
 * @property {ToolTextContent[]} content
 */
```

Each function in `tools.js` gets a `@param {SelectSlotInput} input` /
`@returns {Promise<ToolResult>}` JSDoc comment referencing these — that's
the whole type-safety story, no install required.

## The 5 tools (`js/tools.js`) — schemas locked from README.md flow

1. **`search_providers`** — input: `{ name: string }` → returns matching
   provider object(s) from `mock-data.js`
2. **`list_available_slots`** — input: `{ providerId, day?, timeRange? }` →
   returns filtered array of `Slot`
3. **`select_slot`** — input: `{ slotId }` → mutates state, updates the
   drag-calendar UI to show selection, fires `announce("Tuesday 9:00 AM selected")`
4. **`fill_intake_form`** — input: `{ reason, notes? }` → populates form
   fields live in the DOM, fires `announce(...)`
5. **`submit_booking`** — input: none → **does not immediately complete**;
   instead surfaces the confirm/cancel UI gate and returns a `ToolResult`
   telling the agent booking is pending human confirmation. A separate
   internal function (not a registered tool) completes the booking once the
   human clicks Confirm.

This last point matters: the human-confirmation gate should NOT be
bypassable by the agent calling `submit_booking` again — the actual
completion is triggered by a real DOM click handler on the Confirm button,
not by another tool call. This is what makes the "human stays in control of
the outcome" claim literally true rather than just narrated.

### Accessibility engineering note: modal dismiss, focus loss & aria-live race

A subtle real-world bug in accessible web apps occurs when closing modals in conjunction with `aria-live` announcements:
- When `#confirm-modal` closes, the Confirm button (which holds active focus) disappears from the accessible view.
- Browsers drop focus to `<body>`, triggering verbose page-context narration that interrupts or completely drowns out the `aria-live` announcement.
- Solution: `#booking-status` is configured with `tabindex="-1"`. Upon confirming or cancelling, focus is programmatically shifted to `#booking-status` immediately after hiding the modal and calling `render()`, right before invoking `announce()`. This creates a predictable focus anchor and allows screen readers (e.g. NVDA, VoiceOver) to clearly narrate the booking confirmation.

## Implementation order (do in this sequence, don't skip ahead)

1. **`index.html` skeleton** — static layout only: header, provider search
   area (non-functional yet), calendar grid (visual only), form fields,
   aria-live region (`<div aria-live="polite" id="announcer" class="sr-only">`),
   confirm/cancel modal (hidden by default). Tailwind CDN included.
2. **`mock-data.js`** — hardcode Dr. Chen + ~6 slots across Mon-Wed,
   morning/afternoon, so `list_available_slots` has real filtering to do.
3. **`announcer.js`** — one function: `announce(message)` that writes to the
   `aria-live` div (with a brief clear-then-set to force re-announcement on
   repeated identical messages, a known ARIA gotcha).
4. **`calendar.js`** — build the drag-based grid widget. This is the
   "inaccessible" pattern being demoed — keep it visually convincing (click
   isn't enough, dragging a slot block onto a day cell is the interaction)
   but don't over-engineer it; it needs to *look* real, not be production-grade.
5. **`state.js`** — small object holding `{ selectedProvider, selectedSlot,
   intakeForm, bookingStatus }` + a `render()` function that syncs state to
   the DOM. Keep this dumb and centralized — every tool mutates state then
   calls `render()`.
6. **`types.js`** — write the JSDoc typedefs (can do this in parallel with
   step 5, they inform each other).
7. **`tools.js`** — register all 5 tools per the schema above, each
   `execute` calling into `state.js` functions + `announcer.js`.
8. **`main.js`** — wire everything together on page load: init state, initial
   render, call the tool registration setup, wire the Confirm/Cancel modal's
   real click handlers (the ONLY thing that completes a booking).
9. **Manual console test** — open dev tools, run
   `await document.modelContext.getTools()` to confirm all 5 are registered
   with correct schemas, then manually `executeTool()` each one in sequence
   to confirm state/UI/announcements all work before touching any real agent.
10. **Deploy to Vercel** — push to GitHub, connect repo, deploy (should be
    zero-config since it's static files).
11. **Run the full testing plan from README.md** — ChatGPT in-app browser
    test is the one that actually matters most; do this before declaring
    the core build "done."
12. **Only after step 11 passes fully** — move to STRETCH.md, in the order
    listed there.

## Time budget guide (loose, adjust as you go)

- Steps 1-6 (structure + data + widget): ~5-6 hrs
- Steps 7-8 (tools + wiring): ~4-5 hrs
- Step 9 (manual testing/debugging): ~2-3 hrs — budget generously, this is
  where WebMCP-specific surprises will show up
- Steps 10-11 (deploy + real agent test): ~2-3 hrs — also budget generously,
  first deploy + first real agent test are both places things commonly break
- Remaining time → STRETCH.md, then demo video + writeup

Video + writeup should start with enough buffer before the ~9pm WAT deadline
that a YouTube upload hiccup or a last submission form issue doesn't sink the
whole thing — treat "core build done and tested" as the goal for roughly the
halfway-to-two-thirds mark of your remaining time, not the finish line.
