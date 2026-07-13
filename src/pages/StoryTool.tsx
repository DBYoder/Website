import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { COLORS } from '../GlobalStyles';
import ToolShell from '../components/ToolShell';
import { Btn, Label, CornerBracket } from '../components/Core';
import ExportMenu from '../components/ExportMenu';
import { Story, newId, storyTitle, loadBacklog, saveBacklog, mergeStoriesById } from '../lib/story';
import { parseStoriesFromCSV, parseStoriesFromJSON } from '../lib/storyCsv';
import { getActiveSharedBacklog, setActiveSharedBacklog } from '../lib/session';

// --- Types ---
interface FormData {
  asA: string;
  iWant: string;
  soThat: string;
}

// --- Styles ---
const StoryContainer = styled.div`
  flex: 1;
  display: flex;
  overflow: hidden;
  @media (max-width: 768px) {
    flex-direction: column;
    overflow: visible;
  }
`;

const InputPanel = styled.div`
  width: 420px;
  border-right: 1px solid ${COLORS.border};
  display: flex;
  flex-direction: column;
  padding: 32px;
  gap: 24px;
  background: ${COLORS.surface};
  overflow-y: auto;
  @media (max-width: 768px) {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid ${COLORS.border};
    overflow: visible;
    padding: 20px 16px;
  }
`;

const OutputPanel = styled.div`
  flex: 1;
  padding: 32px 48px;
  display: flex;
  flex-direction: column;
  @media (max-width: 768px) {
    padding: 20px 16px;
    overflow: visible;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Input = styled.input`
  height: 40px;
  background: ${COLORS.elevated};
  border: 1px solid ${COLORS.border};
  padding: 0 16px;
  color: ${COLORS.primary};
  font-family: 'Share Tech Mono', monospace;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: ${COLORS.purple};
  }
`;

const TextArea = styled.textarea<{ height?: number }>`
  height: ${props => props.height || 80}px;
  background: ${COLORS.elevated};
  border: 1px solid ${COLORS.border};
  padding: 12px 16px;
  color: ${COLORS.primary};
  font-family: 'Share Tech Mono', monospace;
  font-size: 14px;
  resize: none;
  line-height: 1.5;

  &:focus {
    outline: none;
    border-color: ${COLORS.purple};
  }
`;

const StoryCard = styled.div`
  background: ${COLORS.card};
  border: 1px solid ${COLORS.border};
  padding: 40px;
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4);
  @media (max-width: 768px) {
    padding: 20px;
    flex: none;
    overflow: visible;
    min-height: 400px;
  }
`;

const StoryBody = styled.div`
  margin-bottom: 32px;
  padding: 24px;
  background: ${COLORS.elevated};
  border: 1px solid ${COLORS.border};
`;

const StoryLine = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  align-items: flex-start;
  font-size: 18px;
  line-height: 1.4;
`;

const BacklogList = styled.div`
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const BacklogItem = styled.div<{ incomplete?: boolean }>`
  padding: 12px;
  background: ${COLORS.elevated};
  border: 1px solid ${props => props.incomplete ? COLORS.magenta : COLORS.border};
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
  ${props => props.incomplete && `box-shadow: 0 0 10px rgba(255, 0, 128, 0.1);`}
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ModalBox = styled.div`
  background: ${COLORS.surface};
  border: 1px solid ${COLORS.border};
  padding: 40px;
  width: 380px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const ErrorText = styled.span`
  font-family: 'Share Tech Mono', monospace;
  font-size: 11px;
  color: ${COLORS.magenta};
  letter-spacing: 0.1em;
`;

const BacklogToolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  row-gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 24px;
`;

const ToolbarDivider = styled.div`
  flex: 1;
  min-width: 24px;
  height: 1px;
  background: linear-gradient(90deg, ${COLORS.border}, transparent);
  @media (max-width: 768px) { display: none; }
`;

const FilterSelect = styled.select`
  background: ${COLORS.elevated};
  border: 1px solid ${COLORS.border};
  color: ${COLORS.secondary};
  font-family: 'Share Tech Mono', monospace;
  font-size: 11px;
  padding: 5px 8px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  &:focus { outline: none; border-color: ${COLORS.purple}; }
`;

const MiniTag = styled.span<{ color: string }>`
  font-family: 'Share Tech Mono', monospace;
  font-size: 9px;
  color: ${p => p.color};
  border: 1px solid ${p => p.color};
  padding: 1px 5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
`;

const STATUS_COLOR: Record<string, string> = {
  draft: COLORS.yellow,
  ready: COLORS.cyan,
  estimated: COLORS.lime,
};

const NO_EPIC = '(no epic)';

const EMPTY_FORM: FormData = { asA: '', iWant: '', soThat: '' };

const StoryTool: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);

  const [criteria, setCriteria] = useState<string[]>([]);
  const [newCriterion, setNewCriterion] = useState('');
  const [backlog, setBacklog] = useState<Story[]>(loadBacklog);
  const [generated, setGenerated] = useState(false);
  const [copyLabel, setCopyLabel] = useState('copy draft ⎘');
  const [importMsg, setImportMsg] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({
    asA: '', iWant: '', soThat: '', criteria: [] as string[],
    points: '', epic: '', feature: '',
  });
  const [newEditCriterion, setNewEditCriterion] = useState('');
  const [epicFilter, setEpicFilter] = useState('all');

  // Shared-backlog state: null = local-only (default). When set, the backlog
  // is a server room synced over the socket. A ref mirrors it for use inside
  // socket callbacks and the commit path.
  const [sharedCode, setSharedCode] = useState<string | null>(null);
  const sharedCodeRef = useRef<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  // Poker launch modal state
  const [showPokerModal, setShowPokerModal] = useState(false);
  const [pokerUsername, setPokerUsername] = useState('');
  const [pokerError, setPokerError] = useState('');

  useEffect(() => {
    const socket = io(window.location.origin);
    socketRef.current = socket;
    // Shared backlog updates arrive here; ignore if we've since gone local.
    socket.on('backlog:state', ({ stories }: { stories: Story[] }) => {
      if (sharedCodeRef.current) setBacklog(stories);
    });

    // Auto-connect: ?backlog=CODE in the URL wins, else a previously active
    // shared backlog reconnects so a refresh stays in the shared room.
    const urlCode = new URLSearchParams(window.location.search).get('backlog');
    const resume = (urlCode || getActiveSharedBacklog() || '').toUpperCase();
    if (resume) connectShared(resume, false);

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Single write path: in shared mode emit to the room (server echoes state
  // back); in local mode set state and persist to localStorage.
  const commitBacklog = (next: Story[]) => {
    if (sharedCodeRef.current) {
      setBacklog(next); // optimistic; server echo reconciles
      socketRef.current?.emit('backlog:replace', { roomId: sharedCodeRef.current, stories: next });
    } else {
      setBacklog(next);
      saveBacklog(next);
    }
  };

  const connectShared = (code: string, seedFromLocal: boolean) => {
    const room = code.trim().toUpperCase();
    if (!room) return;
    const seed = seedFromLocal ? loadBacklog() : [];
    sharedCodeRef.current = room;
    setSharedCode(room);
    setActiveSharedBacklog(room);
    socketRef.current?.emit('backlog:join', { roomId: room }, () => {
      if (seed.length > 0) socketRef.current?.emit('backlog:upsert', { roomId: room, stories: seed });
    });
    const url = new URL(window.location.href);
    url.searchParams.set('backlog', room);
    window.history.replaceState(null, '', url.toString());
  };

  const disconnectShared = () => {
    sharedCodeRef.current = null;
    setSharedCode(null);
    setActiveSharedBacklog(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('backlog');
    window.history.replaceState(null, '', url.toString());
    setBacklog(loadBacklog()); // fall back to this browser's local backlog
  };

  const startShare = () => connectShared(Math.random().toString(36).substring(2, 8).toUpperCase(), true);

  const handleJoinShared = () => {
    const code = window.prompt('Enter the shared backlog code to join:')?.trim().toUpperCase();
    if (code) connectShared(code, false);
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const handleGenerate = () => {
    setGenerated(true);
  };

  const addCriterion = () => {
    const text = newCriterion.trim();
    if (!text) return;
    setCriteria([...criteria, text]);
    setNewCriterion('');
  };

  const addToBacklog = () => {
    const newStory: Story = {
      id: newId(),
      title: storyTitle(formData.asA, formData.iWant),
      asA: formData.asA,
      iWant: formData.iWant,
      soThat: formData.soThat,
      criteria: [...criteria],
    };
    commitBacklog([...backlog, newStory]);
    setGenerated(false);
    setCriteria([]);
    setFormData(EMPTY_FORM);
  };

  const handleLaunchPoker = () => {
    if (backlog.length === 0) return;
    setShowPokerModal(true);
    setPokerUsername('');
    setPokerError('');
  };

  const handleConfirmPoker = () => {
    const trimUser = pokerUsername.trim();
    if (!trimUser) { setPokerError('Username is required'); return; }
    setPokerError('');
    setShowPokerModal(false);
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    socketRef.current?.emit('poker:updateBacklog', { roomId: newCode, backlog });
    // Carry the shared-backlog code so poker can sync accepted points back to
    // it cross-device (local backlogs sync via localStorage instead).
    const backlogParam = sharedCodeRef.current ? `&backlog=${sharedCodeRef.current}` : '';
    navigate(`/poker?room=${newCode}&user=${encodeURIComponent(trimUser)}${backlogParam}`);
  };

  const isIncomplete = (s: Story) => !s.asA.trim() || !s.iWant.trim() || !s.soThat.trim();

  const startEdit = (item: Story) => {
    setEditingId(item.id);
    setEditDraft({
      asA: item.asA,
      iWant: item.iWant,
      soThat: item.soThat,
      criteria: [...(item.criteria ?? [])],
      points: item.points !== undefined ? String(item.points) : '',
      epic: item.epic ?? '',
      feature: item.feature ?? '',
    });
    setNewEditCriterion('');
  };

  const addEditCriterion = () => {
    const text = newEditCriterion.trim();
    if (!text) return;
    setEditDraft(d => ({ ...d, criteria: [...d.criteria, text] }));
    setNewEditCriterion('');
  };

  const saveEdit = (id: string) => {
    const pts = parseFloat(editDraft.points);
    commitBacklog(backlog.map(s => s.id !== id ? s : {
      ...s,
      asA: editDraft.asA,
      iWant: editDraft.iWant,
      soThat: editDraft.soThat,
      criteria: editDraft.criteria,
      title: storyTitle(editDraft.asA, editDraft.iWant),
      points: isNaN(pts) ? undefined : pts,
      epic: editDraft.epic.trim() || undefined,
      feature: editDraft.feature.trim() || undefined,
    }));
    setEditingId(null);
  };

  const moveStory = (id: string, dir: -1 | 1) => {
    const i = backlog.findIndex(s => s.id === id);
    const j = i + dir;
    if (i === -1 || j < 0 || j >= backlog.length) return;
    const next = [...backlog];
    [next[i], next[j]] = [next[j], next[i]];
    commitBacklog(next);
  };

  const handleClearAll = () => {
    commitBacklog([]);
    setCriteria([]);
    setFormData(EMPTY_FORM);
    setGenerated(false);
    setConfirmClear(false);
  };

  const showImportMsg = (msg: string) => {
    setImportMsg(msg);
    setTimeout(() => setImportMsg(''), 3000);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = (evt.target?.result as string) ?? '';
      const isJSON = file.name.toLowerCase().endsWith('.json') || /^\s*[[{]/.test(text);
      const stories = isJSON ? parseStoriesFromJSON(text) : parseStoriesFromCSV(text);
      if (stories.length === 0) {
        showImportMsg('no stories found in file');
        return;
      }
      commitBacklog(mergeStoriesById(backlog, stories));
      showImportMsg(`imported ${stories.length} ${stories.length === 1 ? 'story' : 'stories'}`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCopy = () => {
    if (!formData.asA && !formData.iWant && !formData.soThat) return;
    const text = [
      'User Story:',
      `AS A: ${formData.asA}`,
      `I WANT TO: ${formData.iWant}`,
      `SO THAT: ${formData.soThat}`,
      '',
      'Acceptance Criteria:',
      ...criteria.map(c => `- ${c}`),
    ].join('\n');
    navigator.clipboard.writeText(text);
    setCopyLabel('copied!');
    setTimeout(() => setCopyLabel('copy draft ⎘'), 2000);
  };

  const totalPoints = backlog.reduce((sum, s) => sum + (s.points ?? 0), 0);
  const epics = [...new Set(backlog.map(s => s.epic ?? NO_EPIC))];
  const hasEpics = epics.some(e => e !== NO_EPIC);
  const filtering = epicFilter !== 'all';
  const visibleBacklog = filtering ? backlog.filter(s => (s.epic ?? NO_EPIC) === epicFilter) : backlog;

  return (
    <ToolShell toolName="Story Generator" toolColor={COLORS.purple} activeNav="stories" onBack={onBack} local={!sharedCode}>
      <StoryContainer>
        <InputPanel>
          <Label color={COLORS.purple} size={14}>story inputs</Label>

          <FormGroup>
            <Label as="label" htmlFor="story-as-a">as a...</Label>
            <Input
              id="story-as-a"
              value={formData.asA}
              onChange={e => setFormData({ ...formData, asA: e.target.value })}
              placeholder="type of user"
              aria-label="As a — type of user"
            />
          </FormGroup>

          <FormGroup>
            <Label as="label" htmlFor="story-i-want">i want to...</Label>
            <TextArea
              id="story-i-want"
              value={formData.iWant}
              onChange={e => setFormData({ ...formData, iWant: e.target.value })}
              placeholder="goal or action"
              aria-label="I want to — goal or action"
            />
          </FormGroup>

          <FormGroup>
            <Label as="label" htmlFor="story-so-that">so that...</Label>
            <TextArea
              id="story-so-that"
              value={formData.soThat}
              onChange={e => setFormData({ ...formData, soThat: e.target.value })}
              placeholder="benefit or outcome"
              aria-label="So that — benefit or outcome"
            />
          </FormGroup>

          <FormGroup>
            <Label>acceptance criteria</Label>
            <div style={{ display: 'flex', gap: 10 }}>
              <Input
                style={{ flex: 1 }}
                value={newCriterion}
                onChange={e => setNewCriterion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCriterion()}
                placeholder="New criterion..."
                aria-label="New acceptance criterion"
              />
              <Btn onClick={addCriterion} style={{ padding: '0 24px' }} aria-label="Add criterion">+</Btn>
            </div>
            {criteria.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: COLORS.purple, fontSize: 12 }} aria-hidden="true">•</span>
                <span className="wf-mono" style={{ fontSize: 12, color: COLORS.secondary, flex: 1 }}>{c}</span>
                <Btn
                  onClick={() => setCriteria(criteria.filter((_, j) => j !== i))}
                  style={{ fontSize: 10, padding: '2px 8px' }}
                  aria-label={`Remove criterion: ${c}`}
                >
                  ✕
                </Btn>
              </div>
            ))}
          </FormGroup>

          <div style={{ marginTop: 'auto', display: 'flex', gap: 12, flexDirection: 'column' }}>
            <Btn
              primary
              onClick={handleGenerate}
              style={{ width: '100%', borderColor: COLORS.purple, color: COLORS.purple, background: 'rgba(184, 41, 255, 0.08)', padding: '16px', fontSize: 14, justifyContent: 'center' }}
              aria-label="Preview story"
            >
              ✦ preview story
            </Btn>
            <Btn
              onClick={handleLaunchPoker}
              disabled={backlog.length === 0}
              style={{ width: '100%', borderColor: COLORS.cyan, color: backlog.length === 0 ? COLORS.muted : COLORS.cyan, background: 'rgba(0, 245, 255, 0.08)', padding: '16px', fontSize: 14, justifyContent: 'center', opacity: backlog.length === 0 ? 0.5 : 1 }}
              aria-label={backlog.length === 0 ? 'Add stories to backlog before launching poker' : 'Start planning poker with current backlog'}
            >
              ↑ start poker with backlog
            </Btn>
          </div>
        </InputPanel>

        <OutputPanel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            {sharedCode ? (
              <>
                <MiniTag color={COLORS.lime}>shared</MiniTag>
                <span className="wf-mono" style={{ fontSize: 12, color: COLORS.secondary }}>
                  room <b style={{ color: COLORS.lime }}>{sharedCode}</b> — synced across everyone with the link
                </span>
                <Btn onClick={handleCopyShareLink} style={{ fontSize: 10, padding: '4px 12px' }} aria-label="Copy shared backlog link">
                  {shareCopied ? 'copied!' : 'copy link'}
                </Btn>
                <Btn onClick={disconnectShared} style={{ fontSize: 10, padding: '4px 12px' }} aria-label="Leave shared backlog and switch to local">
                  switch to local
                </Btn>
              </>
            ) : (
              <>
                <MiniTag color={COLORS.muted}>local</MiniTag>
                <span className="wf-mono" style={{ fontSize: 12, color: COLORS.muted }}>
                  stored in this browser only
                </span>
                <Btn onClick={startShare} style={{ fontSize: 10, padding: '4px 12px', borderColor: COLORS.lime, color: COLORS.lime }} aria-label="Share this backlog with a room code">
                  ⇄ share backlog
                </Btn>
                <Btn onClick={handleJoinShared} style={{ fontSize: 10, padding: '4px 12px' }} aria-label="Join an existing shared backlog by code">
                  join shared
                </Btn>
              </>
            )}
          </div>
          <BacklogToolbar>
            <Label color={COLORS.purple} size={14}>
              current backlog ({backlog.length}{totalPoints > 0 ? ` · ${totalPoints} pts` : ''})
            </Label>
            <ToolbarDivider />
            {hasEpics && (
              <FilterSelect
                value={epicFilter}
                onChange={e => setEpicFilter(e.target.value)}
                aria-label="Filter backlog by epic"
              >
                <option value="all">all epics</option>
                {epics.map(e => <option key={e} value={e}>{e}</option>)}
              </FilterSelect>
            )}
            {importMsg && (
              <span className="wf-mono" role="status" style={{ fontSize: 10, color: COLORS.lime }}>{importMsg}</span>
            )}
            <Btn style={{ fontSize: 11, padding: '6px 16px' }} onClick={handleCopy} aria-label="Copy current story draft to clipboard">
              {copyLabel}
            </Btn>
            <input
              ref={importInputRef}
              type="file"
              accept=".csv,.json"
              style={{ display: 'none' }}
              onChange={handleImportFile}
              aria-hidden="true"
            />
            <Btn
              onClick={() => importInputRef.current?.click()}
              style={{ fontSize: 11, padding: '6px 16px' }}
              aria-label="Import stories from CSV or JSON file"
            >
              import ↑
            </Btn>
            <ExportMenu
              stories={backlog}
              filePrefix="backlog"
              disabled={backlog.length === 0}
              buttonStyle={{ fontSize: 11, padding: '6px 16px' }}
            />
            {confirmClear ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="wf-mono" style={{ fontSize: 10, color: COLORS.magenta }}>clear all?</span>
                <Btn
                  onClick={handleClearAll}
                  style={{ fontSize: 11, padding: '6px 12px', borderColor: COLORS.magenta, color: COLORS.magenta }}
                  aria-label="Confirm clear all stories"
                >
                  yes
                </Btn>
                <Btn
                  onClick={() => setConfirmClear(false)}
                  style={{ fontSize: 11, padding: '6px 12px' }}
                  aria-label="Cancel clear all"
                >
                  no
                </Btn>
              </div>
            ) : (
              <Btn
                onClick={() => setConfirmClear(true)}
                disabled={backlog.length === 0}
                style={{ fontSize: 11, padding: '6px 16px', opacity: backlog.length === 0 ? 0.4 : 1 }}
                aria-label="Clear all stories from backlog"
              >
                clear all
              </Btn>
            )}
          </BacklogToolbar>

          <StoryCard>
            <CornerBracket color={COLORS.purple} style={{ top: 0, left: 0 }} size={16} />
            <CornerBracket color={COLORS.purple} style={{ bottom: 0, right: 0, transform: 'rotate(180deg)' }} size={16} />

            {generated ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
                <StoryBody>
                  <StoryLine>
                    <span className="wf-mono" style={{ color: COLORS.purple, fontSize: 14, minWidth: 80 }}>AS A</span>
                    <span className="wf-body">{formData.asA || '—'}</span>
                  </StoryLine>
                  <StoryLine>
                    <span className="wf-mono" style={{ color: COLORS.purple, fontSize: 14, minWidth: 80 }}>I WANT</span>
                    <span className="wf-body">{formData.iWant || '—'}</span>
                  </StoryLine>
                  <StoryLine>
                    <span className="wf-mono" style={{ color: COLORS.purple, fontSize: 14, minWidth: 80 }}>SO THAT</span>
                    <span className="wf-body">{formData.soThat || '—'}</span>
                  </StoryLine>
                </StoryBody>

                {criteria.length > 0 && (
                  <>
                    <Label style={{ display: 'block', marginBottom: 16, fontSize: 13 }}>acceptance criteria</Label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                      {criteria.map((c, i) => (
                        <div key={i} style={{ display: 'flex', gap: 12, fontSize: 16 }}>
                          <span style={{ color: COLORS.purple }} aria-hidden="true">•</span>
                          <span className="wf-body">{c}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', gap: 12, marginTop: 'auto', paddingTop: 16 }}>
                  <Btn
                    primary
                    onClick={addToBacklog}
                    style={{ flex: 1, padding: '16px', justifyContent: 'center' }}
                    aria-label="Add this story to the backlog"
                  >
                    Add to Backlog +
                  </Btn>
                  <Btn
                    onClick={() => setGenerated(false)}
                    style={{ padding: '16px 20px' }}
                    aria-label="Go back to editing"
                  >
                    ← edit
                  </Btn>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Label style={{ marginBottom: 16 }}>Backlog Items</Label>
                {backlog.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Label style={{ color: COLORS.muted, fontSize: 16 }}>No stories in backlog yet</Label>
                  </div>
                ) : visibleBacklog.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Label style={{ color: COLORS.muted, fontSize: 14 }}>No stories match this epic</Label>
                  </div>
                ) : (
                  <BacklogList role="list" aria-label="Story backlog">
                    {visibleBacklog.map((item) => {
                      const num = backlog.indexOf(item) + 1;
                      const incomplete = isIncomplete(item);
                      const editing = editingId === item.id;
                      return (
                        <BacklogItem key={item.id} role="listitem" incomplete={incomplete}>
                          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 8, marginBottom: 4, gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span className="wf-mono" style={{ fontSize: 12, color: COLORS.purple }}>STORY #{num}</span>
                              {item.points !== undefined && <MiniTag color={COLORS.lime}>{item.points} pts</MiniTag>}
                              {item.status && <MiniTag color={STATUS_COLOR[item.status] ?? COLORS.muted}>{item.status}</MiniTag>}
                              {(item.criteria?.length ?? 0) > 0 && <MiniTag color={COLORS.muted}>{item.criteria.length} ac</MiniTag>}
                              {incomplete && <MiniTag color={COLORS.magenta}>INCOMPLETE</MiniTag>}
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                              {!editing && !filtering && (
                                <>
                                  <Btn onClick={() => moveStory(item.id, -1)} disabled={num === 1} style={{ fontSize: 10, padding: '4px 7px', opacity: num === 1 ? 0.35 : 1 }} aria-label={`Move story ${num} up`}>▲</Btn>
                                  <Btn onClick={() => moveStory(item.id, 1)} disabled={num === backlog.length} style={{ fontSize: 10, padding: '4px 7px', opacity: num === backlog.length ? 0.35 : 1 }} aria-label={`Move story ${num} down`}>▼</Btn>
                                </>
                              )}
                              {!editing && (
                                <Btn onClick={() => startEdit(item)} style={{ fontSize: 10, padding: '4px 8px' }} aria-label={`Edit story ${num}`}>edit</Btn>
                              )}
                              <Btn onClick={() => commitBacklog(backlog.filter(b => b.id !== item.id))} style={{ fontSize: 10, padding: '4px 8px' }} aria-label={`Remove story ${num}`}>remove</Btn>
                            </div>
                          </div>

                          {(item.epic || item.feature) && (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {item.epic && <span className="wf-mono" style={{ fontSize: 10, color: COLORS.magenta, border: `1px solid ${COLORS.magenta}`, padding: '1px 6px', letterSpacing: '0.1em' }}>{item.epic}</span>}
                              {item.feature && <span className="wf-mono" style={{ fontSize: 10, color: COLORS.cyan, border: `1px solid ${COLORS.cyan}`, padding: '1px 6px', letterSpacing: '0.1em' }}>{item.feature}</span>}
                            </div>
                          )}

                          {editing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <div>
                                <Label style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>AS A</Label>
                                <TextArea height={36} value={editDraft.asA} onChange={e => setEditDraft({ ...editDraft, asA: e.target.value })} aria-label="Edit as a" />
                              </div>
                              <div>
                                <Label style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>I WANT TO</Label>
                                <TextArea value={editDraft.iWant} onChange={e => setEditDraft({ ...editDraft, iWant: e.target.value })} aria-label="Edit i want to" />
                              </div>
                              <div>
                                <Label style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>SO THAT</Label>
                                <TextArea value={editDraft.soThat} onChange={e => setEditDraft({ ...editDraft, soThat: e.target.value })} aria-label="Edit so that" />
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <div style={{ width: 70 }}>
                                  <Label style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>POINTS</Label>
                                  <Input style={{ width: '100%', height: 32, fontSize: 12, padding: '0 8px' }} value={editDraft.points} onChange={e => setEditDraft({ ...editDraft, points: e.target.value })} placeholder="—" aria-label="Edit story points" />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <Label style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>EPIC</Label>
                                  <Input style={{ width: '100%', height: 32, fontSize: 12 }} value={editDraft.epic} onChange={e => setEditDraft({ ...editDraft, epic: e.target.value })} placeholder="none" aria-label="Edit epic" />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <Label style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>FEATURE</Label>
                                  <Input style={{ width: '100%', height: 32, fontSize: 12 }} value={editDraft.feature} onChange={e => setEditDraft({ ...editDraft, feature: e.target.value })} placeholder="none" aria-label="Edit feature" />
                                </div>
                              </div>
                              <div>
                                <Label style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>ACCEPTANCE CRITERIA</Label>
                                <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                                  <Input
                                    style={{ flex: 1, height: 32, fontSize: 12 }}
                                    value={newEditCriterion}
                                    onChange={e => setNewEditCriterion(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addEditCriterion()}
                                    placeholder="Add criterion..."
                                    aria-label="New criterion"
                                  />
                                  <Btn onClick={addEditCriterion} style={{ padding: '0 12px', fontSize: 14 }} aria-label="Add criterion">+</Btn>
                                </div>
                                {editDraft.criteria.map((c, ci) => (
                                  <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <span style={{ color: COLORS.purple, fontSize: 11 }}>•</span>
                                    <span className="wf-mono" style={{ fontSize: 11, color: COLORS.secondary, flex: 1 }}>{c}</span>
                                    <Btn
                                      onClick={() => setEditDraft(d => ({ ...d, criteria: d.criteria.filter((_, j) => j !== ci) }))}
                                      style={{ fontSize: 9, padding: '2px 6px' }}
                                      aria-label={`Remove criterion: ${c}`}
                                    >✕</Btn>
                                  </div>
                                ))}
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <Btn primary onClick={() => saveEdit(item.id)} style={{ flex: 1, justifyContent: 'center', fontSize: 11, padding: '8px' }} aria-label="Save edits">save</Btn>
                                <Btn onClick={() => setEditingId(null)} style={{ fontSize: 11, padding: '8px 14px' }} aria-label="Cancel edit">cancel</Btn>
                              </div>
                            </div>
                          ) : (
                            <div className="wf-body" style={{ fontSize: 13, lineHeight: 1.5, width: '100%' }}>
                              <span style={{ color: COLORS.muted }}>AS A</span>{' '}
                              {item.asA || <span style={{ color: COLORS.magenta }}>—</span>}<br />
                              <span style={{ color: COLORS.muted }}>I WANT TO</span>{' '}
                              {item.iWant || <span style={{ color: COLORS.magenta }}>—</span>}<br />
                              <span style={{ color: COLORS.muted }}>SO THAT</span>{' '}
                              {item.soThat || <span style={{ color: COLORS.magenta }}>—</span>}
                            </div>
                          )}
                        </BacklogItem>
                      );
                    })}
                  </BacklogList>
                )}
              </div>
            )}
          </StoryCard>
        </OutputPanel>
      </StoryContainer>

      {showPokerModal && (
        <ModalOverlay role="dialog" aria-modal="true" aria-label="Start poker session">
          <ModalBox>
            <Label color={COLORS.cyan} size={14}>start poker session</Label>
            <div className="wf-mono" style={{ fontSize: 12, color: COLORS.muted }}>
              {backlog.length} {backlog.length === 1 ? 'story' : 'stories'} will be pushed to the new room.
            </div>
            <Input
              placeholder="YOUR USERNAME"
              value={pokerUsername}
              onChange={e => setPokerUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConfirmPoker()}
              style={{ fontSize: 16 }}
              aria-label="Your username for the poker session"
              autoFocus
            />
            {pokerError && <ErrorText role="alert">{pokerError}</ErrorText>}
            <div style={{ display: 'flex', gap: 12 }}>
              <Btn
                primary
                onClick={handleConfirmPoker}
                style={{ flex: 1, justifyContent: 'center', padding: '14px' }}
                aria-label="Launch poker session"
              >
                Launch Poker →
              </Btn>
              <Btn
                onClick={() => setShowPokerModal(false)}
                style={{ padding: '14px 20px' }}
                aria-label="Cancel"
              >
                Cancel
              </Btn>
            </div>
          </ModalBox>
        </ModalOverlay>
      )}
    </ToolShell>
  );
};

export default StoryTool;
