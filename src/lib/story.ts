// Shared story model used by the WBS, Story Generator, and Planning Poker tools.

export interface Story {
  id: string;
  title: string;
  asA: string;
  iWant: string;
  soThat: string;
  criteria: string[];
  points?: number;
  epic?: string;
  feature?: string;
  status?: 'draft' | 'ready' | 'estimated';
}

// localStorage key for the shared backlog (system of record for stories).
export const BACKLOG_STORAGE_KEY = 'agile-free-backlog';

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 11);
}

export function storyTitle(asA: string, iWant: string): string {
  const base = iWant.length > 30 ? `${iWant.slice(0, 30)}...` : iWant;
  return asA ? `${asA}: ${base}` : base;
}

// Coerces untrusted/legacy data (old localStorage entries, imported files)
// into a well-formed Story. Legacy entries stored points as a string.
export function normalizeStory(raw: unknown): Story {
  const r = (raw ?? {}) as Record<string, unknown>;
  const str = (v: unknown): string => (typeof v === 'string' ? v : '');
  const story: Story = {
    id: str(r.id) || newId(),
    title: str(r.title),
    asA: str(r.asA),
    iWant: str(r.iWant),
    soThat: str(r.soThat),
    criteria: Array.isArray(r.criteria) ? r.criteria.filter((c): c is string => typeof c === 'string') : [],
  };
  if (r.points !== undefined && r.points !== null && r.points !== '') {
    const n = Number(r.points);
    if (!isNaN(n)) story.points = n;
  }
  if (str(r.epic)) story.epic = str(r.epic);
  if (str(r.feature)) story.feature = str(r.feature);
  if (r.status === 'draft' || r.status === 'ready' || r.status === 'estimated') story.status = r.status;
  return story;
}

export function loadBacklog(): Story[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(BACKLOG_STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.map(normalizeStory) : [];
  } catch {
    return [];
  }
}

export function saveBacklog(stories: Story[]): void {
  localStorage.setItem(BACKLOG_STORAGE_KEY, JSON.stringify(stories));
}

// Merges incoming stories into an existing list by id: known ids update the
// existing entry, new ids append. On update only non-empty incoming fields
// overwrite, so a source that doesn't track a field (e.g. the WBS has no
// acceptance criteria) can't wipe what another tool added.
export function mergeStoriesById(existing: Story[], incoming: Story[]): Story[] {
  const merged = [...existing];
  const indexById = new Map(existing.map((s, i) => [s.id, i] as const));
  for (const story of incoming) {
    const i = indexById.get(story.id);
    if (i !== undefined) {
      const informative = Object.fromEntries(
        Object.entries(story).filter(([, v]) =>
          v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)
        )
      ) as Partial<Story>;
      merged[i] = { ...merged[i], ...informative };
    } else {
      indexById.set(story.id, merged.length);
      merged.push(story);
    }
  }
  return merged;
}

// Writes an estimate back onto the shared backlog. Returns false when the
// story isn't in this browser's backlog (e.g. joined someone else's room).
export function syncPointsToBacklog(storyId: string, points: number): boolean {
  const backlog = loadBacklog();
  const idx = backlog.findIndex(s => s.id === storyId);
  if (idx === -1) return false;
  backlog[idx] = { ...backlog[idx], points, status: 'estimated' };
  saveBacklog(backlog);
  return true;
}
