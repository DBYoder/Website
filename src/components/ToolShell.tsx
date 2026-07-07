import React, { useState } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { COLORS } from '../GlobalStyles';
import { Tag, Btn, Label } from './Core';
import Tutorial from './Tutorial';

const M = '@media (max-width: 768px)';

const ShellLayout = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  background: ${COLORS.bg};
  border: 1px solid ${COLORS.border};
  ${M} { border: none; }
`;

const Sidebar = styled.div<{ open?: boolean }>`
  width: 240px;
  height: 100%;
  background: ${COLORS.surface};
  border-right: 1px solid ${COLORS.border};
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  ${M} {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    height: 100dvh;
    z-index: 300;
    width: 260px;
    transform: ${props => props.open ? 'translateX(0)' : 'translateX(-100%)'};
    transition: transform 0.25s ease;
  }
`;

const MobileOverlay = styled.div<{ visible?: boolean }>`
  display: none;
  ${M} {
    display: ${props => props.visible ? 'block' : 'none'};
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 299;
  }
`;

const SidebarHeader = styled.div`
  padding: 32px 24px 24px;
  border-bottom: 1px solid ${COLORS.border};
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
`;

const SidebarCloseBtn = styled.button`
  appearance: none;
  -webkit-appearance: none;
  background: none;
  border: none;
  color: ${COLORS.muted};
  cursor: pointer;
  font-size: 18px;
  padding: 0 4px;
  line-height: 1;
  display: none;
  ${M} { display: block; }
  &:hover { color: ${COLORS.primary}; }
`;

const NavList = styled.div`
  padding: 24px 0;
  flex: 1;
`;

const NavLink = styled(Link)<{ active?: boolean; toolColor: string }>`
  padding: 12px 24px;
  display: block;
  text-decoration: none;
  background: ${props => props.active ? 'rgba(255, 255, 255, 0.03)' : 'transparent'};
  border-left: 3px solid ${props => props.active ? props.toolColor : 'transparent'};
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: rgba(255, 255, 255, 0.05); }
`;

const SidebarFooter = styled.div`
  padding: 24px;
  border-top: 1px solid ${COLORS.border};
`;

const Main = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const TopBar = styled.div`
  height: 52px;
  border-bottom: 1px solid ${COLORS.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  background: ${COLORS.surface};
  flex-shrink: 0;
  ${M} { padding: 0 12px; gap: 8px; }
`;

const HamburgerBtn = styled.button`
  appearance: none;
  -webkit-appearance: none;
  background: none;
  border: 1px solid ${COLORS.borderBright};
  color: ${COLORS.secondary};
  width: 36px;
  height: 36px;
  display: none;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px;
  flex-shrink: 0;
  ${M} { display: flex; }
  &:hover { color: ${COLORS.primary}; border-color: ${COLORS.secondary}; }
`;

const NavPath = styled.span`
  font-family: 'Share Tech Mono', monospace;
  font-size: 13px;
  ${M} { display: none; }
`;

interface ToolShellProps {
  toolName: string;
  toolColor: string;
  activeNav: string;
  onBack: () => void;
  /** Tool keeps its data on this device only — shows LOCAL instead of LIVE and hides the share link. */
  local?: boolean;
  children: React.ReactNode;
}

const ToolShell: React.FC<ToolShellProps> = ({ toolColor, activeNav, onBack, local, children }) => {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <ShellLayout>
      <MobileOverlay visible={menuOpen} onClick={closeMenu} />

      <Sidebar open={menuOpen}>
        <SidebarHeader>
          <div>
            <div className="wf-title" style={{ fontSize: 22, color: COLORS.cyan, textShadow: `0 0 10px ${COLORS.cyan}`, letterSpacing: '0.1em' }}>AGILE//FREE</div>
            <div className="wf-label" style={{ fontSize: 11, color: COLORS.muted, marginTop: 6 }}>pm tools for teams</div>
          </div>
          <SidebarCloseBtn onClick={closeMenu} aria-label="Close menu">✕</SidebarCloseBtn>
        </SidebarHeader>

        <NavList>
          {[
            { label: '// home', id: 'home', path: '/' },
            { label: '// poker', id: 'poker', path: '/poker' },
            { label: '// retro', id: 'retro', path: '/retro' },
            { label: '// stories', id: 'stories', path: '/stories' },
            { label: '// wbs', id: 'wbs', path: '/wbs' },
          ].map(({ label, id, path }) => {
            const active = activeNav === id;
            return (
              <NavLink key={label} to={path} active={active} toolColor={toolColor} onClick={closeMenu}>
                <span className="wf-mono" style={{ fontSize: 13, color: active ? toolColor : COLORS.secondary }}>{label}</span>
              </NavLink>
            );
          })}
        </NavList>

        <SidebarFooter>
          <Label size={10} style={{ display: 'block', marginBottom: 12 }}>monitors</Label>
          {['poker', 'retro', 'stories', 'wbs'].map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 6, height: 6, background: COLORS.lime, borderRadius: '50%', boxShadow: `0 0 4px ${COLORS.lime}` }} />
              <span className="wf-mono" style={{ fontSize: 11, color: t === activeNav ? toolColor : COLORS.secondary }}>{t}</span>
            </div>
          ))}
        </SidebarFooter>
      </Sidebar>

      <Main>
        <TopBar>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <HamburgerBtn onClick={() => setMenuOpen(true)} aria-label="Open navigation menu">☰</HamburgerBtn>
            <NavPath style={{ color: toolColor }}>~/{activeNav}</NavPath>
            {local ? (
              <Tag color={COLORS.muted} title="Data is stored in this browser only">LOCAL</Tag>
            ) : (
              <Tag color={toolColor}>LIVE</Tag>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn style={{ fontSize: 12, padding: '8px 12px' }} onClick={() => setShowTutorial(true)} aria-label="Open the tutorial">
              ?
            </Btn>
            {!local && (
              <Btn style={{ fontSize: 12 }} onClick={handleShareLink} aria-label="Copy share link to clipboard">
                {copied ? 'copied!' : 'share'}
              </Btn>
            )}
            <Btn onClick={onBack} style={{ fontSize: 12 }}>← back</Btn>
          </div>
        </TopBar>
        {children}
      </Main>
      {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}
    </ShellLayout>
  );
};

export default ToolShell;
