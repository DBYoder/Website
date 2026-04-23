import React from 'react';
import styled, { css } from 'styled-components';
import { COLORS } from '../GlobalStyles';

export const Box = styled.div<{ w?: string | number; h?: string | number; bg?: string; border?: string }>`
  width: ${props => typeof props.w === 'number' ? `${props.w}px` : props.w || 'auto'};
  height: ${props => typeof props.h === 'number' ? `${props.h}px` : props.h || 'auto'};
  background: ${props => props.bg || COLORS.card};
  border: 1px dashed ${props => props.border || COLORS.border};
  position: relative;
`;

export const Label = styled.span<{ color?: string; size?: number }>`
  font-family: 'Share Tech Mono', monospace;
  font-size: ${props => props.size || 9}px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: ${props => props.color || COLORS.muted};
`;

export const Tag = styled.span<{ color?: string }>`
  font-family: 'Share Tech Mono', monospace;
  font-size: 8px;
  color: ${props => props.color || COLORS.cyan};
  border: 1px solid ${props => props.color || COLORS.cyan};
  padding: 1px 5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

export const Btn = styled.div<{ primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  font-family: 'Share Tech Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s;
  
  ${props => props.primary ? css`
    background: rgba(0, 245, 255, 0.08);
    border: 1px solid ${COLORS.cyan};
    color: ${COLORS.cyan};
    &:hover {
      background: rgba(0, 245, 245, 0.15);
      box-shadow: 0 0 8px rgba(0, 245, 255, 0.3);
    }
  ` : css`
    background: transparent;
    border: 1px solid ${COLORS.borderBright};
    color: ${COLORS.secondary};
    &:hover {
      border-color: ${COLORS.secondary};
      color: ${COLORS.primary};
    }
  `}
`;

export const LinesWrapper = styled.div<{ width?: string }>`
  width: ${props => props.width || '100%'};
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const Line = styled.div<{ width?: string; color?: string }>`
  height: 2px;
  width: ${props => props.width || '100%'};
  background: ${props => props.color || COLORS.border};
  border-radius: 1px;
`;

export const Lines: React.FC<{ count?: number; width?: string; color?: string; style?: React.CSSProperties }> = ({ count = 3, width, color, style }) => (
  <LinesWrapper width={width} style={style}>
    {Array.from({ length: count }).map((_, i) => (
      <Line key={i} width={i === count - 1 ? '60%' : '100%'} color={color} />
    ))}
  </LinesWrapper>
);

export const HLine = styled.div<{ color?: string }>`
  height: 1px;
  background: ${props => props.color || COLORS.border};
  width: 100%;
`;

const BracketSVG = styled.svg<{ color?: string }>`
  position: absolute;
  pointer-events: none;
`;

export const CornerBracket: React.FC<{ size?: number; color?: string; style?: React.CSSProperties }> = ({ size = 8, color, style }) => (
  <BracketSVG 
    width={size * 2 + 2} 
    height={size * 2 + 2} 
    viewBox={`0 0 ${size * 2 + 2} ${size * 2 + 2}`}
    style={style}
    color={color}
  >
    <path 
      d={`M1,${size * 2 + 1} L1,1 L${size * 2 + 1},1`} 
      fill="none" 
      stroke={color || COLORS.cyan} 
      strokeWidth="1.5"
    />
  </BracketSVG>
);

export const NavItem = styled.span<{ active?: boolean }>`
  font-family: 'Share Tech Mono', monospace;
  font-size: 10px;
  color: ${props => props.active ? COLORS.cyan : COLORS.secondary};
  border-bottom: ${props => props.active ? `1px solid ${COLORS.cyan}` : 'none'};
  padding-bottom: 2px;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: color 0.2s;
  
  &:hover {
    color: ${COLORS.cyan};
  }
`;
