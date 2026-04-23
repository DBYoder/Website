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
  font-size: ${props => props.size || 12}px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: ${props => props.color || COLORS.muted};
`;

export const Tag = styled.span<{ color?: string }>`
  font-family: 'Share Tech Mono', monospace;
  font-size: 11px;
  color: ${props => props.color || COLORS.cyan};
  border: 1px solid ${props => props.color || COLORS.cyan};
  padding: 2px 8px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

export const Btn = styled.button.attrs(() => ({ type: 'button' }))<{ primary?: boolean }>`
  appearance: none;
  -webkit-appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  font-family: 'Share Tech Mono', monospace;
  font-size: 12px;
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
      box-shadow: 0 0 10px rgba(0, 245, 255, 0.4);
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
  gap: 6px;
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

export const CornerBracket: React.FC<{ size?: number; color?: string; style?: React.CSSProperties }> = ({ size = 10, color, style }) => (
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
      strokeWidth="2"
    />
  </BracketSVG>
);

export const NavItem = styled.span<{ active?: boolean }>`
  font-family: 'Share Tech Mono', monospace;
  font-size: 13px;
  color: ${props => props.active ? COLORS.cyan : COLORS.secondary};
  border-bottom: ${props => props.active ? `2px solid ${COLORS.cyan}` : 'none'};
  padding-bottom: 4px;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: color 0.2s;
  
  &:hover {
    color: ${COLORS.cyan};
  }
`;
