import { createGlobalStyle } from 'styled-components';

export const COLORS = {
  bg: '#050508',
  surface: '#0d0d14',
  elevated: '#13131f',
  card: '#16161f',
  border: '#2a2a3a',
  borderBright: '#44446a',
  muted: '#44445a',
  secondary: '#8888aa',
  primary: '#e8e8f0',
  cyan: '#00f5ff',
  magenta: '#ff00aa',
  lime: '#aaff00',
  purple: '#b829ff',
  yellow: '#ffee00',
};

export const GlobalStyles = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html, body, #root {
    width: 100%;
    height: 100%;
    background: ${COLORS.bg};
    color: ${COLORS.primary};
    overflow: hidden;
    font-family: 'Rajdhani', sans-serif;
    font-size: 16px;
  }

  @media (max-width: 768px) {
    html, body, #root {
      height: auto;
      min-height: 100%;
      overflow: auto;
    }
  }

  .wf-label {
    font-family: 'Share Tech Mono', monospace;
    font-size: 13px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }

  .wf-title {
    font-family: 'Orbitron', monospace;
    font-weight: 700;
  }

  .wf-mono {
    font-family: 'Share Tech Mono', monospace;
  }

  .wf-body {
    font-family: 'Rajdhani', sans-serif;
  }

  .wf-retro {
    font-family: 'VT323', monospace;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
`;
