# Improvement Suggestions: Data Structure & Export for Story Development

> **Status:** all eight items below are now implemented on this branch —
> items 1–3 in `c774373`, items 4–7 in `1efd0fa`, item 8 in `c05a964`.
> The text below is the original review, kept as the rationale for those
> changes.

This review focuses on how the data model and export functions across the four tools
(WBS → Story Generator → Planning Poker, plus Retro Board) can better support the
full story-development workflow: decompose work, write stories, estimate them, and
get finished stories out into a real tracker.

## The core observation

The app already has the right pipeline — WBS breaks epics into stories, the Story
Generator fleshes them out, and Poker estimates them. But the pipeline is
**one-directional and lossy**. Data that one tool creates (epic/feature lineage,
acceptance criteria, story points) gets dropped at each hand-off, and there is no
way to bring estimated stories back into the backlog. Fixing the shared data model
and making exports round-trippable would turn three loosely-connected tools into
one coherent story-development workflow.

---

## 1. One shared `Story` model instead of three copies

The story shape is currently defined three times and is already drifting:

| Location | Definition | Drift |
|---|---|---|
| `src/pages/StoryTool.tsx:27` | `Story` | has `points?`, `epic?`, `feature?` |
| `src/pages/PokerTool.tsx:16` | `Story` | identical today, by luck |
| `src/pages/WBSTool.tsx:30` | `ExportedStory` | missing `points` |

The CSV helpers (`escapeCSV`, `storiesToCSV`) are likewise duplicated in
`StoryTool.tsx` and `PokerTool.tsx`, and only Poker has a parser.

**Suggestion:** create a single shared module:

```
src/lib/story.ts        // Story interface + createStory() + id generation
src/lib/storyCsv.ts     // storiesToCSV / parseStoriesFromCSV (one symmetric pair)
```

```ts
// src/lib/story.ts
export interface Story {
  id: string;
  title: string;
  asA: string;
  iWant: string;
  soThat: string;
  criteria: string[];
  points?: number;        // number, not string — enables sorting & velocity math
  priority?: 'High' | 'Medium' | 'Low';
  epic?: string;
  feature?: string;
  status?: 'draft' | 'ready' | 'estimated';
}

export const newId = () => crypto.randomUUID();
```

Also worth centralizing: the localStorage key `'agile-free-backlog'` is a magic
string typed in both `WBSTool.tsx:637` and `StoryTool.tsx:204` — export it from the
shared module.

**Related cleanups this enables:**
- Replace the six copies of `Math.random().toString(36).substr(2, 9)` (client and
  `server.js`) with `crypto.randomUUID()` — `substr` is deprecated and 9-char random
  IDs will eventually collide in merged backlogs.
- `FormData.priority` and `FormData.points` in `StoryTool.tsx:39-45` are collected
  in state but never rendered as inputs and never copied onto the story in
  `addToBacklog` — either add the inputs and persist the fields, or delete them.

## 2. Make the CSV export lossless and round-trippable

`storiesToCSV` exports only `title, asA, iWant, soThat, points, criteria`. Two
fields the app itself creates are silently dropped:

- **`epic` / `feature`** — the whole point of the WBS tool is to establish this
  lineage, and the Poker UI proudly displays the badges (`PokerTool.tsx:586-590`),
  but the moment a backlog is exported the traceability is gone. Re-importing the
  same file shows bare stories.
- **`id`** — every import mints new random IDs (`PokerTool.tsx:76`), so an exported
  backlog can never be reconciled with the one still sitting in the Story tool's
  localStorage.

**Suggestion:** one canonical column set used by both export and import:

```
id, epic, feature, title, asA, iWant, soThat, points, criteria
```

Import should preserve `id` when the column is present and only generate one when
it isn't (i.e. hand-written spreadsheets still work).

**Criteria delimiter bug:** criteria are joined with `|` and split on `|` with no
escaping, so a criterion like "user can filter by status | priority" corrupts on
round trip. Since fields are already CSV-quoted, join with `\n` instead — newlines
inside quoted cells are valid CSV, survive Excel/Sheets, and can't appear in a
single-line input field.

**Two smaller export items:**
- Prefix-escape cells starting with `=`, `+`, `-`, `@` (CSV/formula injection —
  these files are destined for Excel/Sheets).
- Use an ISO date in filenames (`backlog-2026-07-06.csv`) instead of
  `Date.now()` epoch milliseconds (`StoryTool.tsx:338`, `PokerTool.tsx:373`).

## 3. Close the loop: points should flow back to the backlog

Today the flow is strictly one-way:

```
WBS ──export──▶ Story backlog (localStorage) ──socket──▶ Poker room
                                                            │
                    estimated points live and die here ◀────┘  (CSV download only)
```

Once stories are pushed to a Poker room, the points assigned in
`poker:completeStory` exist only in the room's server-side session. The Story
tool's backlog — the actual system of record — never learns the estimates. The only
way out is the Poker CSV download, and (per §2) re-importing it can't be matched
back up because IDs are regenerated.

**Suggestions (independent, in order of value):**

1. **"Sync points to backlog" in Poker** — when a story is completed, or via an
   explicit button, write points back into the `agile-free-backlog` localStorage
   entry by `id` (the Story tool launched the room, so same browser/origin covers
   the common case). With stable IDs from §2, the CSV route also becomes a valid
   fallback for cross-device sessions.
2. **CSV import in the Story tool** — Poker can import a CSV but the Story tool,
   the backlog owner, cannot. Reusing the shared parser this is ~15 lines, and it
   also gives teams a migration path from existing spreadsheets.
3. **Merge-by-id with update semantics** — the WBS export merge
   (`WBSTool.tsx:637-640`) only appends stories whose id is unseen. Re-exporting
   after renaming a story in the WBS leaves the stale copy in the backlog. Merge
   should update existing entries by id, not skip them.

## 4. Enrich the WBS story node so exports produce complete stories

The WBS "details" form captures only `asA` and `soThat`; on export the story's
`iWant` is faked from the node title (`iWant: story.title`, `WBSTool.tsx:623`) and
`criteria` is hard-coded to `[]`. So every WBS-born story lands in the backlog
flagged INCOMPLETE-adjacent and needs re-editing.

**Suggestion:** extend `WBSNodeData` for story nodes with optional `iWant` and
`criteria: string[]`, add those two inputs to the existing detail form, and pass
them through `wbs:updateStoryDetails` in `server.js:244`. Export then produces
genuinely ready stories, and the ✓ badge in the tree can mean "story is complete"
rather than "someone typed something". Falling back to the title for `iWant` when
blank keeps the current low-friction behavior.

Also: the export walk (`WBSTool.tsx:610-631`) only visits exactly
epic→feature→story paths. That matches what the UI can build today, but a
recursive walk keyed on `node.type === 'story'` is the same amount of code and
won't silently drop stories if the hierarchy rules ever loosen.

## 5. Export formats aimed at where stories actually go

The end state of story development is usually a tracker or a document, not a
generic CSV. All of these are cheap once the shared model exists:

- **Jira-compatible CSV** — an export preset with headers Jira's importer maps
  automatically (`Summary`, `Description`, `Story Points`, `Epic Name`), with the
  As-a/I-want/So-that + criteria composed into `Description`. Azure DevOps is the
  same idea with `Work Item Type`/`Title`/`Description`/`Acceptance Criteria`.
- **JSON export/import** — lossless by construction, trivially versionable
  (`{ version: 1, stories: [...] }`), and the natural format for backing up a
  backlog or moving it between browsers (which localStorage otherwise silos).
- **Markdown export** — one story per section with criteria as checkboxes; pastes
  directly into wikis, PR descriptions, and AI prompts (the README already bills
  the tool as "AI-ready").

A single export menu (`CSV · Jira CSV · JSON · Markdown`) on both the Story tool
and Poker replaces the current single-purpose buttons.

## 6. Retro action items are story seeds — connect them

The Retro export (`RetroTool.tsx:393`) is a plain-text dump. Action items in
particular usually become backlog work, and the WBS tool already demonstrates the
exact pattern: **"send action items to Story backlog"** — map each action-item card
to a draft `Story` (`iWant: card.text`, `status: 'draft'`, maybe
`epic: 'Retro YYYY-MM-DD'`), merge into `agile-free-backlog`, navigate to
`/stories`. That closes the last loop: retro → backlog → estimate.

## 7. Server-side data notes (lower priority)

- **Sessions never expire** — `poker.json` / `retro.json` / `wbs.json` grow
  forever. Add `createdAt`/`lastActivity` (WBS already has `createdAt`) and prune
  rooms idle for ~30 days on startup.
- **`poker:completeStory` off-by-one** (`server.js:111-122`): when the completed
  `storyId` isn't found, `idx` is `-1` and `s.backlog[idx + 1]` silently selects
  the *first* story. Guard `idx !== -1` before advancing.
- **`poker:updateBacklog` is whole-array replacement** and is also used for
  single-story removal (`PokerTool.tsx:538`). Two participants acting at once will
  clobber each other. Granular `poker:addStories` / `poker:removeStory` events
  keep this last-write-wins window from eating a whole backlog.
- **No payload validation** — e.g. `retro:addCard` will crash the handler if
  `colKey` isn't a real column. A tiny guard per handler keeps one malformed
  client from throwing in the shared socket process.

---

## Suggested order of implementation

| # | Change | Effort | Payoff |
|---|--------|--------|--------|
| 1 | Shared `Story` type + CSV module (`src/lib/`) | S | Prerequisite for everything below; removes drift |
| 2 | Lossless CSV (id/epic/feature columns, criteria delimiter) | S | Round-tripping works; WBS lineage survives |
| 3 | CSV import in Story tool + merge-by-id updates | S | Backlog becomes the system of record |
| 4 | WBS story details: `iWant` + criteria | M | WBS exports ready-to-estimate stories |
| 5 | Poker points sync back to backlog | M | Closes the estimate loop |
| 6 | Export presets (Jira CSV / JSON / Markdown) | M | Stories reach real trackers |
| 7 | Retro action items → backlog | S | Closes the retro loop |
| 8 | Server fixes (idx guard, granular backlog events, TTL) | S | Robustness |

Items 1–3 are a natural first PR: pure refactor plus small feature, no schema
changes on the server, and every later item builds on them.
