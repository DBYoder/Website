import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE = 'https://dbagiletools.com';

interface RouteMeta {
  title: string;
  description: string;
  path: string;
}

// Per-route title/description. Social scrapers generally don't run JS, so
// link-preview (OG) tags stay static in index.html; these client-side updates
// give JS-executing crawlers (e.g. Google) and browser tabs distinct metadata.
const ROUTE_META: Record<string, RouteMeta> = {
  '/': {
    path: '/',
    title: 'AGILE//FREE — Free Real-Time Agile Planning Tools for Teams',
    description: 'Free, real-time agile tools for sprint planning — no signup. Collaborative work breakdown, user story builder, planning poker, and retrospective boards.',
  },
  '/wbs': {
    path: '/wbs',
    title: 'Work Breakdown Structure — AGILE//FREE',
    description: 'Collaboratively break epics into features and stories in real time, then export them to your backlog. Free WBS tool for agile teams.',
  },
  '/stories': {
    path: '/stories',
    title: 'User Story Generator & Backlog — AGILE//FREE',
    description: 'Write user stories in the as-a / I-want / so-that format with acceptance criteria and build a shareable backlog. Export to CSV, Jira, JSON, or Markdown. Free.',
  },
  '/poker': {
    path: '/poker',
    title: 'Planning Poker — AGILE//FREE',
    description: 'Real-time planning poker for sprint estimation with hidden votes, auto-reveal, consensus, and story-point tracking. Free, no signup.',
  },
  '/retro': {
    path: '/retro',
    title: 'Retro Board — AGILE//FREE',
    description: 'Run sprint retrospectives with went-well / to-improve / action-item columns, dot voting, a shared timer, and export. Free.',
  },
};

function setMeta(name: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function useRouteSEO() {
  const { pathname } = useLocation();
  useEffect(() => {
    const meta = ROUTE_META[pathname] ?? ROUTE_META['/'];
    document.title = meta.title;
    setMeta('description', meta.description);
    setCanonical(SITE + (meta.path === '/' ? '/' : meta.path));
  }, [pathname]);
}
