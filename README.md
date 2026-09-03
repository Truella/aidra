# aidra 🩺⚡

> **Accessible Healthcare Scheduling Powered by WebMCP (Web Model Context Protocol)**  
> *Bridging inaccessible web UI barriers for assistive technology users through typed in-browser agent tools, real-time `aria-live` narration, and deterministic human-in-the-loop confirmation.*

[![WebMCP Challenge](https://img.shields.io/badge/WebMCP-W3C%20Draft%20Standard-teal)](https://github.com/webmachinelearning/webmcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)](./LICENSE)
[![Zero Build Step](https://img.shields.io/badge/Stack-Vanilla%20JS%20%7C%20Tailwind-1F6F5C)](#tech-stack)

---

## 📌 Overview & Problem Statement

### The Problem
* **#2 Screen Reader Barrier**: Per WebAIM's annual Screen Reader User Survey, *interactive elements that don't behave as expected* (such as drag-and-drop calendars, nested canvas/div controls, and broken custom comboboxes) are the #2 most-cited accessibility barrier on the web (second only to CAPTCHAs).
* **Agent DOM Guessing Inherits the Barrier**: Traditional browser automation agents that rely on DOM scraping or simulated coordinate clicks face the exact same failure modes as screen reader users when encountering complex, custom drag-and-drop or inaccessible widgets.

### The Solution: `aidra`
`aidra` demonstrates how **WebMCP (Web Model Context Protocol)** transforms assistive web interaction:
1. **Direct Structured API**: Exposes high-level, typed in-page tools (`document.modelContext.registerTool`) that allow AI agents to navigate schedules, select slots, and prepare bookings directly in JavaScript state — bypassing inaccessible widgets completely.
2. **Co-Navigation with Live `aria-live` Narration**: Instead of acting as an opaque black box, every tool invocation immediately narrates its action to the user via ARIA live regions and visually highlights affected UI elements.
3. **Strict Human-in-the-Loop Gate**: Consequential actions (finalizing the appointment) **cannot be triggered by an agent tool call**. The agent stages the booking, and the user retains final approval via an accessible confirmation dialog.

---

## 🚀 Key Features

* 🗓️ **Inaccessible Calendar Widget Bypass**: Solves the drag-only scheduling pattern via `list_available_slots` and `select_slot`.
* 👨‍⚕️ **Multi-Provider Search & Filtering**: Query doctors by name or medical specialty (`Dr. Sarah Chen` - *Family Medicine*, `Dr. Marcus Vance` - *Cardiology*, `Dr. Elena Rostova` - *Neurology*).
* 🔄 **Lifecycle Management**: Built-in support for `reschedule_booking` and `cancel_booking` workflows.
* 📡 **Live Agent Activity Stream**: Real-time observability sidebar for sighted users and evaluators to inspect WebMCP tool executions, parameters, and timestamps.
* ♿ **Engineered Accessibility**:
  * Polite ARIA live regions (`#announcer`) with deduplication timers.
  * Explicit focus management preventing modal-close focus loss races (`tabindex="-1"` anchor on status readout).
  * High-contrast focus outlines and keyboard-navigable fallback paths.
* 🛡️ **Zero Build Step / Zero Dependencies**: Vanilla ES Modules and Tailwind CDN — 100% auditable and fast to deploy.

---

## 🛠️ WebMCP Tools Specification

`aidra` registers 7 typed WebMCP tools into the browser context:

| Tool Name | Parameters | Description |
|---|---|---|
| `search_providers` | `name: string` | Search available clinicians by full/partial name or specialty. |
| `list_available_slots` | `providerId: string, day?: string, timeRange?: "morning" \| "afternoon"` | Query and filter open appointment slots for a clinician. |
| `select_slot` | `slotId: string` | Select a specific appointment time slot and update the calendar. |
| `fill_intake_form` | `reason: string, notes?: string` | Populate visit reason and patient notes in the intake form. |
| `submit_booking` | `{}` | Requests booking submission and displays the human confirmation gate. |
| `reschedule_booking` | `slotId: string` | Reschedules an existing in-progress booking to a different time slot. |
| `cancel_booking` | `reason?: string` | Cancels and resets the current booking session. |

### Code Example: Registering a WebMCP Tool

```javascript
// js/tools.js
await document.modelContext.registerTool({
  name: "select_slot",
  description: "Select a specific appointment slot by its id.",
  inputSchema: {
    type: "object",
    properties: {
      slotId: { type: "string", description: "The slot id returned by list_available_slots." }
    },
    required: ["slotId"]
  },
  async execute({ slotId }) {
    logToolActivity("select_slot");
    const slot = SLOTS.find((s) => s.id === slotId);
    if (!slot) {
      return { content: [{ type: "text", text: `No slot found with id "${slotId}".` }] };
    }

    // Mutate app state and announce live to screen reader
    applySlotSelection(slot);

    return {
      content: [{ type: "text", text: `Selected ${slot.day} at ${slot.time}.` }]
    };
  }
});
```

---

## 📐 Architecture & Focus Management

```
┌────────────────────────────────────────────────────────┐
│                   Browser / DOM Layer                  │
├──────────────────────────┬─────────────────────────────┤
│   Human Interaction      │       WebMCP Agent          │
│   (Keyboard/Mouse/Voice) │  (ChatGPT / Chrome Flag)    │
└────────────┬─────────────┴──────────────┬──────────────┘
             │                            │
             ▼                            ▼
   ┌──────────────────────────────────────────────┐
   │         Shared State (js/state.js)           │
   │  { selectedProvider, selectedSlot, ... }     │
   └──────────────────────┬───────────────────────┘
                          │
         ┌────────────────┴────────────────┐
         ▼                                 ▼
┌──────────────────┐             ┌───────────────────┐
│ DOM / UI Render  │             │ ARIA Live Stream  │
│ (main.js / CSS)  │             │ (announcer.js)    │
└──────────────────┘             └───────────────────┘
```

### Critical Accessibility Engineering: Modal Focus & ARIA Race Prevention
When closing the confirmation modal, active focus inside the dialog disappears from the accessibility tree. Without intervention, browsers default focus back to `<body>`, triggering full page-context narration that drowns out the polite `aria-live` announcement.

**Fix Applied**:
1. `#booking-status` is configured with `tabindex="-1"`.
2. Upon modal dismiss (Confirm or Cancel), focus is programmatically shifted to `#booking-status` immediately before `announce()` is invoked, ensuring screen readers (NVDA, VoiceOver, JAWS) read the confirmation clearly without interruption.

---

## 💻 Tech Stack

* **Markup & Layout**: Semantic HTML5, Tailwind CSS (via CDN)
* **Logic & Protocol**: Vanilla JavaScript (ES Modules, WebMCP API)
* **Type Safety**: JSDoc `@typedef` definitions checked via TypeScript Language Server (zero compilation required)
* **Accessibility**: ARIA 1.2 Live Regions, WCAG 2.1 AA compliant contrast & keyboard focus

---

## 🏃 Getting Started & Local Testing

### Prerequisites
* Any modern web browser (Google Chrome, Edge, Safari, Firefox).
* For testing native WebMCP tool execution:
  * Open in **ChatGPT In-App Browser**, OR
  * Enable `chrome://flags/#enable-webmcp-testing` in Google Chrome (Desktop).

### Running Locally

```bash
# 1. Clone the repository
git clone https://github.com/truella/aidra.git
cd aidra

# 2. Serve with any static web server (no build step needed)
# Example using Python:
python3 -m http.server 8000

# Example using Node:
npx serve .
```

Visit `http://localhost:8000` in your browser.

---

## 🧪 Testing Guide

### 1. Manual Human Fallback Flow
1. Select a provider via the dropdown or keep default.
2. Drag any slot chip from the tray into a day cell.
3. Type a reason in **Reason for visit**.
4. Click **Book appointment** → Click **Confirm** in modal.
5. Verify status updates to *"Appointment booked."* and screen reader announces completion.

### 2. WebMCP Agent Flow (ChatGPT In-App Browser / Chrome Flag)
Prompt the agent:
> *"Book me the earliest Tuesday morning appointment with Dr. Sarah Chen, and add a note to remind me to bring my insurance card."*

**Expected Agent Sequence**:
1. `search_providers({ name: "Chen" })` → Provider found & announced.
2. `list_available_slots({ providerId: "p1", day: "Tuesday", timeRange: "morning" })` → Matches returned.
3. `select_slot({ slotId: "s3" })` → Calendar highlights Tuesday 09:00.
4. `fill_intake_form({ reason: "Annual checkup", notes: "Bring insurance card" })` → Form populates.
5. `submit_booking()` → Modal opens for human confirmation.

---

## 📄 License

This project is open-source and licensed under the [MIT License](./LICENSE).
