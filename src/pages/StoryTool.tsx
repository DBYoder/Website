import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { COLORS } from '../GlobalStyles';
import ToolShell from '../components/ToolShell';
import { Btn, Label, CornerBracket } from '../components/Core';

// --- Types ---
interface Story {
  id: string;
  title: string;
  asA: string;
  iWant: string;
  soThat: string;
  criteria: string[];
  points?: string;
}

interface FormData {
  asA: string;
  iWant: string;
  soThat: string;
  priority: string;
  points: string;
}

// --- Styles ---
const StoryContainer = styled.div`
  flex: 1;
  display: flex;
  overflow: hidden;
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
`;

const OutputPanel = styled.div`
  flex: 1;
  padding: 32px 48px;
  display: flex;
  flex-direction: column;
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
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 200px;
  overflow-y: auto;
`;

const BacklogItem = styled.div`
  padding: 12px;
  background: ${COLORS.elevated};
  border: 1px solid ${COLORS.border};
  display: flex;
  flex-direction: column;
  gap: 8px;
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

const STORAGE_KEY = 'agile-free-backlog';

const StoryTool: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);

  const [formData, setFormData] = useState<FormData>({
    asA: '',
    iWant: '',
    soThat: '',
    priority: 'Medium',
    points: '3'
  });

  const [criteria, setCriteria] = useState<string[]>([]);
  const [newCriterion, setNewCriterion] = useState('');
  const [backlog, setBacklog] = useState<Story[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    } catch {
      return [];
    }
  });
  const [generated, setGenerated] = useState(false);
  const [copyLabel, setCopyLabel] = useState('copy draft ⎘');

  // Poker launch modal state
  const [showPokerModal, setShowPokerModal] = useState(false);
  const [pokerUsername, setPokerUsername] = useState('');
  const [pokerError, setPokerError] = useState('');

  // Persist backlog to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(backlog));
  }, [backlog]);

  useEffect(() => {
    const socket = io(window.location.origin);
    socketRef.current = socket;
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

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
      title: `${formData.asA}: ${formData.iWant.slice(0, 30)}${formData.iWant.length > 30 ? '...' : ''}`,
      asA: formData.asA,
      iWant: formData.iWant,
      soThat: formData.soThat,
      criteria: [...criteria],
      id: Math.random().toString(36).substr(2, 9)
    };
    setBacklog(prev => [...prev, newStory]);
    setGenerated(false);
    setCriteria([]);
    setFormData({ asA: '', iWant: '', soThat: '', priority: 'Medium', points: '3' });
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
    navigate(`/poker?room=${newCode}&user=${encodeURIComponent(trimUser)}`);
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

  return (
    <ToolShell toolName="Story Generator" toolColor={COLORS.purple} activeNav="stories" onBack={onBack}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <Label color={COLORS.purple} size={14}>current backlog ({backlog.length})</Label>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${COLORS.border}, transparent)` }} />
            <Btn style={{ fontSize: 11, padding: '6px 16px' }} onClick={handleCopy} aria-label="Copy current story draft to clipboard">
              {copyLabel}
            </Btn>
          </div>

          <StoryCard>
            <CornerBracket color={COLORS.purple} style={{ top: 0, left: 0 }} size={16} />
            <CornerBracket color={COLORS.purple} style={{ bottom: 0, right: 0, transform: 'rotate(180deg)' }} size={16} />

            {generated ? (
              <>
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

                <div style={{ display: 'flex', gap: 12, marginTop: 'auto' }}>
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
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Label style={{ marginBottom: 16 }}>Backlog Items</Label>
                {backlog.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Label style={{ color: COLORS.muted, fontSize: 16 }}>No stories in backlog yet</Label>
                  </div>
                ) : (
                  <BacklogList role="list" aria-label="Story backlog">
                    {backlog.map((item, i) => (
                      <BacklogItem key={item.id} role="listitem">
                        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 8, marginBottom: 4 }}>
                          <span className="wf-mono" style={{ fontSize: 12, color: COLORS.purple }}>STORY #{i + 1}</span>
                          <Btn
                            onClick={() => setBacklog(backlog.filter(b => b.id !== item.id))}
                            style={{ fontSize: 10, padding: '4px 8px' }}
                            aria-label={`Remove story ${i + 1}: ${item.title}`}
                          >
                            remove
                          </Btn>
                        </div>
                        <div className="wf-body" style={{ fontSize: 13, lineHeight: 1.4, width: '100%' }}>
                          <span style={{ color: COLORS.muted }}>AS A</span> {item.asA}<br />
                          <span style={{ color: COLORS.muted }}>I WANT TO</span> {item.iWant}<br />
                          <span style={{ color: COLORS.muted }}>SO THAT</span> {item.soThat}
                        </div>
                      </BacklogItem>
                    ))}
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
