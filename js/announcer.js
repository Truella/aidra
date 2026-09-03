// @ts-check

const announcerEl = document.getElementById('announcer');

/**
 * Announce a message via the aria-live region.
 * Clears then re-sets on a short delay so screen readers re-announce even
 * if the message text is identical to the previous announcement — a known
 * ARIA gotcha (identical text back-to-back is sometimes not re-announced).
 * @param {string} message
 */
export function announce(message) {
  if (!announcerEl) return;
  announcerEl.textContent = '';
  window.setTimeout(() => {
    announcerEl.textContent = message;
  }, 50);
}

/**
 * Briefly apply the agent-action highlight to a panel element, so sighted
 * users/judges watching the demo can visually track what the agent just
 * touched. Purely additive to the aria-live announcement, not a replacement.
 * @param {HTMLElement|null} el
 */
export function flashAgentHighlight(el) {
  if (!el) return;
  el.classList.add('agent-highlight');
  window.setTimeout(() => {
    el.classList.remove('agent-highlight');
  }, 1400);
}
