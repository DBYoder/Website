import React, { useState } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { COLORS } from '../GlobalStyles';
import { Tag, Btn, Label } from './Core';

const ShellLayout = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  background: ${COLORS.bg};
  border: 1px solid ${COLORS.border};
`;

const Sidebar = styled.div`
  width: 240px;
  height: 100%;
  background: ${COLORS.surface};
  border-right: 1px solid ${COLORS.border};
  display: flex;
  flex-direction: column;
`;

const SidebarHeader = styled.div`
  padding: 32px 24px;
  border-bottom: 1px solid ${COLORS.border};
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
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`;

const SidebarFooter = styled.div`
  padding: 24px;
  border-top: 1px solid ${COLORS.border};
`;

const Main = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const TopBar = styled.div`
  height: 52px;
  border-bottom: 1px solid ${COLORS.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  background: ${COLORS.surface};
`;

interface ToolShellProps {
  toolName: string;
  toolColor: string;
  activeNav: string;
  onBack: () => void;
  children: React.ReactNode;
}

const ToolShell: React.FC<ToolShellProps> = ({ toolColor, activeNav, onBack, children }) => {
  const [copied, setCopied] = useState(false);

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ShellLayout>
      <Sidebar>
        <SidebarHeader>
          <div className="wf-title" style={{ fontSize: 22, color: COLORS.cyan, textShadow: `0 0 10px ${COLORS.cyan}`, letterSpacing: '0.1em' }}>AGILE//FREE</div>
          <div className="wf-label" style={{ fontSize: 11, color: COLORS.muted, marginTop: 6 }}>pm tools for teams</div>
        </SidebarHeader>

        <NavList>
          {[
            { label: '// home', id: 'home', path: '/' },
            { label: '// poker', id: 'poker', path: '/poker' },
            { label: '// retro', id: 'retro', path: '/retro' },
            { label: '// stories', id: 'stories', path: '/stories' },
            { label: '// about', id: 'about', path: '#' },
          ].map(({ label, id, path }) => {
            const active = activeNav === id;
            return (
              <NavLink 
                key={label} 
                to={path}
                active={active} 
                toolColor={toolColor}
              >
                <span className="wf-mono" style={{ fontSize: 13, color: active ? toolColor : COLORS.secondary }}>{label}</span>
              </NavLink>
            );
          })}
        </NavList>

        <SidebarFooter>
          <Label size={10} style={{ display: 'block', marginBottom: 12 }}>monitors</Label>
          {['poker', 'retro', 'stories'].map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 6, height: 6, background: COLORS.lime, borderRadius: '50%', boxShadow: `0 0 4px ${COLORS.lime}` }} />
              <span className="wf-mono" style={{ fontSize: 11, color: t === activeNav ? toolColor : COLORS.secondary }}>{t}</span>
            </div>
          ))}
        </SidebarFooter>
      </Sidebar>

      <Main>
        <TopBar>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span className="wf-mono" style={{ fontSize: 13, color: toolColor }}>~/{activeNav}</span>
            <Tag color={toolColor}>LIVE</Tag>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <Btn style={{ fontSize: 12 }} onClick={handleShareLink} aria-label="Copy share link to clipboard">
              {copied ? 'copied!' : 'share link'}
            </Btn>
            <Btn onClick={onBack} style={{ fontSize: 12 }}>← back</Btn>
          </div>
        </TopBar>
        {children}
      </Main>
    </ShellLayout>
  );
};

export default ToolShell;
