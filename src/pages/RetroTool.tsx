import React, { useState } from 'react';
import styled from 'styled-components';
import { COLORS } from '../GlobalStyles';
import ToolShell from '../components/ToolShell';
import { Tag, Btn, Label } from '../components/Core';

const RetroContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Toolbar = styled.div`
  height: 36px;
  border-bottom: 1px solid ${COLORS.border};
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  background: ${COLORS.surface};
`;

const ColumnsGrid = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0;
  overflow: hidden;
`;

const Column = styled.div<{ last?: boolean }>`
  border-right: ${props => props.last ? 'none' : `1px solid ${COLORS.border}`};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ColumnHeader = styled.div`
  padding: 10px 14px;
  border-bottom: 1px solid ${COLORS.border};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ColumnDot = styled.div<{ color: string }>`
  width: 6px;
  height: 6px;
  background: ${props => props.color};
  box-shadow: 0 0 4px ${props => props.color};
`;

const CardList = styled.div`
  flex: 1;
  padding: 10px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const RetroCard = styled.div`
  background: ${COLORS.card};
  border: 1px solid ${COLORS.border};
  padding: 10px;
  position: relative;
`;

const VoteContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
`;

const VoteBtn = styled.div<{ color: string }>`
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  
  &:hover span {
    color: ${props => props.color};
  }
`;

const AddCardBtn = styled.div`
  border: 1px dashed ${COLORS.border};
  padding: 8px 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  
  &:hover {
    border-color: ${COLORS.borderBright};
    background: rgba(255, 255, 255, 0.02);
  }
`;

interface RetroNote {
  text: string;
  votes: number;
  owner?: string;
}

const RetroTool: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [columns, setColumns] = useState<{
    wentWell: RetroNote[];
    toImprove: RetroNote[];
    actionItems: RetroNote[];
  }>({
    wentWell: [
      { text: "Team communication was great", votes: 4 },
      { text: "Fast turnaround on code reviews", votes: 2 },
      { text: "Successfully deployed v1.0", votes: 1 },
    ],
    toImprove: [
      { text: "Meeting overlap in the mornings", votes: 5 },
      { text: "Requirement ambiguity on tickets", votes: 3 },
      { text: "Late morning standups", votes: 0 },
    ],
    actionItems: [
      { text: "Move standup to 10:00 AM", votes: 0, owner: 'alice' },
      { text: "Document API schema updates", votes: 0, owner: 'bob' },
    ]
  });

  const handleAddNote = (colKey: keyof typeof columns) => {
    const text = prompt("Enter note text:");
    if (text) {
      setColumns({
        ...columns,
        [colKey]: [...columns[colKey], { text, votes: 0 }]
      });
    }
  };

  const handleVote = (colKey: keyof typeof columns, index: number) => {
    const newCol = [...columns[colKey]];
    newCol[index].votes += 1;
    setColumns({ ...columns, [colKey]: newCol });
  };

  return (
    <ToolShell toolName="Retro Board" toolColor={COLORS.magenta} activeNav="retro" onBack={onBack}>
      <RetroContainer>
        <Toolbar>
          <span className="wf-mono" style={{ fontSize: 9, color: COLORS.magenta }}>Sprint 24 Retrospective</span>
          <div style={{ flex: 1, height: 1, background: COLORS.border }} />
          <Tag color={COLORS.lime}>OPEN</Tag>
          <Btn>timer</Btn>
          <Btn primary onClick={() => handleAddNote('wentWell')} style={{ borderColor: COLORS.magenta, color: COLORS.magenta, background: 'rgba(255,0,170,0.08)' }}>+ add note</Btn>
        </Toolbar>

        <ColumnsGrid>
          {(['wentWell', 'toImprove', 'actionItems'] as const).map((key, ci) => {
            const config = {
              wentWell: { title: 'Went Well', color: COLORS.lime },
              toImprove: { title: 'To Improve', color: COLORS.yellow },
              actionItems: { title: 'Action Items', color: COLORS.cyan }
            }[key];
            
            return (
              <Column key={key} last={ci === 2}>
                <ColumnHeader>
                  <ColumnDot color={config.color} />
                  <span className="wf-mono" style={{ fontSize: 10, color: config.color, flex: 1 }}>{config.title}</span>
                  <Label style={{ fontSize: 8 }}>{columns[key].length}</Label>
                </ColumnHeader>
                <CardList>
                  {columns[key].map((note, i) => (
                    <RetroCard key={i}>
                      <div className="wf-body" style={{ fontSize: 11, color: COLORS.primary, marginBottom: 6 }}>{note.text}</div>
                      <VoteContainer>
                        {note.owner ? (
                          <span className="wf-mono" style={{ fontSize: 7, color: config.color }}>→ {note.owner}</span>
                        ) : (
                          <div />
                        )}
                        <VoteBtn color={config.color} onClick={() => handleVote(key, i)}>
                          <span style={{ fontSize: 8, color: config.color }}>▲</span>
                          <span className="wf-mono" style={{ fontSize: 8, color: note.votes > 0 ? config.color : COLORS.muted }}>{note.votes}</span>
                        </VoteBtn>
                      </VoteContainer>
                    </RetroCard>
                  ))}
                  <AddCardBtn onClick={() => handleAddNote(key)}>
                    <span className="wf-mono" style={{ fontSize: 9, color: COLORS.muted }}>+ add card</span>
                  </AddCardBtn>
                </CardList>
              </Column>
            );
          })}
        </ColumnsGrid>
      </RetroContainer>
    </ToolShell>
  );
};

export default RetroTool;
