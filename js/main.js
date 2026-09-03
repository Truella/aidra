// @ts-check
import { SLOTS, PROVIDERS } from './mock-data.js';
import { state, render, selectProvider, markConfirmed, markPendingConfirmation } from './state.js';
import { renderCalendar } from './calendar.js';
import { registerTools, runAgentDemo } from './tools.js';
import { announce, clearToolActivity } from './announcer.js';

async function init() {
  // Replace data-lucide placeholders with SVG icons (Lucide via CDN).
  // Module scripts run after the DOM is parsed, so all icons exist here.
  const win = /** @type {Window & { lucide?: { createIcons: (options?: Record<string, unknown>) => void } }} */ (window);
  if (win.lucide) win.lucide.createIcons();

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
  wireAgentDemoButton();

  // Register WebMCP tools (natively or via polyfill for test harness)
  await registerTools();
}

function wireAgentDemoButton() {
  const btn = document.getElementById('run-agent-demo-btn');
  btn?.addEventListener('click', async () => {
    // Blur the button in place rather than jumping focus across landmarks.
    // NVDA announces "complementary landmark / main landmark" when focus
    // crosses <aside> → <main>, which drowns out the first aria-live
    // announcement. Blurring here is silent — the queue handles narration.
    btn.blur();

    btn.setAttribute('disabled', 'true');
    btn.classList.add('opacity-50', 'cursor-not-allowed');
    try {
      await runAgentDemo();
    } finally {
      btn.removeAttribute('disabled');
      btn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  });
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
    clearToolActivity();
    render();
    // Blur away from the button so the screen reader stops tracking it.
    // The aria-live announcement fires independently — no focus anchor needed.
    button.blur();
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
    // Populate #booking-status before focusing so NVDA reads its text
    // content rather than saying "blank" for an empty element.
    const statusEl = document.getElementById('booking-status');
    if (statusEl) statusEl.textContent = 'Appointment confirmed.';
    statusEl?.focus();
    announce('Appointment confirmed and booked.');
  });

  noButton?.addEventListener('click', () => {
    state.bookingStatus = 'idle';
    modal?.classList.add('hidden');
    render();
    const statusEl = document.getElementById('booking-status');
    if (statusEl) statusEl.textContent = 'Booking cancelled.';
    statusEl?.focus();
    announce('Booking cancelled. No appointment was made.');
  });
}

init();
