// Small localStorage helpers shared by the realtime tools (poker, retro, wbs)
// so a returning user doesn't retype their name or hunt for a room code.

const NAME_KEY = 'agile-free-username';
const RECENT_PREFIX = 'agile-free-recent-';
const RECENT_MAX = 5;

export function getSavedUsername(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveUsername(name: string): void {
  const trimmed = name.trim();
  if (trimmed) {
    try { localStorage.setItem(NAME_KEY, trimmed); } catch { /* ignore */ }
  }
}

type Tool = 'poker' | 'retro' | 'wbs';

export function getRecentRooms(tool: Tool): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_PREFIX + tool) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((r): r is string => typeof r === 'string') : [];
  } catch {
    return [];
  }
}

// Records a room as most-recent for a tool (dedup, capped, newest first).
export function addRecentRoom(tool: Tool, code: string): void {
  const room = code.trim().toUpperCase();
  if (!room) return;
  try {
    const next = [room, ...getRecentRooms(tool).filter(r => r !== room)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_PREFIX + tool, JSON.stringify(next));
  } catch { /* ignore */ }
}

// The room code of the shared backlog this browser is currently connected to,
// or null when the Story tool is in its default local-only mode. Retro and WBS
// read this to decide whether "send to backlog" targets the shared room.
const ACTIVE_BACKLOG_KEY = 'agile-free-shared-backlog';

export function getActiveSharedBacklog(): string | null {
  try {
    return localStorage.getItem(ACTIVE_BACKLOG_KEY) || null;
  } catch {
    return null;
  }
}

export function setActiveSharedBacklog(code: string | null): void {
  try {
    if (code) localStorage.setItem(ACTIVE_BACKLOG_KEY, code.trim().toUpperCase());
    else localStorage.removeItem(ACTIVE_BACKLOG_KEY);
  } catch { /* ignore */ }
}
