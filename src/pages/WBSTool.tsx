import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { COLORS } from '../GlobalStyles';
import ToolShell from '../components/ToolShell';
import { Tag, Btn, Label, Box } from '../components/Core';
import { Story, loadBacklog, saveBacklog, mergeStoriesById } from '../lib/story';
import { getSavedUsername, saveUsername, getRecentRooms, addRecentRoom, getActiveSharedBacklog } from '../lib/session';

// --- Types ---
interface WBSNodeData {
  id: string;
  type: 'epic' | 'feature' | 'story';
  title: string;
  createdBy: string;
  parentId: string | null;
  childIds: string[];
  collapsed: boolean;
  asA?: string;
  iWant?: string;
  soThat?: string;
  criteria?: string[];
}

interface WBSSession {
  nodes: Record<string, WBSNodeData>;
  rootIds: string[];
  participants: Record<string, { username: string }>;
  status: 'active' | 'complete';
  createdAt: number;
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
  @media (max-width: 768px) {
    flex-direction: column;
    overflow: visible;
  }
`;

const LeftPanel = styled.div`
  width: 260px;
  border-right: 1px solid ${COLORS.border};
  display: flex;
  flex-direction: column;
  background: ${COLORS.surface};
  flex-shrink: 0;
  @media (max-width: 768px) {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid ${COLORS.border};
  }
`;

const TreeArea = styled.div`
  flex: 1;
  padding: 32px;
  overflow-y: auto;
  @media (max-width: 768px) {
    padding: 16px;
    overflow: visible;
  }
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
  margin-bottom: 0;
  transition: background 0.15s;
  &:hover { background: ${COLORS.elevated}; }
`;

const DetailRow = styled.div<{ indent: number }>`
  padding: 12px 14px 12px ${p => p.indent + 14}px;
  background: ${COLORS.elevated};
  border-left: 3px solid ${COLORS.lime};
  border-right: 1px solid ${COLORS.border};
  border-bottom: 1px solid ${COLORS.border};
  margin-bottom: 4px;
  display: flex;
  flex-direction: column;
  gap: 8px;
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

const DetailInput = styled.input`
  flex: 1;
  background: ${COLORS.card};
  border: 1px solid ${COLORS.border};
  color: ${COLORS.primary};
  padding: 5px 10px;
  font-family: 'Rajdhani', sans-serif;
  font-size: 14px;
  &:focus { outline: none; border-color: ${COLORS.lime}; }
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
  @media (max-width: 768px) {
    padding: 24px 16px;
    align-items: stretch;
    overflow-y: auto;
    justify-content: flex-start;
    padding-top: 48px;
  }
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

const RecentChip = styled.button`
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  border: 1px solid ${COLORS.border};
  color: ${COLORS.secondary};
  font-family: 'Share Tech Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  padding: 4px 10px;
  cursor: pointer;
  &:hover { border-color: ${COLORS.lime}; color: ${COLORS.lime}; }
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
  detailNodeId: string | null;
  detailAsA: string;
  detailIWant: string;
  detailSoThat: string;
  detailCriteria: string[];
  newDetailCriterion: string;
  setAddingChildOf: (id: string | null) => void;
  setAddingTitle: (t: string) => void;
  setEditingNodeId: (id: string | null) => void;
  setEditingTitle: (t: string) => void;
  setDeletingNodeId: (id: string | null) => void;
  setDetailNodeId: (id: string | null) => void;
  setDetailAsA: (v: string) => void;
  setDetailIWant: (v: string) => void;
  setDetailSoThat: (v: string) => void;
  setDetailCriteria: (v: string[]) => void;
  setNewDetailCriterion: (v: string) => void;
  addDetailCriterion: () => void;
  submitAdd: () => void;
  submitEdit: () => void;
  confirmDelete: () => void;
  submitDetails: () => void;
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
  // Collaborative: any participant can edit while the session is active.
  // createdBy is kept only as an informational "added by" label.
  const canEdit = a.sessionStatus === 'active';
  const isEditing = a.editingNodeId === nodeId;
  const isDeleting = a.deletingNodeId === nodeId;
  const isAddingHere = a.addingChildOf === nodeId;
  const isShowingDetails = a.detailNodeId === nodeId;
  const canCollapse = childType !== null && node.childIds.length > 0;
  const active = a.sessionStatus === 'active';
  const indent = depth * 32;
  const hasDetails = !!(node.asA || node.iWant || node.soThat || node.criteria?.length);

  return (
    <div>
      <NodeRow indent={indent} borderColor={color}>
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
            clickable={canEdit}
            onClick={() => {
              if (canEdit) {
                a.setEditingNodeId(nodeId);
                a.setEditingTitle(node.title);
              }
            }}
            title={canEdit ? 'Click to rename' : undefined}
          >
            {node.title}
          </NodeTitle>
        )}

        {hasDetails && !isEditing && (
          <span className="wf-mono" style={{ fontSize: 9, color: COLORS.lime, border: `1px solid ${COLORS.lime}`, padding: '1px 4px' }}>✓</span>
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
                {node.type === 'story' && (
                  <SmallBtn
                    accent={COLORS.lime}
                    onClick={() => {
                      if (isShowingDetails) {
                        a.setDetailNodeId(null);
                      } else {
                        a.setDetailNodeId(nodeId);
                        a.setDetailAsA(node.asA ?? '');
                        a.setDetailIWant(node.iWant ?? '');
                        a.setDetailSoThat(node.soThat ?? '');
                        a.setDetailCriteria([...(node.criteria ?? [])]);
                        a.setNewDetailCriterion('');
                      }
                    }}
                    aria-label={isShowingDetails ? 'Close details' : 'Edit story details'}
                  >
                    {isShowingDetails ? 'close' : 'details'}
                  </SmallBtn>
                )}
                {childType && !isAddingHere && (
                  <SmallBtn
                    accent={NODE_COLOR[childType]}
                    onClick={() => { a.setAddingChildOf(nodeId); a.setAddingTitle(''); }}
                    aria-label={`Add ${childType} under this ${node.type}`}
                  >
                    + {childType}
                  </SmallBtn>
                )}
                <SmallBtn danger onClick={() => a.setDeletingNodeId(nodeId)} aria-label={`Delete ${node.type}`}>
                  ✕
                </SmallBtn>
              </>
            )}
          </ActionGroup>
        )}
      </NodeRow>

      {/* Story detail form */}
      {isShowingDetails && node.type === 'story' && (
        <DetailRow indent={indent}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="wf-mono" style={{ fontSize: 10, color: COLORS.muted, width: 60, flexShrink: 0 }}>AS A</span>
            <DetailInput
              value={a.detailAsA}
              onChange={e => a.setDetailAsA(e.target.value)}
              placeholder="type of user..."
              aria-label="As a — type of user"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="wf-mono" style={{ fontSize: 10, color: COLORS.muted, width: 60, flexShrink: 0 }}>I WANT</span>
            <DetailInput
              value={a.detailIWant}
              onChange={e => a.setDetailIWant(e.target.value)}
              placeholder={`goal or action (defaults to "${node.title}")`}
              aria-label="I want — goal or action"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="wf-mono" style={{ fontSize: 10, color: COLORS.muted, width: 60, flexShrink: 0 }}>SO THAT</span>
            <DetailInput
              value={a.detailSoThat}
              onChange={e => a.setDetailSoThat(e.target.value)}
              placeholder="benefit or outcome..."
              aria-label="So that — benefit or outcome"
              onKeyDown={e => e.key === 'Enter' && a.submitDetails()}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span className="wf-mono" style={{ fontSize: 10, color: COLORS.muted, width: 60, flexShrink: 0, paddingTop: 8 }}>CRITERIA</span>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <DetailInput
                  value={a.newDetailCriterion}
                  onChange={e => a.setNewDetailCriterion(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && a.addDetailCriterion()}
                  placeholder="acceptance criterion..."
                  aria-label="New acceptance criterion"
                />
                <SmallBtn accent={COLORS.lime} onClick={a.addDetailCriterion} aria-label="Add criterion">+</SmallBtn>
              </div>
              {a.detailCriteria.map((c, ci) => (
                <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: COLORS.lime, fontSize: 11 }} aria-hidden="true">•</span>
                  <span className="wf-mono" style={{ fontSize: 11, color: COLORS.secondary, flex: 1 }}>{c}</span>
                  <SmallBtn
                    onClick={() => a.setDetailCriteria(a.detailCriteria.filter((_, j) => j !== ci))}
                    aria-label={`Remove criterion: ${c}`}
                  >✕</SmallBtn>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <SmallBtn accent={COLORS.lime} onClick={a.submitDetails}>save</SmallBtn>
            <SmallBtn onClick={() => a.setDetailNodeId(null)}>cancel</SmallBtn>
          </div>
        </DetailRow>
      )}

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
  const [username, setUsername] = useState(getSavedUsername);
  const [isJoined, setIsJoined] = useState(false);
  const [session, setSession] = useState<WBSSession | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [joinError, setJoinError] = useState('');
  const [roomNotice, setRoomNotice] = useState('');

  const [addingChildOf, setAddingChildOf] = useState<string | null>(null);
  const [addingTitle, setAddingTitle] = useState('');
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deletingNodeId, setDeletingNodeId] = useState<string | null>(null);
  const [detailNodeId, setDetailNodeId] = useState<string | null>(null);
  const [detailAsA, setDetailAsA] = useState('');
  const [detailIWant, setDetailIWant] = useState('');
  const [detailSoThat, setDetailSoThat] = useState('');
  const [detailCriteria, setDetailCriteria] = useState<string[]>([]);
  const [newDetailCriterion, setNewDetailCriterion] = useState('');
  const [confirmDone, setConfirmDone] = useState(false);
  const [exportMsg, setExportMsg] = useState('');

  useEffect(() => { roomCodeRef.current = roomCode; }, [roomCode]);

  // Pre-fill room code from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRoom = params.get('room');
    if (urlRoom) setRoomCode(urlRoom.toUpperCase());
  }, []);

  useEffect(() => {
    const socket = io(window.location.origin);
    socketRef.current = socket;
    socket.on('connect', () => setConnectionStatus('connected'));
    socket.on('disconnect', () => setConnectionStatus('connecting'));
    socket.on('connect_error', () => setConnectionStatus('error'));
    socket.on('wbs:state', (s: WBSSession) => setSession(s));
    return () => { socket.disconnect(); socketRef.current = null; };
  }, []);

  // Update URL with room code after joining so share link works
  useEffect(() => {
    if (isJoined && roomCode) {
      const url = new URL(window.location.href);
      url.searchParams.set('room', roomCode);
      window.history.replaceState(null, '', url.toString());
    }
  }, [isJoined, roomCode]);

  const handleJoin = (code?: string) => {
    const trimRoom = (code ?? roomCode).trim().toUpperCase();
    const trimUser = username.trim();
    if (!trimUser) { setJoinError('Username is required'); return; }
    if (!trimRoom) { setJoinError('Room code is required'); return; }
    setJoinError('');
    setRoomCode(trimRoom);
    socketRef.current?.emit('wbs:join', { roomId: trimRoom, username: trimUser }, (res: { existed: boolean }) => {
      if (!res?.existed) setRoomNotice('room not found — started a new session');
    });
    saveUsername(trimUser);
    addRecentRoom('wbs', trimRoom);
    setIsJoined(true);
  };

  const handleStartNew = () => {
    const trimUser = username.trim();
    if (!trimUser) { setJoinError('Username is required'); return; }
    setJoinError('');
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomCode(code);
    socketRef.current?.emit('wbs:join', { roomId: code, username: trimUser });
    saveUsername(trimUser);
    addRecentRoom('wbs', code);
    setIsJoined(true);
  };

  const recentRooms = getRecentRooms('wbs');

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

  const addDetailCriterion = () => {
    const text = newDetailCriterion.trim();
    if (!text) return;
    setDetailCriteria(prev => [...prev, text]);
    setNewDetailCriterion('');
  };

  const submitDetails = () => {
    if (detailNodeId) {
      // Include a typed-but-not-added criterion so it isn't silently lost
      const pending = newDetailCriterion.trim();
      const criteria = pending ? [...detailCriteria, pending] : detailCriteria;
      socketRef.current?.emit('wbs:updateStoryDetails', {
        roomId: roomCodeRef.current,
        nodeId: detailNodeId,
        asA: detailAsA,
        iWant: detailIWant,
        soThat: detailSoThat,
        criteria,
        username,
      });
    }
    setDetailNodeId(null);
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
    const stories: Story[] = [];
    // Recursive walk: collects every story node regardless of depth, tagging
    // it with the nearest epic/feature ancestors on the path.
    const visit = (nodeId: string, epicTitle?: string, featureTitle?: string) => {
      const node = session.nodes[nodeId];
      if (!node) return;
      if (node.type === 'story') {
        stories.push({
          id: node.id,
          title: node.title,
          asA: node.asA ?? '',
          iWant: node.iWant?.trim() ? node.iWant : node.title,
          soThat: node.soThat ?? '',
          criteria: node.criteria ?? [],
          ...(epicTitle ? { epic: epicTitle } : {}),
          ...(featureTitle ? { feature: featureTitle } : {}),
        });
        return;
      }
      const nextEpic = node.type === 'epic' ? node.title : epicTitle;
      const nextFeature = node.type === 'feature' ? node.title : featureTitle;
      node.childIds.forEach(childId => visit(childId, nextEpic, nextFeature));
    };
    session.rootIds.forEach(id => visit(id));

    if (stories.length === 0) {
      setExportMsg('No stories in the tree yet.');
      setTimeout(() => setExportMsg(''), 3000);
      return;
    }
    // Target the shared backlog when this browser is connected to one, so the
    // exported stories reach the whole team; otherwise write local.
    const shared = getActiveSharedBacklog();
    if (shared) {
      // Wait for the server to ack the write before navigating — navigating
      // unmounts this tool and disconnects the socket, which would otherwise
      // drop the not-yet-flushed emit. Fall back after a short timeout.
      const go = () => navigate(`/stories?backlog=${shared}`);
      let done = false;
      const finish = () => { if (!done) { done = true; go(); } };
      const timer = setTimeout(finish, 2000);
      socketRef.current?.emit('backlog:upsert', { roomId: shared, stories }, () => {
        clearTimeout(timer);
        finish();
      });
    } else {
      saveBacklog(mergeStoriesById(loadBacklog(), stories));
      navigate('/stories');
    }
  };

  const treeActions: TreeActions = {
    username, sessionStatus: session?.status ?? 'active',
    addingChildOf, addingTitle, editingNodeId, editingTitle, deletingNodeId,
    detailNodeId, detailAsA, detailIWant, detailSoThat, detailCriteria, newDetailCriterion,
    setAddingChildOf, setAddingTitle, setEditingNodeId, setEditingTitle, setDeletingNodeId,
    setDetailNodeId, setDetailAsA, setDetailIWant, setDetailSoThat, setDetailCriteria,
    setNewDetailCriterion, addDetailCriterion,
    submitAdd, submitEdit, confirmDelete, submitDetails, onToggle,
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
              <Btn onClick={() => handleJoin()} style={{ width: '100%', justifyContent: 'center', fontSize: 14, padding: '14px' }}>
                Resume Session →
              </Btn>
              {recentRooms.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <span className="wf-mono" style={{ fontSize: 10, color: COLORS.muted }}>recent:</span>
                  {recentRooms.map(code => (
                    <RecentChip key={code} onClick={() => handleJoin(code)} aria-label={`Resume room ${code}`}>
                      {code}
                    </RecentChip>
                  ))}
                </div>
              )}
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
            {roomNotice && (
              <div style={{ marginTop: 10 }}>
                <Tag color={COLORS.yellow} role="status">{roomNotice}</Tag>
              </div>
            )}
          </div>

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

          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${COLORS.border}` }}>
            <Label style={{ display: 'block', marginBottom: 12 }}>structure</Label>
            {([['epic', epicCount], ['feature', featureCount], ['story', storyCount]] as const).map(([type, count]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <NodeBadge color={NODE_COLOR[type]}>{type}</NodeBadge>
                <span className="wf-mono" style={{ fontSize: 13, color: COLORS.secondary }}>{count}</span>
              </div>
            ))}
          </div>

          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
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
