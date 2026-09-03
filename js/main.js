// @ts-check
import { SLOTS, PROVIDERS } from './mock-data.js';
import { state, render, selectProvider, markConfirmed, markPendingConfirmation } from './state.js';
import { renderCalendar } from './calendar.js';
import { registerTools } from './tools.js';
import { announce } from './announcer.js';

async function init() {
  // Auto-select the default provider on load.
  selectProvider(PROVIDERS[0]);

  // Initial render of the calendar with the (only) provider's slots.
  const providerSlots = SLOTS.filter((s) => s.providerId === PROVIDERS[0].id);
  renderCalendar(providerSlots);
  render();

  wireManualIntakeInputs();
  wireManualSubmitButton();
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
    announce('Appointment confirmed and booked.');
  });

  noButton?.addEventListener('click', () => {
    state.bookingStatus = 'idle';
    modal?.classList.add('hidden');
    render();
    announce('Booking cancelled. No appointment was made.');
  });
}

init();
