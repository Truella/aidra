// @ts-check
import './types.js';
import { flashAgentHighlight } from './announcer.js';

/** @type {import('./types.js').AppState} */
export const state = {
  selectedProvider: null,
  selectedSlot: null,
  intakeForm: { reason: '', notes: '' },
  bookingStatus: 'idle',
};

/**
 * Sync current state to the DOM. Called after every state mutation, whether
 * triggered by a tool call or a direct human interaction (e.g. dragging a
 * slot manually, or clicking Confirm in the modal).
 * @param {{highlight?: 'provider'|'calendar'|'intake'|'submit'}} [opts]
 */
export function render(opts = {}) {
  renderProvider();
  renderSelectedSlotReadout();
  renderIntakeForm();
  renderSubmitButton();

  if (opts.highlight) {
    const panelIds = {
      provider: 'provider-panel',
      calendar: 'calendar-panel',
      intake: 'intake-panel',
      submit: 'submit-button',
    };
    flashAgentHighlight(document.getElementById(panelIds[opts.highlight]));
  }
}

function renderProvider() {
  const empty = document.getElementById('provider-empty');
  const result = document.getElementById('provider-result');
  const nameEl = document.getElementById('provider-name');
  const specialtyEl = document.getElementById('provider-specialty');
  if (!empty || !result || !nameEl || !specialtyEl) return;

  if (state.selectedProvider) {
    empty.classList.add('hidden');
    result.classList.remove('hidden');
    nameEl.textContent = state.selectedProvider.name;
    specialtyEl.textContent = state.selectedProvider.specialty;
  } else {
    empty.classList.remove('hidden');
    result.classList.add('hidden');
  }
}

function renderSelectedSlotReadout() {
  const readout = document.getElementById('selected-slot-readout');
  if (!readout) return;
  readout.textContent = state.selectedSlot
    ? `Selected: ${state.selectedSlot.day} at ${state.selectedSlot.time}`
    : '';
}

function renderIntakeForm() {
  const reasonInput = /** @type {HTMLInputElement|null} */ (document.getElementById('reason-input'));
  const notesInput = /** @type {HTMLTextAreaElement|null} */ (document.getElementById('notes-input'));
  if (reasonInput && reasonInput.value !== state.intakeForm.reason) {
    reasonInput.value = state.intakeForm.reason;
  }
  if (notesInput && notesInput.value !== state.intakeForm.notes) {
    notesInput.value = state.intakeForm.notes;
  }
}

// --- Shared mutation functions ---
// These are called both by direct human interaction (dragging a slot,
// clicking Confirm) and by WebMCP tools (js/tools.js), so the human path
// and the agent path always go through the same logic and stay in sync.

/**
 * @param {import('./types.js').Provider} provider
 */
export function selectProvider(provider) {
  state.selectedProvider = provider;
}

/**
 * @param {import('./types.js').Slot} slot
 */
export function selectSlot(slot) {
  state.selectedSlot = slot;
}

/**
 * @param {string} reason
 * @param {string} [notes]
 */
export function fillIntakeForm(reason, notes = '') {
  state.intakeForm.reason = reason;
  state.intakeForm.notes = notes;
}

export function markPendingConfirmation() {
  state.bookingStatus = 'pending-confirmation';
}

export function markConfirmed() {
  state.bookingStatus = 'confirmed';
}

function renderSubmitButton() {
  const button = /** @type {HTMLButtonElement|null} */ (document.getElementById('submit-button'));
  const status = document.getElementById('booking-status');
  if (!button || !status) return;

  const ready = Boolean(state.selectedProvider && state.selectedSlot && state.intakeForm.reason);
  button.disabled = !ready || state.bookingStatus === 'confirmed';

  if (state.bookingStatus === 'confirmed') {
    status.textContent = 'Appointment booked.';
  } else if (state.bookingStatus === 'pending-confirmation') {
    status.textContent = 'Waiting for your confirmation…';
  } else {
    status.textContent = '';
  }
}
