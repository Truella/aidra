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

/**
 * Log a WebMCP tool execution to the on-page activity panel.
 * @param {string} toolName
 * @param {string} [status]
 */
export function logToolActivity(toolName, status = '') {
  const logList = document.getElementById('activity-log-list');
  const emptyMessage = document.getElementById('activity-log-empty');
  if (!logList) return;

  if (emptyMessage) {
    emptyMessage.remove();
  }

  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const row = document.createElement('div');
  row.className = 'flex items-center justify-between py-2 border-b border-ink/5 last:border-none text-xs';
  row.innerHTML = `
    <div class="flex items-center gap-2">
      <span class="w-1.5 h-1.5 rounded-full bg-teal"></span>
      <span class="font-mono text-teal font-semibold text-[11px] bg-teal-soft/60 px-1.5 py-0.5 rounded border border-teal-border/40">${toolName}</span>
    </div>
    <span class="text-ink/40 text-[10px] font-medium">${status || time}</span>
  `;

  logList.appendChild(row);
  logList.scrollTop = logList.scrollHeight;
}
