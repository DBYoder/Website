import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { COLORS } from '../GlobalStyles';
import { Btn } from './Core';
import { Story } from '../lib/story';
import {
  storiesToCSV,
  storiesToJiraCSV,
  storiesToJSON,
  storiesToMarkdown,
  downloadFile,
  isoDate,
} from '../lib/storyCsv';

const MenuWrap = styled.div`
  position: relative;
  display: inline-flex;
`;

const Menu = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 50;
  background: ${COLORS.surface};
  border: 1px solid ${COLORS.borderBright};
  display: flex;
  flex-direction: column;
  min-width: 170px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
`;

const MenuItem = styled.button`
  appearance: none;
  -webkit-appearance: none;
  background: none;
  border: none;
  border-bottom: 1px solid ${COLORS.border};
  padding: 10px 14px;
  text-align: left;
  font-family: 'Share Tech Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${COLORS.secondary};
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  &:last-child { border-bottom: none; }
  &:hover { background: ${COLORS.elevated}; color: ${COLORS.primary}; }
`;

const Ext = styled.span`
  color: ${COLORS.muted};
  font-size: 10px;
`;

interface Format {
  label: string;
  ext: string;
  mime: string;
  serialize: (stories: Story[]) => string;
}

const FORMATS: Format[] = [
  { label: 'backlog csv', ext: 'csv', mime: 'text/csv', serialize: storiesToCSV },
  { label: 'jira csv', ext: 'csv', mime: 'text/csv', serialize: storiesToJiraCSV },
  { label: 'json', ext: 'json', mime: 'application/json', serialize: storiesToJSON },
  { label: 'markdown', ext: 'md', mime: 'text/markdown', serialize: storiesToMarkdown },
];

const ExportMenu: React.FC<{
  stories: Story[];
  filePrefix: string;
  disabled?: boolean;
  buttonStyle?: React.CSSProperties;
}> = ({ stories, filePrefix, disabled, buttonStyle }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const handleSelect = (f: Format) => {
    setOpen(false);
    if (stories.length === 0) return;
    const suffix = f === FORMATS[1] ? '-jira' : '';
    downloadFile(`${filePrefix}${suffix}-${isoDate()}.${f.ext}`, f.serialize(stories), f.mime);
  };

  return (
    <MenuWrap ref={wrapRef}>
      <Btn
        onClick={() => setOpen(o => !o)}
        disabled={disabled}
        style={{ opacity: disabled ? 0.4 : 1, ...buttonStyle }}
        aria-label="Export stories"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        export ↓
      </Btn>
      {open && !disabled && (
        <Menu role="menu" aria-label="Export format">
          {FORMATS.map(f => (
            <MenuItem key={f.label} role="menuitem" onClick={() => handleSelect(f)}>
              <span>{f.label}</span>
              <Ext>.{f.ext}</Ext>
            </MenuItem>
          ))}
        </Menu>
      )}
    </MenuWrap>
  );
};

export default ExportMenu;
