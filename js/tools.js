// @ts-check
import './types.js';
import { PROVIDERS, SLOTS } from './mock-data.js';
import { state, selectProvider, fillIntakeForm, markPendingConfirmation, render } from './state.js';
import { applySlotSelection } from './calendar.js';
import { announce } from './announcer.js';

/**
 * Register all WebMCP tools. Called once from main.js on page load.
 * IMPORTANT: submit_booking does NOT complete the booking itself — it only
 * surfaces the confirm/cancel modal. The actual completion happens only via
 * a real click on the Confirm button (see main.js), so the human is
 * literally, not just narratively, in control of the final step.
 */
export async function registerTools() {
  await document.modelContext.registerTool({
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
    async execute({ name }) {
      const match = PROVIDERS.find((p) =>
        p.name.toLowerCase().includes(name.toLowerCase())
      );

      if (!match) {
        return { content: [{ type: 'text', text: `No provider found matching "${name}".` }] };
      }

      selectProvider(match);
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
    async execute({ providerId, day, timeRange }) {
      const matches = SLOTS.filter((s) => {
        if (s.providerId !== providerId) return false;
        if (day && s.day.toLowerCase() !== day.toLowerCase()) return false;
        if (timeRange && s.timeRange !== timeRange) return false;
        return true;
      });

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
    async execute({ slotId }) {
      const slot = SLOTS.find((s) => s.id === slotId);
      if (!slot) {
        return { content: [{ type: 'text', text: `No slot found with id "${slotId}".` }] };
      }

      applySlotSelection(slot);

      return { content: [{ type: 'text', text: `Selected ${slot.day} at ${slot.time}.` }] };
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
    async execute({ reason, notes }) {
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
