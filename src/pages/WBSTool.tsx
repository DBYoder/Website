import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { COLORS } from '../GlobalStyles';
import ToolShell from '../components/ToolShell';
import { Tag, Btn, Label, Box } from '../components/Core';

// --- Types ---
interface WBSNodeData {
  id: string;
  type: 'epic' | 'feature' | 'story';
  title: string;
  createdBy: string;
  parentId: string | null;
  childIds: string[];
  collapsed: boolean;
}

interface WBSSession {
  nodes: Record<string, WBSNodeData>;
  rootIds: string[];
  participants: Record<string, { username: string }>;
  status: 'active' | 'complete';
  createdAt: number;
}

interface ExportedStory {
  id: string;
  title: string;
  asA: string;
  iWant: string;
  soThat: string;
  criteria: string[];
  epic?: string;
  feature?: string;
}

type ConnectionStatus = 'connecting' | 'connected' | 'error';

// --- Constants ---
const NODE_COLOR: Record<WBSNodeData['type'], string> = {
  epic: COLORS.magenta,
  feature: COLORS.cyan,
  story: COLORS.lime,
};

const CHILD_TYPE: Record<WBSNodeData['type'], WBSNodeData['type'] | null> = {
  epic: 'feature',
  feature: 'story',
  story: null,
};

// --- Styled components ---
const Container = styled.div`
  flex: 1;
  display: flex;
  overflow: hidden;
`;

const LeftPanel = styled.div`
  width: 260px;
  border-right: 1px solid ${COLORS.border};
  display: flex;
  flex-direction: column;
  background: ${COLORS.surface};
  flex-shrink: 0;
`;

const TreeArea = styled.div`
  flex: 1;
  padding: 32px;
  overflow-y: auto;
`;

const NodeRow = styled.div<{ indent: number; borderColor: string }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px 9px ${p => p.indent + 14}px;
  border-left: 3px solid ${p => p.borderColor};
  border-top: 1px solid ${COLORS.border};
  border-right: 1px solid ${COLORS.border};
  border-bottom: 1px solid ${COLORS.border};
  background: ${COLORS.card};
  margin-bottom: 4px;
  transition: background 0.15s;
  &:hover { background: ${COLORS.elevated}; }
`;

const NodeBadge = styled.span<{ color: string }>`
  font-family: 'Share Tech Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${p => p.color};
  border: 1px solid ${p => p.color};
  padding: 2px 6px;
  flex-shrink: 0;
`;

const NodeTitle = styled.span<{ clickable?: boolean }>`
  font-family: 'Rajdhani', sans-serif;
  font-size: 16px;
  color: ${COLORS.primary};
  flex: 1;
  cursor: ${p => p.clickable ? 'pointer' : 'default'};
  &:hover { text-decoration: ${p => p.clickable ? 'underline' : 'none'}; }
`;

const NodeEditInput = styled.input`
  flex: 1;
  background: ${COLORS.elevated};
  border: 1px solid ${COLORS.cyan};
  color: ${COLORS.primary};
  padding: 3px 10px;
  font-family: 'Rajdhani', sans-serif;
  font-size: 16px;
  &:focus { outline: none; }
`;

const CollapseBtn = styled.button`
  appearance: none;
  -webkit-appearance: none;
  background: none;
  border: none;
  color: ${COLORS.muted};
  cursor: pointer;
  font-size: 10px;
  padding: 2px 4px;
  width: 18px;
  flex-shrink: 0;
  &:hover { color: ${COLORS.primary}; }
`;

const ActionGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`;

const SmallBtn = styled.button<{ danger?: boolean; accent?: string }>`
  appearance: none;
  -webkit-appearance: none;
  background: none;
  border: 1px solid ${p => p.danger ? COLORS.magenta : p.accent ?? COLORS.borderBright};
  color: ${p => p.danger ? COLORS.magenta : p.accent ?? COLORS.secondary};
  padding: 3px 8px;
  font-family: 'Share Tech Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  white-space: nowrap;
  &:hover {
    border-color: ${p => p.danger ? COLORS.magenta : p.accent ?? COLORS.secondary};
    color: ${p => p.danger ? COLORS.magenta : p.accent ?? COLORS.primary};
  }
`;

const AddRow = styled.div<{ indent: number }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px 6px ${p => p.indent + 14}px;
  margin-bottom: 4px;
`;

const AddInput = styled.input`
  flex: 1;
  background: ${COLORS.elevated};
  border: 1px solid ${COLORS.border};
  color: ${COLORS.primary};
  padding: 6px 12px;
  font-family: 'Rajdhani', sans-serif;
  font-size: 15px;
  &:focus { outline: none; border-color: ${COLORS.cyan}; }
`;

const AddEpicBtn = styled.button`
  appearance: none;
  -webkit-appearance: none;
  background: none;
  width: 100%;
  border: 1px dashed ${COLORS.border};
  padding: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin-top: 8px;
  transition: all 0.2s;
  &:hover {
    border-color: ${COLORS.magenta};
    background: rgba(255, 0, 170, 0.04);
  }
`;

const JoinOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: ${COLORS.bg};
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Input = styled.input`
  background: ${COLORS.elevated};
  border: 1px solid ${COLORS.border};
  color: ${COLORS.primary};
  padding: 12px 16px;
  font-family: 'Share Tech Mono', monospace;
  font-size: 18px;
  width: 100%;
  &:focus { outline: none; border-color: ${COLORS.lime}; }
`;

const ErrorText = styled.span`
  font-family: 'Share Tech Mono', monospace;
  font-size: 11px;
  color: ${COLORS.magenta};
  letter-spacing: 0.1em;
`;

// --- Tree interaction state passed to recursive nodes ---
interface TreeActions {
  username: string;
  sessionStatus: 'active' | 'complete';
  addingChildOf: string | null;
  addingTitle: string;
  editingNodeId: string | null;
  editingTitle: string;
  deletingNodeId: string | null;
  setAddingChildOf: (id: string | null) => void;
  setAddingTitle: (t: string) => void;
  setEditingNodeId: (id: string | null) => void;
  setEditingTitle: (t: string) => void;
  setDeletingNodeId: (id: string | null) => void;
  submitAdd: () => void;
  submitEdit: () => void;
  confirmDelete: () => void;
  onToggle: (nodeId: string) => void;
}

// --- Recursive tree node ---
const TreeNode: React.FC<{
  nodeId: string;
  nodes: Record<string, WBSNodeData>;
  depth: number;
  a: TreeActions;
}> = ({ nodeId, nodes, depth, a }) => {
  const node = nodes[nodeId];
  if (!node) return null;

  const color = NODE_COLOR[node.type];
  const childType = CHILD_TYPE[node.type];
  const isOwner = node.createdBy === a.username;
  const isEditing = a.editingNodeId === nodeId;
  const isDeleting = a.deletingNodeId === nodeId;
  const isAddingHere = a.addingChildOf === nodeId;
  const canCollapse = childType !== null && node.childIds.length > 0;
  const active = a.sessionStatus === 'active';
  const indent = depth * 32;

  return (
    <div>
      <NodeRow indent={indent} borderColor={color}>
        {/* Collapse toggle or spacer */}
        {childType !== null ? (
          <CollapseBtn
            onClick={() => canCollapse && a.onToggle(nodeId)}
            aria-label={node.collapsed ? 'Expand' : 'Collapse'}
            style={{ visibility: canCollapse ? 'visible' : 'hidden' }}
          >
            {node.collapsed ? '▶' : '▼'}
          </CollapseBtn>
        ) : (
          <div style={{ width: 18, flexShrink: 0 }} />
        )}

        <NodeBadge color={color}>{node.type}</NodeBadge>

        {isEditing ? (
          <NodeEditInput
            value={a.editingTitle}
            onChange={e => a.setEditingTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') a.submitEdit();
              if (e.key === 'Escape') { a.setEditingNodeId(null); a.setEditingTitle(''); }
            }}
            onBlur={a.submitEdit}
            autoFocus
            aria-label={`Rename ${node.type}`}
          />
        ) : (
          <NodeTitle
            clickable={isOwner && active}
            onClick={() => {
              if (isOwner && active) {
                a.setEditingNodeId(nodeId);
                a.setEditingTitle(node.title);
              }
            }}
            title={isOwner && active ? 'Click to rename' : undefined}
          >
            {node.title}
          </NodeTitle>
        )}

        <span className="wf-mono" style={{ fontSize: 10, color: COLORS.muted, flexShrink: 0 }}>
          {node.createdBy}
        </span>

        {active && !isEditing && (
          <ActionGroup>
            {isDeleting ? (
              <>
                <span className="wf-mono" style={{ fontSize: 10, color: COLORS.magenta }}>delete?</span>
                <SmallBtn danger onClick={a.confirmDelete}>yes</SmallBtn>
                <SmallBtn onClick={() => a.setDeletingNodeId(null)}>no</SmallBtn>
              </>
            ) : (
              <>
                {isOwner && childType && !isAddingHere && (
                  <SmallBtn
                    accent={NODE_COLOR[childType]}
                    onClick={() => { a.setAddingChildOf(nodeId); a.setAddingTitle(''); }}
                    aria-label={`Add ${childType} under this ${node.type}`}
                  >
                    + {childType}
                  </SmallBtn>
                )}
                {isOwner && (
                  <SmallBtn danger onClick={() => a.setDeletingNodeId(nodeId)} aria-label={`Delete ${node.type}`}>
                    ✕
                  </SmallBtn>
                )}
              </>
            )}
          </ActionGroup>
        )}
      </NodeRow>

      {/* Children */}
      {!node.collapsed && (
        <>
          {node.childIds.map(childId => (
            <TreeNode key={childId} nodeId={childId} nodes={nodes} depth={depth + 1} a={a} />
          ))}

          {isAddingHere && childType && (
            <AddRow indent={indent + 32}>
              <NodeBadge color={NODE_COLOR[childType]}>{childType}</NodeBadge>
              <AddInput
                placeholder={`${childType} title...`}
                value={a.addingTitle}
                onChange={e => a.setAddingTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') a.submitAdd();
                  if (e.key === 'Escape') { a.setAddingChildOf(null); a.setAddingTitle(''); }
                }}
                autoFocus
                aria-label={`New ${childType} title`}
              />
              <SmallBtn onClick={a.submitAdd}>add</SmallBtn>
              <SmallBtn onClick={() => { a.setAddingChildOf(null); a.setAddingTitle(''); }}>✕</SmallBtn>
            </AddRow>
          )}
        </>
      )}
    </div>
  );
};

// --- Main component ---
const WBSTool: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);
  const roomCodeRef = useRef('');

  const [roomCode, setRoomCode] = useState('');
  const [username, setUsername] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [session, setSession] = useState<WBSSession | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [joinError, setJoinError] = useState('');

  const [addingChildOf, setAddingChildOf] = useState<string | null>(null);
  const [addingTitle, setAddingTitle] = useState('');
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deletingNodeId, setDeletingNodeId] = useState<string | null>(null);
  const [confirmDone, setConfirmDone] = useState(false);
  const [exportMsg, setExportMsg] = useState('');

  useEffect(() => { roomCodeRef.current = roomCode; }, [roomCode]);

  useEffect(() => {
    const socket = io(window.location.origin);
    socketRef.current = socket;
    socket.on('connect', () => setConnectionStatus('connected'));
    socket.on('disconnect', () => setConnectionStatus('connecting'));
    socket.on('connect_error', () => setConnectionStatus('error'));
    socket.on('wbs:state', (s: WBSSession) => setSession(s));
    return () => { socket.disconnect(); socketRef.current = null; };
  }, []);

  const handleJoin = () => {
    const trimRoom = roomCode.trim().toUpperCase();
    const trimUser = username.trim();
    if (!trimUser) { setJoinError('Username is required'); return; }
    if (!trimRoom) { setJoinError('Room code is required'); return; }
    setJoinError('');
    setRoomCode(trimRoom);
    socketRef.current?.emit('wbs:join', { roomId: trimRoom, username: trimUser });
    setIsJoined(true);
  };

  const handleStartNew = () => {
    const trimUser = username.trim();
    if (!trimUser) { setJoinError('Username is required'); return; }
    setJoinError('');
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomCode(code);
    socketRef.current?.emit('wbs:join', { roomId: code, username: trimUser });
    setIsJoined(true);
  };

  const submitAdd = () => {
    const title = addingTitle.trim();
    if (!title) return;
    const parentId = addingChildOf === 'root' ? null : addingChildOf;
    const parentNode = parentId ? session?.nodes[parentId] : null;
    const type: WBSNodeData['type'] = parentNode
      ? (CHILD_TYPE[parentNode.type] ?? 'story')
      : 'epic';
    socketRef.current?.emit('wbs:addNode', { roomId: roomCodeRef.current, parentId, type, title, username });
    setAddingChildOf(null);
    setAddingTitle('');
  };

  const submitEdit = () => {
    const title = editingTitle.trim();
    if (title && editingNodeId) {
      socketRef.current?.emit('wbs:renameNode', { roomId: roomCodeRef.current, nodeId: editingNodeId, title, username });
    }
    setEditingNodeId(null);
    setEditingTitle('');
  };

  const confirmDelete = () => {
    if (deletingNodeId) {
      socketRef.current?.emit('wbs:deleteNode', { roomId: roomCodeRef.current, nodeId: deletingNodeId, username });
    }
    setDeletingNodeId(null);
  };

  const onToggle = (nodeId: string) => {
    socketRef.current?.emit('wbs:toggleCollapse', { roomId: roomCodeRef.current, nodeId });
  };

  const handleToggleStatus = () => {
    if (!session) return;
    const next = session.status === 'active' ? 'complete' : 'active';
    socketRef.current?.emit('wbs:setStatus', { roomId: roomCodeRef.current, status: next });
    setConfirmDone(false);
  };

  const handleExport = () => {
    if (!session) return;
    const stories: ExportedStory[] = [];
    for (const epicId of session.rootIds) {
      const epic = session.nodes[epicId];
      if (!epic) continue;
      for (const featureId of epic.childIds) {
        const feature = session.nodes[featureId];
        if (!feature) continue;
        for (const storyId of feature.childIds) {
          const story = session.nodes[storyId];
          if (!story) continue;
          stories.push({
            id: story.id,
            title: story.title,
            asA: '',
            iWant: story.title,
            soThat: '',
            criteria: [],
            epic: epic.title,
            feature: feature.title,
          });
        }
      }
    }
    if (stories.length === 0) {
      setExportMsg('No stories in the tree yet.');
      setTimeout(() => setExportMsg(''), 3000);
      return;
    }
    const existing: ExportedStory[] = JSON.parse(localStorage.getItem('agile-free-backlog') ?? '[]');
    const existingIds = new Set(existing.map(s => s.id));
    const merged = [...existing, ...stories.filter(s => !existingIds.has(s.id))];
    localStorage.setItem('agile-free-backlog', JSON.stringify(merged));
    navigate('/stories');
  };

  const treeActions: TreeActions = {
    username, sessionStatus: session?.status ?? 'active',
    addingChildOf, addingTitle, editingNodeId, editingTitle, deletingNodeId,
    setAddingChildOf, setAddingTitle, setEditingNodeId, setEditingTitle, setDeletingNodeId,
    submitAdd, submitEdit, confirmDelete, onToggle,
  };

  if (!isJoined) {
    return (
      <ToolShell toolName="WBS" toolColor={COLORS.lime} activeNav="wbs" onBack={onBack}>
        <JoinOverlay>
          <Box w={400} style={{ padding: 48, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Label color={COLORS.lime} size={16}>work breakdown structure</Label>
            <Input
              placeholder="USERNAME"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleStartNew()}
              aria-label="Username"
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Btn primary onClick={handleStartNew} style={{ width: '100%', justifyContent: 'center', borderColor: COLORS.lime, color: COLORS.lime, background: 'rgba(170,255,0,0.08)', fontSize: 14, padding: '14px' }}>
                Start New Session +
              </Btn>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '8px 0' }}>
                <div style={{ flex: 1, height: 1, background: COLORS.border }} />
                <span className="wf-mono" style={{ fontSize: 10, color: COLORS.muted }}>OR RESUME EXISTING</span>
                <div style={{ flex: 1, height: 1, background: COLORS.border }} />
              </div>
              <Input
                placeholder="ROOM CODE"
                value={roomCode}
                onChange={e => setRoomCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                aria-label="Room code to resume"
              />
              <Btn onClick={handleJoin} style={{ width: '100%', justifyContent: 'center', fontSize: 14, padding: '14px' }}>
                Resume Session →
              </Btn>
            </div>
            {joinError && <ErrorText role="alert">{joinError}</ErrorText>}
            {connectionStatus === 'error' && <ErrorText role="alert">Cannot connect to server.</ErrorText>}
          </Box>
        </JoinOverlay>
      </ToolShell>
    );
  }

  if (!session) {
    return (
      <ToolShell toolName="WBS" toolColor={COLORS.lime} activeNav="wbs" onBack={onBack}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="wf-mono" style={{ color: COLORS.muted }}>connecting...</span>
        </div>
      </ToolShell>
    );
  }

  const participants = Object.values(session.participants).map(p => p.username);
  const storyCount = Object.values(session.nodes).filter(n => n.type === 'story').length;
  const epicCount = Object.values(session.nodes).filter(n => n.type === 'epic').length;
  const featureCount = Object.values(session.nodes).filter(n => n.type === 'feature').length;
  const isComplete = session.status === 'complete';

  return (
    <ToolShell toolName="WBS" toolColor={COLORS.lime} activeNav="wbs" onBack={onBack}>
      <Container>
        <LeftPanel>
          {/* Session info */}
          <div style={{ padding: '24px', borderBottom: `1px solid ${COLORS.border}` }}>
            <Label color={COLORS.lime} style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
              session: {roomCode}
            </Label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Tag color={isComplete ? COLORS.muted : COLORS.lime}>
                {isComplete ? 'COMPLETE' : 'ACTIVE'}
              </Tag>
              {connectionStatus !== 'connected' && (
                <Tag color={connectionStatus === 'error' ? COLORS.magenta : COLORS.yellow} role="status">
                  {connectionStatus === 'error' ? 'offline' : '...'}
                </Tag>
              )}
            </div>
          </div>

          {/* Participants */}
          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${COLORS.border}` }}>
            <Label style={{ display: 'block', marginBottom: 12 }}>participants</Label>
            {participants.length === 0 ? (
              <span className="wf-mono" style={{ fontSize: 11, color: COLORS.muted }}>none connected</span>
            ) : participants.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 6, height: 6, background: COLORS.lime, borderRadius: '50%', boxShadow: `0 0 4px ${COLORS.lime}` }} />
                <span className="wf-mono" style={{ fontSize: 12, color: p === username ? COLORS.lime : COLORS.secondary }}>{p}</span>
              </div>
            ))}
          </div>

          {/* Structure counts */}
          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${COLORS.border}` }}>
            <Label style={{ display: 'block', marginBottom: 12 }}>structure</Label>
            {([['epic', epicCount], ['feature', featureCount], ['story', storyCount]] as const).map(([type, count]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <NodeBadge color={NODE_COLOR[type]}>{type}</NodeBadge>
                <span className="wf-mono" style={{ fontSize: 13, color: COLORS.secondary }}>{count}</span>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' }}>
            <Btn
              primary
              onClick={handleExport}
              disabled={storyCount === 0}
              style={{ justifyContent: 'center', borderColor: COLORS.lime, color: storyCount === 0 ? COLORS.muted : COLORS.lime, background: 'rgba(170,255,0,0.08)', opacity: storyCount === 0 ? 0.5 : 1 }}
              aria-label={`Export ${storyCount} stories to Story Creator`}
            >
              export to stories ({storyCount}) →
            </Btn>
            {exportMsg && <ErrorText role="status">{exportMsg}</ErrorText>}

            {confirmDone ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span className="wf-mono" style={{ fontSize: 11, color: COLORS.muted }}>
                  {isComplete ? 'reopen this session?' : 'mark as complete?'}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn onClick={handleToggleStatus} style={{ flex: 1, justifyContent: 'center', borderColor: COLORS.lime, color: COLORS.lime, fontSize: 11, padding: '8px' }}>
                    yes
                  </Btn>
                  <Btn onClick={() => setConfirmDone(false)} style={{ flex: 1, justifyContent: 'center', fontSize: 11, padding: '8px' }}>
                    no
                  </Btn>
                </div>
              </div>
            ) : (
              <Btn onClick={() => setConfirmDone(true)} style={{ justifyContent: 'center', fontSize: 12 }}>
                {isComplete ? 'reopen session' : 'mark complete'}
              </Btn>
            )}
          </div>
        </LeftPanel>

        {/* Tree */}
        <TreeArea>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
            <Label color={COLORS.lime} size={14}>work breakdown</Label>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${COLORS.border}, transparent)` }} />
            {isComplete && <Tag color={COLORS.muted}>read only</Tag>}
          </div>

          {session.rootIds.length === 0 && addingChildOf !== 'root' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
              <span className="wf-mono" style={{ fontSize: 13, color: COLORS.muted }}>
                Add an epic to begin the breakdown
              </span>
            </div>
          )}

          {session.rootIds.map(nodeId => (
            <TreeNode key={nodeId} nodeId={nodeId} nodes={session.nodes} depth={0} a={treeActions} />
          ))}

          {/* Add top-level epic */}
          {!isComplete && addingChildOf === 'root' && (
            <AddRow indent={0}>
              <NodeBadge color={NODE_COLOR.epic}>epic</NodeBadge>
              <AddInput
                placeholder="Epic title..."
                value={addingTitle}
                onChange={e => setAddingTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') submitAdd();
                  if (e.key === 'Escape') { setAddingChildOf(null); setAddingTitle(''); }
                }}
                autoFocus
                aria-label="New epic title"
              />
              <SmallBtn onClick={submitAdd}>add</SmallBtn>
              <SmallBtn onClick={() => { setAddingChildOf(null); setAddingTitle(''); }}>✕</SmallBtn>
            </AddRow>
          )}

          {!isComplete && addingChildOf !== 'root' && (
            <AddEpicBtn
              onClick={() => { setAddingChildOf('root'); setAddingTitle(''); }}
              aria-label="Add new top-level epic"
            >
              <span className="wf-mono" style={{ fontSize: 12, color: COLORS.muted }}>+ add epic</span>
            </AddEpicBtn>
          )}
        </TreeArea>
      </Container>
    </ToolShell>
  );
};

export default WBSTool;
