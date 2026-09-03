// @ts-check

const announcerEl = document.getElementById('announcer');

/** @type {{message: string}[]} */
const announceQueue = [];
let isProcessingQueue = false;

/**
 * Calculate a comfortable pause so a screen reader (or a sighted judge
 * reading the caption) has time to actually finish an announcement before
 * the next one starts. ~150-180 words/min speech rate.
 * @param {string} text
 * @returns {number} milliseconds
 */
export function getSpeechDelay(text) {
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(2200, wordCount * 380 + 800);
}

/**
 * Announce a message via the aria-live region and update the visual
 * narration caption. Queued and serialized: if a previous announcement
 * hasn't finished its estimated speaking time yet, this one waits — so
 * fast, back-to-back agent tool calls never cut off or overwrite a
 * narration mid-speech. This keeps narration in sync with actual
 * execution speed, whether driven by runAgentDemo() or a real agent.
 * @param {string} message
 */
export function announce(message) {
  announceQueue.push({ message });
  if (!isProcessingQueue) {
    processAnnounceQueue();
  }
}

async function processAnnounceQueue() {
  isProcessingQueue = true;
  while (announceQueue.length > 0) {
    const next = announceQueue.shift();
    if (!next) break;
    showAnnouncement(next.message);
    await new Promise((resolve) => setTimeout(resolve, getSpeechDelay(next.message)));
  }
  isProcessingQueue = false;
}

/**
 * Returns a promise that resolves once all currently queued announcements
 * have finished speaking. Use this in runAgentDemo() between tool steps so
 * DOM mutations and narration stay in sync.
 * @returns {Promise<void>}
 */
export function waitForAnnouncements() {
  return new Promise((resolve) => {
    function check() {
      if (!isProcessingQueue && announceQueue.length === 0) {
        resolve();
      } else {
        setTimeout(check, 100);
      }
    }
    check();
  });
}

/**
 * @param {string} message
 */
function showAnnouncement(message) {
  const captionEl = document.getElementById('narration-caption');
  if (captionEl) {
    captionEl.textContent = `"${message}"`;
    captionEl.classList.remove('italic', 'text-ink/40');
    captionEl.classList.add('text-teal', 'font-medium');
  }

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

/**
 * Reset the agent activity log and narration caption back to their initial
 * waiting state. Also clears any pending queued announcements so a reset
 * (e.g. cancel_booking) doesn't leave stale narration to play out afterward.
 */
export function clearToolActivity() {
  announceQueue.length = 0;
  isProcessingQueue = false;

  const logList = document.getElementById('activity-log-list');
  if (logList) {
    logList.innerHTML = `<p id="activity-log-empty" class="text-xs text-ink/40 italic py-4 text-center">Waiting for agent tool invocations…</p>`;
  }

  const captionEl = document.getElementById('narration-caption');
  if (captionEl) {
    captionEl.textContent = 'Ready for user interaction or agent tool calls…';
    captionEl.classList.add('italic');
    captionEl.classList.remove('font-medium', 'text-teal');
    captionEl.classList.add('text-ink/40');
  }
}
