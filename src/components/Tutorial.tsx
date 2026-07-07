import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { COLORS } from '../GlobalStyles';
import { Btn, Label } from './Core';

interface TutorialStep {
  chapter: string;
  color: string;
  title: string;
  img: string;
  alt: string;
  body: React.ReactNode;
}

const STEPS: TutorialStep[] = [
  {
    chapter: 'overview',
    color: COLORS.cyan,
    title: 'Four tools, one workflow',
    img: '/tutorial/01-overview.png',
    alt: 'The AGILE//FREE landing page showing the four tool cards',
    body: (
      <>
        AGILE//FREE covers a full planning loop: break work down in the <b>WBS</b>,
        develop it into user stories in the <b>Story Generator</b>, estimate it in
        <b> Planning Poker</b>, and improve how you work in the <b>Retro Board</b>.
        Poker, retro, and WBS are realtime rooms — share the room code and teammates
        join instantly. The story backlog is yours: it lives in this browser and can
        be exported or imported at any time.
      </>
    ),
  },
  {
    chapter: 'work breakdown',
    color: COLORS.lime,
    title: 'Break epics into stories together',
    img: '/tutorial/02-wbs.png',
    alt: 'The WBS tree with an epic, a feature, and two stories, one with its details form open',
    body: (
      <>
        Start a session and build the tree: <b>epics → features → stories</b>.
        Everyone in the room adds and edits their own nodes live. Click{' '}
        <b>details</b> on a story to capture <i>as a / i want / so that</i> and
        acceptance criteria while the discussion is fresh. When the breakdown is
        done, <b>export to stories</b> sends every story to your backlog — with its
        epic and feature attached.
      </>
    ),
  },
  {
    chapter: 'story generator',
    color: COLORS.purple,
    title: 'Develop and manage the backlog',
    img: '/tutorial/03-stories.png',
    alt: 'The Story Generator with a draft story on the left and a badged backlog on the right',
    body: (
      <>
        Write stories in the <i>as a / i want / so that</i> format, add acceptance
        criteria, then <b>preview</b> and add to the backlog. Each card shows its
        points, status, and criteria count; use the epic filter, the ▲▼ arrows to
        prioritize, or <b>edit</b> to change anything inline — including points and
        epic. <b>Import</b> merges a CSV or JSON file into the backlog without
        creating duplicates.
      </>
    ),
  },
  {
    chapter: 'planning poker',
    color: COLORS.cyan,
    title: 'Estimate as a team',
    img: '/tutorial/04-poker.png',
    alt: 'A poker room with the backlog on the left and the voting card deck',
    body: (
      <>
        Hit <b>start poker with backlog</b> in the Story Generator and your stories
        arrive in a fresh room — or start an empty room and import a CSV. The
        current story is shown with its full text and criteria so everyone estimates
        the same thing. Pick a card to vote; votes stay hidden and{' '}
        <b>reveal automatically</b> once the last person has voted.
      </>
    ),
  },
  {
    chapter: 'planning poker',
    color: COLORS.cyan,
    title: 'Agree on a number',
    img: '/tutorial/05-poker-results.png',
    alt: 'Poker voting results showing average, consensus, and the accept / re-vote controls',
    body: (
      <>
        The results panel shows the <b>average</b> and the <b>consensus</b> (most
        common vote). Accept the consensus, type a custom value, or hit{' '}
        <b>re-vote</b> after discussing a wide spread. Accepted points are written
        onto the story and — if the backlog lives in this browser — synced back to
        the Story Generator automatically, marked <i>estimated</i>.
      </>
    ),
  },
  {
    chapter: 'retro board',
    color: COLORS.magenta,
    title: 'Reflect, vote, act',
    img: '/tutorial/06-retro.png',
    alt: 'The retro board with cards under went well, to improve, and action items',
    body: (
      <>
        Run the retro in three columns: <b>went well</b>, <b>to improve</b>, and{' '}
        <b>action items</b>, with an optional shared timer. Everyone gets{' '}
        <b>3 votes</b> to prioritize (click a card again to take a vote back). When
        you're done, <b>actions → backlog</b> turns the action items into draft
        stories so improvements actually reach the backlog.
      </>
    ),
  },
  {
    chapter: 'export',
    color: COLORS.purple,
    title: 'Take your stories anywhere',
    img: '/tutorial/07-export.png',
    alt: 'The export menu open on the Story Generator showing CSV, Jira CSV, JSON, and Markdown',
    body: (
      <>
        The <b>export</b> menu writes the backlog as plain <b>CSV</b>, a{' '}
        <b>Jira-importable CSV</b>, lossless <b>JSON</b>, or <b>Markdown</b> with
        checkbox criteria. Exports carry story ids, so a file you re-import later
        updates the same stories instead of duplicating them — edit in a
        spreadsheet, round-trip it back, or hand the Markdown straight to a wiki.
      </>
    ),
  },
];

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 400;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  @media (max-width: 768px) { padding: 10px; }
`;

const Panel = styled.div`
  background: ${COLORS.surface};
  border: 1px solid ${COLORS.borderBright};
  width: min(880px, 100%);
  max-height: 94vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid ${COLORS.border};
`;

const CloseBtn = styled.button`
  appearance: none;
  -webkit-appearance: none;
  background: none;
  border: 1px solid ${COLORS.borderBright};
  color: ${COLORS.secondary};
  width: 30px;
  height: 30px;
  cursor: pointer;
  font-size: 13px;
  flex-shrink: 0;
  &:hover { color: ${COLORS.primary}; border-color: ${COLORS.secondary}; }
`;

const PanelBody = styled.div`
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Screenshot = styled.img`
  width: 100%;
  height: auto;
  display: block;
  border: 1px solid ${COLORS.border};
  background: ${COLORS.bg};
`;

const BodyText = styled.p`
  font-family: 'Rajdhani', sans-serif;
  font-size: 16px;
  line-height: 1.55;
  color: ${COLORS.secondary};
  margin: 0;
  b { color: ${COLORS.primary}; font-weight: 600; }
  i { color: ${COLORS.primary}; }
`;

const PanelFooter = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid ${COLORS.border};
`;

const Dots = styled.div`
  display: flex;
  gap: 8px;
  flex: 1;
  justify-content: center;
`;

const Dot = styled.button<{ active: boolean; color: string }>`
  appearance: none;
  -webkit-appearance: none;
  width: 10px;
  height: 10px;
  padding: 0;
  border: 1px solid ${p => p.active ? p.color : COLORS.borderBright};
  background: ${p => p.active ? p.color : 'transparent'};
  cursor: pointer;
  ${p => p.active && `box-shadow: 0 0 6px ${p.color};`}
`;

const Tutorial: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setStep(p => Math.min(p + 1, STEPS.length - 1));
      if (e.key === 'ArrowLeft') setStep(p => Math.max(p - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Preload the next screenshot so paging forward feels instant
  useEffect(() => {
    if (step < STEPS.length - 1) {
      const img = new Image();
      img.src = STEPS[step + 1].img;
    }
  }, [step]);

  return (
    <Overlay onClick={onClose}>
      <Panel role="dialog" aria-modal="true" aria-label={`Tutorial — step ${step + 1} of ${STEPS.length}: ${s.title}`} onClick={e => e.stopPropagation()}>
        <PanelHeader>
          <Label color={s.color} size={11}>{s.chapter}</Label>
          <span className="wf-title" style={{ fontSize: 18, color: COLORS.primary, letterSpacing: '0.04em', flex: 1 }}>
            {s.title}
          </span>
          <Label size={11}>{step + 1} / {STEPS.length}</Label>
          <CloseBtn onClick={onClose} aria-label="Close tutorial" autoFocus>✕</CloseBtn>
        </PanelHeader>

        <PanelBody>
          <Screenshot src={s.img} alt={s.alt} />
          <BodyText>{s.body}</BodyText>
        </PanelBody>

        <PanelFooter>
          <Btn
            onClick={() => setStep(p => Math.max(p - 1, 0))}
            disabled={step === 0}
            style={{ fontSize: 11, opacity: step === 0 ? 0.4 : 1 }}
            aria-label="Previous step"
          >
            ← back
          </Btn>
          <Dots role="tablist" aria-label="Tutorial steps">
            {STEPS.map((st, i) => (
              <Dot
                key={i}
                active={i === step}
                color={st.color}
                onClick={() => setStep(i)}
                role="tab"
                aria-selected={i === step}
                aria-label={`Step ${i + 1}: ${st.title}`}
              />
            ))}
          </Dots>
          <Btn
            primary
            onClick={() => (last ? onClose() : setStep(p => p + 1))}
            style={{ fontSize: 11 }}
            aria-label={last ? 'Finish tutorial' : 'Next step'}
          >
            {last ? 'done ✓' : 'next →'}
          </Btn>
        </PanelFooter>
      </Panel>
    </Overlay>
  );
};

export default Tutorial;
