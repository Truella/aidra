// @ts-check
import './types.js';
import { DAYS } from './mock-data.js';
import { selectSlot, render } from './state.js';
import { announce } from './announcer.js';

/**
 * Render the day-cell grid and the tray of draggable slot chips for a given
 * provider's slots. This is the demo's intentionally inaccessible pattern:
 * a human must drag a slot chip onto a day cell to select it — there is no
 * click-to-select fallback, mirroring real-world drag-only calendar widgets
 * that are the #2 most-cited screen reader barrier (interactive elements
 * that don't behave as expected, per WebAIM's annual survey).
 *
 * @param {import('./types.js').Slot[]} slots
 */
export function renderCalendar(slots) {
  const grid = document.getElementById('calendar-grid');
  const tray = document.getElementById('slot-tray');
  if (!grid || !tray) return;

  grid.innerHTML = '';
  tray.innerHTML = '';

  DAYS.forEach((day) => {
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    cell.dataset.day = day;
    cell.textContent = day;
    cell.addEventListener('dragover', (e) => {
      e.preventDefault();
      cell.classList.add('drag-over');
    });
    cell.addEventListener('dragleave', () => cell.classList.remove('drag-over'));
    cell.addEventListener('drop', (e) => {
      e.preventDefault();
      cell.classList.remove('drag-over');
      const slotId = e.dataTransfer?.getData('text/slot-id');
      const slot = slots.find((s) => s.id === slotId);
      if (slot) applySlotSelection(slot, cell, slots);
    });
    grid.appendChild(cell);
  });

  slots.forEach((slot) => {
    const chip = document.createElement('div');
    chip.className = 'slot-chip';
    chip.textContent = `${slot.day} · ${slot.time}`;
    chip.draggable = true;
    chip.dataset.slotId = slot.id;
    chip.addEventListener('dragstart', (e) => {
      e.dataTransfer?.setData('text/slot-id', slot.id);
    });
    tray.appendChild(chip);
  });
}

/**
 * Apply a slot selection — shared by human drag-drop and by the
 * `select_slot` WebMCP tool (see js/tools.js), so both paths update state,
 * UI, and the aria-live announcement identically.
 * @param {import('./types.js').Slot} slot
 * @param {HTMLElement|null} [sourceCell] - the day-cell that triggered this, if from a drag
 * @param {import('./types.js').Slot[]} [allSlots]
 */
export function applySlotSelection(slot, sourceCell = null, allSlots = [], muteAnnounce = false) {
  selectSlot(slot);
  render({ highlight: 'calendar' });
  if (!muteAnnounce) {
    announce(`${slot.day} at ${slot.time} selected.`);
  }
  markFilledCell(slot);
}

/**
 * Visually mark the day cell matching the selected slot as filled, and
 * clear "filled" styling from any other cell.
 * @param {import('./types.js').Slot} slot
 */
function markFilledCell(slot) {
  const grid = document.getElementById('calendar-grid');
  if (!grid) return;
  grid.querySelectorAll('.day-cell').forEach((el) => {
    const cell = /** @type {HTMLElement} */ (el);
    if (cell.dataset.day === slot.day) {
      cell.classList.add('filled');
      cell.textContent = `${slot.day} — ${slot.time}`;
    } else {
      cell.classList.remove('filled');
      cell.textContent = cell.dataset.day ?? '';
    }
  });
}
