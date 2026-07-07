// Serialization for the shared Story model: canonical CSV (lossless,
// round-trippable), JSON, Jira-importable CSV, and Markdown.

import { Story, newId, normalizeStory } from './story';

export const CSV_COLUMNS = ['id', 'epic', 'feature', 'title', 'asA', 'iWant', 'soThat', 'points', 'criteria'] as const;

// Cells starting with these characters can execute as formulas in Excel /
// Sheets, so they get a leading apostrophe on export (stripped on import).
const FORMULA_CHARS = ['=', '+', '-', '@'];

export function escapeCSV(val: string): string {
  let v = val;
  if (v.length > 0 && FORMULA_CHARS.includes(v[0])) v = `'${v}`;
  if (/[",\n\r]/.test(v)) v = `"${v.replace(/"/g, '""')}"`;
  return v;
}

function stripFormulaGuard(v: string): string {
  return v.length > 1 && v[0] === "'" && FORMULA_CHARS.includes(v[1]) ? v.slice(1) : v;
}

// Full-text CSV parser: handles quoted fields containing commas, escaped
// quotes, and newlines (which the line-splitting approach it replaces did not).
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cur);
      cur = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cur);
      rows.push(row);
      row = [];
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur !== '' || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  return rows.filter(r => r.some(f => f.trim() !== ''));
}

// Criteria live in one quoted cell, newline-separated. Older exports used
// '|' as the separator, so that's accepted on the way in.
function splitCriteria(raw: string): string[] {
  if (!raw) return [];
  const parts = raw.includes('\n') ? raw.split(/\r?\n/) : raw.split('|');
  return parts.map(p => p.trim()).filter(Boolean);
}

export function storiesToCSV(stories: Story[]): string {
  const rows = stories.map(s =>
    [
      s.id,
      s.epic ?? '',
      s.feature ?? '',
      s.title,
      s.asA,
      s.iWant,
      s.soThat,
      s.points !== undefined ? String(s.points) : '',
      (s.criteria ?? []).join('\n'),
    ].map(escapeCSV).join(',')
  );
  return [CSV_COLUMNS.join(','), ...rows].join('\n');
}

export function parseStoriesFromCSV(text: string): Story[] {
  const rows = parseCSV(text.trim());
  if (rows.length < 2) return [];
  const header = rows[0].map(h => h.toLowerCase().replace(/[^a-z]/g, ''));
  const col = (...names: string[]) => {
    for (const n of names) {
      const i = header.indexOf(n);
      if (i !== -1) return i;
    }
    return -1;
  };
  const idx = {
    id: col('id'),
    epic: col('epic', 'epicname'),
    feature: col('feature'),
    title: col('title', 'summary'),
    asA: col('asa'),
    iWant: col('iwant', 'iwantto'),
    soThat: col('sothat'),
    points: col('points', 'storypoints'),
    criteria: col('criteria', 'acceptancecriteria'),
  };
  const get = (row: string[], i: number) => (i >= 0 ? stripFormulaGuard(row[i] ?? '').trim() : '');

  return rows
    .slice(1)
    .map(row =>
      normalizeStory({
        id: get(row, idx.id) || newId(),
        epic: get(row, idx.epic),
        feature: get(row, idx.feature),
        title: get(row, idx.title),
        asA: get(row, idx.asA),
        iWant: get(row, idx.iWant),
        soThat: get(row, idx.soThat),
        points: get(row, idx.points),
        criteria: splitCriteria(idx.criteria >= 0 ? stripFormulaGuard(row[idx.criteria] ?? '') : ''),
      })
    )
    .filter(s => s.title || s.asA || s.iWant);
}

// --- JSON (lossless backup / transfer format) ---

export function storiesToJSON(stories: Story[]): string {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), stories }, null, 2);
}

export function parseStoriesFromJSON(text: string): Story[] {
  try {
    const parsed = JSON.parse(text);
    const list = Array.isArray(parsed) ? parsed : parsed?.stories;
    return Array.isArray(list) ? list.map(normalizeStory) : [];
  } catch {
    return [];
  }
}

function storyDescription(s: Story): string {
  const parts: string[] = [];
  if (s.asA || s.iWant || s.soThat) {
    parts.push(`As a ${s.asA || '...'}, I want ${s.iWant || '...'}, so that ${s.soThat || '...'}.`);
  }
  if (s.criteria.length > 0) {
    parts.push('', 'Acceptance Criteria:', ...s.criteria.map(c => `* ${c}`));
  }
  return parts.join('\n');
}

// --- Jira-importable CSV ---
// Headers Jira's CSV importer maps automatically; Azure DevOps maps the same
// columns manually.

export function storiesToJiraCSV(stories: Story[]): string {
  const header = ['Issue Type', 'Summary', 'Description', 'Story Points', 'Epic Name', 'Labels'];
  const rows = stories.map(s =>
    [
      'Story',
      s.title,
      storyDescription(s),
      s.points !== undefined ? String(s.points) : '',
      s.epic ?? '',
      s.feature ?? '',
    ].map(escapeCSV).join(',')
  );
  return [header.join(','), ...rows].join('\n');
}

// --- Markdown (wikis, PR descriptions, AI prompts) ---

export function storiesToMarkdown(stories: Story[]): string {
  const sections = stories.map(s => {
    const meta = [
      s.epic && `**Epic:** ${s.epic}`,
      s.feature && `**Feature:** ${s.feature}`,
      s.points !== undefined && `**Points:** ${s.points}`,
    ].filter(Boolean).join(' · ');
    const lines = [`## ${s.title || 'Untitled story'}`];
    if (meta) lines.push('', meta);
    if (s.asA || s.iWant || s.soThat) {
      lines.push('', `As a **${s.asA || '...'}**, I want **${s.iWant || '...'}**, so that **${s.soThat || '...'}**.`);
    }
    if (s.criteria.length > 0) {
      lines.push('', '**Acceptance criteria**', '', ...s.criteria.map(c => `- [ ] ${c}`));
    }
    return lines.join('\n');
  });
  return `# Backlog\n\n${sections.join('\n\n')}\n`;
}

// --- Download helper ---

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const isoDate = (): string => new Date().toISOString().slice(0, 10);
