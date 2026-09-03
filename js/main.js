// @ts-check
import { SLOTS, PROVIDERS } from './mock-data.js';
import { state, render, selectProvider, markConfirmed, markPendingConfirmation } from './state.js';
import { renderCalendar } from './calendar.js';
import { registerTools } from './tools.js';
import { announce } from './announcer.js';

async function init() {
  // Populate provider selector dropdown
  populateProviderSelector();

  // Auto-select the default provider on load.
  selectProvider(PROVIDERS[0]);

  // Initial render of the calendar with the provider's slots.
  const providerSlots = SLOTS.filter((s) => s.providerId === PROVIDERS[0].id);
  renderCalendar(providerSlots);
  render();

  wireProviderSelector();
  wireManualIntakeInputs();
  wireManualSubmitButton();
  wireManualResetButton();
  wireConfirmModal();

  // Register WebMCP tools if the API is available in this browser/context.
  if ('modelContext' in document) {
    await registerTools();
  } else {
    console.warn(
      'document.modelContext is not available in this browser. ' +
      'Enable chrome://flags/#enable-webmcp-testing in Chrome, or open this ' +
      'page in an agent-enabled browser (e.g. ChatGPT\'s in-app browser) to test tool calls.'
    );
  }
}

function populateProviderSelector() {
  const select = /** @type {HTMLSelectElement|null} */ (document.getElementById('provider-select'));
  if (!select) return;
  select.innerHTML = '';
  PROVIDERS.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name} (${p.specialty})`;
    select.appendChild(opt);
  });
}

function wireProviderSelector() {
  const select = /** @type {HTMLSelectElement|null} */ (document.getElementById('provider-select'));
  select?.addEventListener('change', () => {
    const chosen = PROVIDERS.find((p) => p.id === select.value);
    if (!chosen) return;
    selectProvider(chosen);
    state.selectedSlot = null; // reset slot if provider changes
    const providerSlots = SLOTS.filter((s) => s.providerId === chosen.id);
    renderCalendar(providerSlots);
    render();
    announce(`Switched to ${chosen.name}, ${chosen.specialty}. Available appointment times updated.`);
  });
}

function wireManualIntakeInputs() {
  const reasonInput = /** @type {HTMLInputElement|null} */ (document.getElementById('reason-input'));
  const notesInput = /** @type {HTMLTextAreaElement|null} */ (document.getElementById('notes-input'));

  reasonInput?.addEventListener('input', () => {
    state.intakeForm.reason = reasonInput.value;
    render();
  });

  notesInput?.addEventListener('input', () => {
    state.intakeForm.notes = notesInput.value;
    render();
  });
}

// The human can also trigger submit directly, without an agent — this is
// the regression path: the app must remain fully usable without WebMCP.
function wireManualSubmitButton() {
  const button = document.getElementById('submit-button');
  button?.addEventListener('click', () => {
    if (button instanceof HTMLButtonElement && button.disabled) return;
    markPendingConfirmation();
    render({ highlight: 'submit' });
    announce('Booking ready. Waiting for your confirmation before it is finalized.');

    const modal = document.getElementById('confirm-modal');
    const summary = document.getElementById('confirm-summary');
    if (modal && summary && state.selectedProvider && state.selectedSlot) {
      summary.textContent = `${state.selectedProvider.name} — ${state.selectedSlot.day} at ${state.selectedSlot.time}. Reason: ${state.intakeForm.reason}.`;
      modal.classList.remove('hidden');
    }
  });
}

function wireManualResetButton() {
  const button = document.getElementById('reset-button');
  button?.addEventListener('click', () => {
    state.selectedSlot = null;
    state.bookingStatus = 'idle';
    state.intakeForm = { reason: '', notes: '' };

    if (state.selectedProvider) {
      const providerSlots = SLOTS.filter((s) => s.providerId === state.selectedProvider?.id);
      renderCalendar(providerSlots);
    }
    render();
    document.getElementById('booking-status')?.focus();
    announce('Booking form and selected time slot have been reset.');
  });
}

// This is the ONLY place a booking is actually finalized — a real DOM click,
// never a tool call. This is what makes "the human stays in control of the
// final step" literally true rather than just narrated to the agent.
function wireConfirmModal() {
  const modal = document.getElementById('confirm-modal');
  const yesButton = document.getElementById('confirm-yes');
  const noButton = document.getElementById('confirm-no');

  yesButton?.addEventListener('click', () => {
    markConfirmed();
    modal?.classList.add('hidden');
    render();
    document.getElementById('booking-status')?.focus();
    announce('Appointment confirmed and booked.');
  });

  noButton?.addEventListener('click', () => {
    state.bookingStatus = 'idle';
    modal?.classList.add('hidden');
    render();
    document.getElementById('booking-status')?.focus();
    announce('Booking cancelled. No appointment was made.');
  });
}

init();
