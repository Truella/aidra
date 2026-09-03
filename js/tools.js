// @ts-check
import './types.js';
import { PROVIDERS, SLOTS } from './mock-data.js';
import { state, selectProvider, fillIntakeForm, markPendingConfirmation, render } from './state.js';
import { applySlotSelection, renderCalendar } from './calendar.js';
import { announce, logToolActivity, clearToolActivity, waitForAnnouncements } from './announcer.js';

// Map of registered tools for direct execution or simulation harnesses
const toolRegistry = new Map();

// Fallback polyfill for testing in browsers where window.document.modelContext is not yet enabled.
// If native document.modelContext exists (e.g. Chrome with WebMCP flag or ChatGPT browser), it uses that directly.
if (!('modelContext' in document)) {
  // @ts-ignore
  document.modelContext = {
    async registerTool(toolSpec) {
      toolRegistry.set(toolSpec.name, toolSpec);
      return toolSpec;
    },
    async getTools() {
      return Array.from(toolRegistry.values());
    },
    async executeTool(toolOrName, input) {
      const tool = typeof toolOrName === 'string' ? toolRegistry.get(toolOrName) : toolOrName;
      if (!tool) throw new Error(`Tool not found.`);
      return await tool.execute(input);
    }
  };
}

/**
 * Register all WebMCP tools. Called once from main.js on page load.
 * IMPORTANT: submit_booking does NOT complete the booking itself — it only
 * surfaces the confirm/cancel modal. The actual completion happens only via
 * a real click on the Confirm button (see main.js), so the human is
 * literally, not just narratively, in control of the final step.
 */
export async function registerTools() {
  const t1 = await document.modelContext.registerTool({
    name: 'search_providers',
    description: "Search the clinic's providers by name.",
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Full or partial provider name to search for.' },
      },
      required: ['name'],
    },
    /**
     * @param {import('./types.js').SearchProvidersInput} input
     * @returns {Promise<import('./types.js').ToolResult>}
     */
    async execute(rawInput) {
      logToolActivity('search_providers');
      const { name } = parseInput(rawInput);
      const match = PROVIDERS.find((p) =>
        p.name.toLowerCase().includes((name || '').toLowerCase()) ||
        p.specialty.toLowerCase().includes((name || '').toLowerCase())
      );

      if (!match) {
        return { content: [{ type: 'text', text: `No provider found matching "${name}".` }] };
      }

      selectProvider(match);
      const providerSlots = SLOTS.filter((s) => s.providerId === match.id);
      renderCalendar(providerSlots);
      render({ highlight: 'provider' });
      announce(`Provider found: ${match.name}, ${match.specialty}.`);

      return {
        content: [
          {
            type: 'text',
            text: `Found ${match.name} (${match.specialty}), id: ${match.id}.`,
          },
        ],
      };
    },
  });

  await document.modelContext.registerTool({
    name: 'list_providers',
    description: "List all available providers in the clinic.",
    inputSchema: {
      type: 'object',
      properties: {},
    },
    /**
     * @returns {Promise<import('./types.js').ToolResult>}
     */
    async execute() {
      logToolActivity('list_providers');
      
      const summary = PROVIDERS.map(p => `${p.name} (${p.specialty}), id: ${p.id}`).join('\n');
      announce(`Listed ${PROVIDERS.length} providers.`);
      
      return {
        content: [
          {
            type: 'text',
            text: `Available providers:\n${summary}`,
          },
        ],
      };
    },
  });

  await document.modelContext.registerTool({
    name: 'list_available_slots',
    description: "List a provider's available appointment slots, optionally filtered by day and time of day.",
    inputSchema: {
      type: 'object',
      properties: {
        providerId: { type: 'string', description: 'The provider id returned by search_providers.' },
        day: { type: 'string', description: 'Optional day to filter by, e.g. "Tuesday".' },
        timeRange: { type: 'string', enum: ['morning', 'afternoon'], description: 'Optional time of day to filter by.' },
      },
      required: ['providerId'],
    },
    /**
     * @param {import('./types.js').ListAvailableSlotsInput} input
     * @returns {Promise<import('./types.js').ToolResult>}
     */
    async execute(rawInput) {
      logToolActivity('list_available_slots');
      const { providerId, day, timeRange } = parseInput(rawInput);
      const matches = SLOTS.filter((s) => {
        if (s.providerId !== providerId) return false;
        if (day && s.day.toLowerCase() !== day.toLowerCase()) return false;
        if (timeRange && s.timeRange !== timeRange) return false;
        return true;
      });

      announce(matches.length > 0
        ? `${matches.length} available time${matches.length === 1 ? '' : 's'} found${day ? ` on ${day}` : ''}.`
        : `No available times found${day ? ` on ${day}` : ''}.`
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              matches.map((s) => ({ slotId: s.id, day: s.day, time: s.time, timeRange: s.timeRange }))
            ),
          },
        ],
      };
    },
  });

  await document.modelContext.registerTool({
    name: 'select_slot',
    description: 'Select a specific appointment slot by its id.',
    inputSchema: {
      type: 'object',
      properties: {
        slotId: { type: 'string', description: 'The slot id returned by list_available_slots.' },
      },
      required: ['slotId'],
    },
    /**
     * @param {import('./types.js').SelectSlotInput} input
     * @returns {Promise<import('./types.js').ToolResult>}
     */
    async execute(rawInput) {
      logToolActivity('select_slot');
      const { slotId } = parseInput(rawInput);
      const slot = SLOTS.find((s) => s.id === slotId);
      if (!slot) {
        return { content: [{ type: 'text', text: `No slot found with id "${slotId}".` }] };
      }

      applySlotSelection(slot);

      return { content: [{ type: 'text', text: `Selected ${slot.day} at ${slot.time}.` }] };
    },
  });

  await document.modelContext.registerTool({
    name: 'reschedule_booking',
    description: 'Reschedule an existing booking to a new time slot by its slotId.',
    inputSchema: {
      type: 'object',
      properties: {
        slotId: { type: 'string', description: 'The new slot id to reschedule to.' },
      },
      required: ['slotId'],
    },
    /**
     * @param {import('./types.js').RescheduleBookingInput} input
     * @returns {Promise<import('./types.js').ToolResult>}
     */
    async execute(rawInput) {
      logToolActivity('reschedule_booking');
      const { slotId } = parseInput(rawInput);
      const newSlot = SLOTS.find((s) => s.id === slotId);
      if (!newSlot) {
        return { content: [{ type: 'text', text: `No slot found with id "${slotId}".` }] };
      }

      state.bookingStatus = 'idle';
      applySlotSelection(newSlot);
      announce(`Appointment rescheduled to ${newSlot.day} at ${newSlot.time}. Ready to submit.`);

      return {
        content: [{ type: 'text', text: `Appointment rescheduled to ${newSlot.day} at ${newSlot.time}.` }],
      };
    },
  });

  await document.modelContext.registerTool({
    name: 'cancel_booking',
    description: 'Cancel the current booking or reset an in-progress booking session.',
    inputSchema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Optional reason for cancellation.' },
      },
    },
    /**
     * @param {import('./types.js').CancelBookingInput} input
     * @returns {Promise<import('./types.js').ToolResult>}
     */
    async execute(rawInput) {
      const { reason } = parseInput(rawInput);
      state.selectedSlot = null;
      state.bookingStatus = 'idle';
      state.intakeForm = { reason: '', notes: '' };
      
      const modal = document.getElementById('confirm-modal');
      modal?.classList.add('hidden');
      
      if (state.selectedProvider) {
        const providerSlots = SLOTS.filter((s) => s.providerId === state.selectedProvider?.id);
        renderCalendar(providerSlots);
      }
      clearToolActivity();
      render();
      document.getElementById('booking-status')?.focus();
      announce('Booking cancelled and reset.');

      return {
        content: [{ type: 'text', text: `Booking cancelled successfully.${reason ? ` Reason: ${reason}` : ''}` }],
      };
    },
  });

  await document.modelContext.registerTool({
    name: 'fill_intake_form',
    description: "Fill in the visit reason and optional notes on the patient's intake form.",
    inputSchema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Reason for the visit.' },
        notes: { type: 'string', description: 'Optional additional notes for the provider.' },
      },
      required: ['reason'],
    },
    /**
     * @param {import('./types.js').FillIntakeFormInput} input
     * @returns {Promise<import('./types.js').ToolResult>}
     */
    async execute(rawInput) {
      logToolActivity('fill_intake_form');
      const { reason, notes } = parseInput(rawInput);
      fillIntakeForm(reason, notes ?? '');
      render({ highlight: 'intake' });
      announce(`Visit reason set to: ${reason}.`);

      return { content: [{ type: 'text', text: `Intake form updated. Reason: ${reason}.` }] };
    },
  });

  await document.modelContext.registerTool({
    name: 'submit_booking',
    description:
      'Request to submit the current booking. This does NOT complete the booking — it opens a confirmation prompt that the user must approve themselves before the appointment is finalized.',
    inputSchema: { type: 'object', properties: {} },
    /**
     * @returns {Promise<import('./types.js').ToolResult>}
     */
    async execute() {
      logToolActivity('submit_booking', 'Pending confirmation');
      if (!state.selectedProvider || !state.selectedSlot || !state.intakeForm.reason) {
        return {
          content: [
            {
              type: 'text',
              text: 'Cannot submit yet — a provider, a time slot, and a visit reason are all required first.',
            },
          ],
        };
      }

      markPendingConfirmation();
      render({ highlight: 'submit' });
      announce('Booking ready. Waiting for your confirmation before it is finalized.');
      openConfirmModal();

      return {
        content: [
          {
            type: 'text',
            text: 'Booking details are ready and a confirmation prompt has been shown to the user. The appointment will only be finalized once the user personally confirms it — this cannot be completed by a tool call.',
          },
        ],
      };
    },
  });
}

function openConfirmModal() {
  const modal = document.getElementById('confirm-modal');
  const summary = document.getElementById('confirm-summary');
  if (!modal || !summary || !state.selectedProvider || !state.selectedSlot) return;

  summary.textContent = `${state.selectedProvider.name} — ${state.selectedSlot.day} at ${state.selectedSlot.time}. Reason: ${state.intakeForm.reason}.`;
  modal.classList.remove('hidden');
}

/**
 * Helper to safely parse input whether passed as object or JSON string
 * @param {any} input
 * @returns {object}
 */
function parseInput(input) {
  if (typeof input === 'string') {
    try { return JSON.parse(input); } catch { return {}; }
  }
  return input || {};
}

/**
 * Helper to invoke a tool properly across Chrome native WebMCP and polyfills.
 * Chrome's native ModelContext.executeTool expects a RegisteredTool object as its first argument
 * and a JSON string or object as its second argument.
 * @param {string} name
 * @param {object} input
 */
async function invokeToolByName(name, input) {
  // @ts-ignore
  if (typeof document.modelContext?.getTools === 'function') {
    // @ts-ignore
    const tools = await document.modelContext.getTools();
    const toolObj = tools.find((t) => t.name === name);
    if (toolObj) {
      // @ts-ignore
      if (typeof document.modelContext.executeTool === 'function') {
        try {
          // Try passing JSON stringified (Chrome WebMCP native format)
          // @ts-ignore
          return await document.modelContext.executeTool(toolObj, JSON.stringify(input));
        } catch {
          // Fallback to plain object
          // @ts-ignore
          return await document.modelContext.executeTool(toolObj, input);
        }
      }
      if (typeof toolObj.execute === 'function') {
        return await toolObj.execute(input);
      }
    }
  }

  // Fallback direct registry check
  const fallbackTool = toolRegistry.get(name);
  if (fallbackTool) {
    return await fallbackTool.execute(input);
  }
  throw new Error(`Tool "${name}" not found.`);
}

/**
 * End-to-end WebMCP simulation runner for test harnesses, console testing, and demo recording.
 * Pacing is handled centrally by announce()'s serialized queue — no manual delays needed here.
 */
export async function runAgentDemo() {
  console.log('%c[WebMCP Agent]%c Starting automated booking demonstration...', 'color: #1B6A58; font-weight: bold;', 'color: inherit;');

  console.log('[WebMCP] Calling search_providers({ name: "Chen" })...');
  await invokeToolByName('search_providers', { name: 'Chen' });
  await waitForAnnouncements();

  console.log('[WebMCP] Calling list_available_slots({ providerId: "p1", day: "Tuesday", timeRange: "morning" })...');
  const slotsResult = await invokeToolByName('list_available_slots', {
    providerId: 'p1',
    day: 'Tuesday',
    timeRange: 'morning',
  });
  console.log('[WebMCP] Slots response:', slotsResult);
  await waitForAnnouncements();

  console.log('[WebMCP] Calling select_slot({ slotId: "s3" })...');
  await invokeToolByName('select_slot', { slotId: 's3' });
  await waitForAnnouncements();

  console.log('[WebMCP] Calling fill_intake_form({ reason: "Annual check-up", notes: "Please check insurance card" })...');
  await invokeToolByName('fill_intake_form', {
    reason: 'Annual check-up',
    notes: 'Please check insurance card on arrival',
  });
  await waitForAnnouncements();

  console.log('[WebMCP] Calling submit_booking()... (Staging human confirmation gate)');
  await invokeToolByName('submit_booking', {});
  console.log('%c[WebMCP Agent]%c Booking staged. Awaiting human confirmation in modal.', 'color: #C9762B; font-weight: bold;', 'color: inherit;');
}

// Expose on window for easy browser console execution
// @ts-ignore
window.runAgentDemo = runAgentDemo;
