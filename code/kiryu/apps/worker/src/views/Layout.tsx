import type { FC, PropsWithChildren } from 'hono/jsx';
import { raw } from 'hono/html';

export const Layout: FC<PropsWithChildren<{ title?: string; scrollable?: boolean }>> = ({ children, title = 'Security Dashboard', scrollable }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <script src="https://unpkg.com/htmx.org@1.9.10" integrity="sha384-D1Kt99CQMDuVetoL1lrYwg5t+9QdHe7NLX/SoJYkXDFfX37iInKRy5xLSi8nO7UC" crossorigin="anonymous"></script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style>{raw(styles)}</style>
        {scrollable && <style>{raw(`html, body { height: auto !important; overflow-y: auto !important; }`)}</style>}
      </head>
      <body>
        <div class="grid-bg"></div>
        {children}
        <script>{raw(`
          document.addEventListener('click', function(e) {
            var btn = e.target.closest('.tab-btn');
            if (!btn) return;
            e.preventDefault();
            e.stopPropagation();
            var name = btn.getAttribute('data-tab');
            if (!name) return;
            document.querySelectorAll('.tab-btn').forEach(function(b) {
              b.classList.remove('active');
              b.setAttribute('aria-selected', 'false');
            });
            document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            var panel = document.getElementById('tab-' + name);
            if (panel) panel.classList.add('active');
          });
        `)}</script>
      </body>
    </html>
  );
};

const styles = `
  :root {
    /* Palette — deep navy command center */
    --bg-void: #06080c;
    --bg-base: #0a0f18;
    --bg-surface: #0f1520;
    --bg-raised: #141c2b;
    --bg-hover: #1a2436;
    --bg-input: #111927;

    /* Borders */
    --border-dim: rgba(148, 163, 184, 0.08);
    --border-subtle: rgba(148, 163, 184, 0.12);
    --border-default: rgba(148, 163, 184, 0.18);
    --border-strong: rgba(148, 163, 184, 0.30);

    /* Text — boosted contrast */
    --text-primary: #f1f5f9;
    --text-secondary: #cbd5e1;
    --text-tertiary: #94a3b8;
    --text-muted: #64748b;
    --text-ghost: #475569;

    /* Accent — electric cyan */
    --accent: #06b6d4;
    --accent-bright: #22d3ee;
    --accent-dim: rgba(6, 182, 212, 0.15);
    --accent-glow: rgba(6, 182, 212, 0.08);

    /* Severity */
    --critical: #ef4444;
    --critical-bg: rgba(239, 68, 68, 0.10);
    --critical-border: rgba(239, 68, 68, 0.25);

    --high: #f97316;
    --high-bg: rgba(249, 115, 22, 0.10);
    --high-border: rgba(249, 115, 22, 0.25);

    --medium: #eab308;
    --medium-bg: rgba(234, 179, 8, 0.10);
    --medium-border: rgba(234, 179, 8, 0.25);

    --low: #22c55e;
    --low-bg: rgba(34, 197, 94, 0.10);
    --low-border: rgba(34, 197, 94, 0.25);

    --info: #3b82f6;
    --info-bg: rgba(59, 130, 246, 0.10);
    --info-border: rgba(59, 130, 246, 0.25);

    /* Status */
    --healthy: #10b981;
    --healthy-bg: rgba(16, 185, 129, 0.10);
    --error: #ef4444;
    --not-configured: #64748b;

    /* Spacing */
    --sp-1: 0.25rem;
    --sp-2: 0.5rem;
    --sp-3: 0.75rem;
    --sp-4: 1rem;
    --sp-5: 1.25rem;
    --sp-6: 1.5rem;
    --sp-8: 2rem;
    --sp-10: 2.5rem;
    --sp-12: 3rem;

    /* Typography */
    --font-sans: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;

    /* Effects */
    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.4);
    --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.5);
    --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.6);
    --radius-sm: 6px;
    --radius-md: 10px;
    --radius-lg: 14px;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    font-size: 15px;
    height: 100vh;
    overflow: hidden;
  }

  body {
    font-family: var(--font-sans);
    background: var(--bg-void);
    color: var(--text-primary);
    height: 100vh;
    overflow: hidden;
    padding: var(--sp-4) var(--sp-6);
    position: relative;
    line-height: 1.5;
    display: flex;
    flex-direction: column;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Subtle dot grid background */
  .grid-bg {
    position: fixed;
    inset: 0;
    background-image:
      radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.03) 1px, transparent 0);
    background-size: 28px 28px;
    pointer-events: none;
    z-index: 0;
  }

  body > *:not(.grid-bg) {
    position: relative;
    z-index: 1;
  }

  /* ═══ DASHBOARD WRAPPER ═══ */
  .dashboard-wrapper {
    display: flex;
    flex-direction: column;
    height: calc(100vh - var(--sp-4) * 2);
    min-height: 0;
    flex: 1;
  }

  .dashboard-top {
    flex-shrink: 0;
  }

  .dashboard-tabs {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  /* ═══ HEADER ═══ */
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--sp-3);
    padding-bottom: var(--sp-3);
    border-bottom: 1px solid var(--border-subtle);
    flex-wrap: wrap;
    gap: var(--sp-3);
    flex-shrink: 0;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
  }

  .logo-mark {
    width: 36px;
    height: 36px;
    background: var(--accent);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .logo-mark::after {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: 8px;
    background: var(--accent);
    opacity: 0.15;
    filter: blur(8px);
  }

  .logo-mark svg {
    width: 20px;
    height: 20px;
    color: var(--bg-void);
    position: relative;
    z-index: 1;
  }

  .header-title {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .header-left h1 {
    font-family: var(--font-sans);
    font-size: 1.15rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text-primary);
    line-height: 1.2;
  }

  .header-left p {
    color: var(--text-tertiary);
    font-size: 0.75rem;
    font-weight: 400;
    letter-spacing: 0.02em;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
  }

  /* ═══ FORM CONTROLS ═══ */
  select, button {
    font-family: var(--font-sans);
    background: var(--bg-raised);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    padding: 0.4rem 0.75rem;
    color: var(--text-primary);
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  select {
    padding-right: 1.75rem;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.6rem center;
  }

  select:hover, button:hover {
    background: var(--bg-hover);
    border-color: var(--border-strong);
  }

  select:focus, button:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-dim);
  }

  .refresh-btn {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    background: var(--accent);
    border: 1px solid transparent;
    color: var(--bg-void);
    font-weight: 600;
    padding: 0.35rem 0.7rem;
  }

  .refresh-btn:hover {
    background: var(--accent-bright);
    box-shadow: 0 0 20px var(--accent-dim);
  }

  .refresh-btn .icon {
    width: 13px;
    height: 13px;
  }

  /* ═══ 12-COL GRID ═══ */
  .grid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: var(--sp-3);
  }

  /* ═══ CARDS ═══ */
  .card {
    background: var(--bg-surface);
    border: 1px solid var(--border-dim);
    border-radius: var(--radius-md);
    padding: var(--sp-4);
    position: relative;
    overflow: hidden;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .card:hover {
    border-color: var(--border-subtle);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  }

  .card-title {
    font-family: var(--font-sans);
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--text-tertiary);
    margin-bottom: var(--sp-3);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    display: flex;
    align-items: center;
    gap: var(--sp-2);
  }

  .card-title::before {
    content: '';
    width: 3px;
    height: 12px;
    background: var(--accent);
    border-radius: 2px;
    flex-shrink: 0;
  }

  .card-compact {
    padding: var(--sp-4);
  }

  .card-compact .card-title {
    margin-bottom: var(--sp-3);
    font-size: 0.7rem;
  }

  /* ═══ COLUMN SPANS ═══ */
  .col-3 { grid-column: span 3; }
  .col-4 { grid-column: span 4; }
  .col-5 { grid-column: span 5; }
  .col-6 { grid-column: span 6; }
  .col-8 { grid-column: span 8; }
  .col-9 { grid-column: span 9; }
  .col-12 { grid-column: span 12; }

  @media (max-width: 1200px) {
    .col-3 { grid-column: span 6; }
    .col-4 { grid-column: span 6; }
    .col-5 { grid-column: span 6; }
  }

  @media (max-width: 768px) {
    .col-3, .col-4, .col-5, .col-6, .col-8, .col-9 { grid-column: span 12; }
  }

  /* ═══ METRIC GRID ═══ */
  .metric-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--sp-2);
  }

  @media (max-width: 1024px) {
    .metric-grid { grid-template-columns: repeat(2, 1fr); }
  }

  /* ═══ MINI METRIC GRID ═══ */
  .mini-metric-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(85px, 1fr));
    gap: var(--sp-3);
  }

  /* ═══ METRIC CARDS ═══ */
  .metric-card {
    background: var(--bg-raised);
    border: 1px solid var(--border-dim);
    border-radius: var(--radius-sm);
    padding: var(--sp-3) var(--sp-4);
    text-align: center;
    position: relative;
    transition: border-color 0.15s ease, background 0.15s ease;
  }

  .metric-card:hover {
    border-color: var(--border-subtle);
    background: var(--bg-hover);
  }

  .metric-value {
    font-family: var(--font-mono);
    font-size: 1.6rem;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.04em;
    color: var(--text-primary);
  }

  .metric-label {
    font-size: 0.7rem;
    color: var(--text-tertiary);
    margin-top: var(--sp-1);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 600;
  }

  /* Compact metric card */
  .metric-card-sm {
    padding: var(--sp-2) var(--sp-4);
  }

  .metric-card-sm .metric-value {
    font-size: 1.35rem;
  }

  .metric-card-sm .metric-label {
    font-size: 0.7rem;
    margin-top: 3px;
  }

  .metric-card-sm .metric-source {
    font-size: 0.55rem;
    margin-top: 2px;
    padding: 1px 5px;
  }

  .metric-card-sm .metric-trend {
    font-size: 0.65rem;
    margin-top: 2px;
  }

  /* Severity metric cards */
  .severity-critical { color: var(--critical) !important; }
  .severity-high { color: var(--high) !important; }
  .severity-medium { color: var(--medium) !important; }
  .severity-low { color: var(--low) !important; }

  .metric-card.severity-critical {
    border-left: 2px solid var(--critical);
    background: var(--critical-bg);
  }
  .metric-card.severity-high {
    border-left: 2px solid var(--high);
    background: var(--high-bg);
  }
  .metric-card.severity-medium {
    border-left: 2px solid var(--medium);
    background: var(--medium-bg);
  }
  .metric-card.severity-low {
    border-left: 2px solid var(--low);
    background: var(--low-bg);
  }

  /* ═══ KPI STRIP CONTAINER ═══ */
  .dashboard-top .kpi-strip {
    margin-bottom: var(--sp-2);
  }

  /* ═══ PLATFORM STATUS ROW ═══ */
  .platform-status-row {
    display: flex;
    gap: var(--sp-2);
    align-items: center;
    flex-wrap: wrap;
    padding: var(--sp-2) 0 var(--sp-1);
  }

  /* ═══ SECURITY SCORE RING ═══ */
  .score-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0;
  }

  .score-ring {
    width: 90px;
    height: 90px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    background: var(--bg-raised);
  }

  .score-ring::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    padding: 3px;
    background: conic-gradient(
      var(--score-color, var(--healthy)) calc(var(--score) * 3.6deg),
      var(--border-dim) 0
    );
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
  }

  .score-ring::after {
    content: '';
    position: absolute;
    inset: 5px;
    border-radius: 50%;
    background: var(--bg-surface);
    z-index: 0;
  }

  .score-good { --score-color: var(--healthy); }
  .score-medium { --score-color: var(--medium); }
  .score-bad { --score-color: var(--critical); }

  .score-inner {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .score-value {
    font-family: var(--font-mono);
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1;
    letter-spacing: -0.03em;
  }

  .score-label {
    font-size: 0.45rem;
    color: var(--text-tertiary);
    margin-top: 2px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 600;
  }

  /* Orbit animation */
  .score-ring .orbit {
    position: absolute;
    border-radius: 50%;
    border: 1px solid var(--border-dim);
    animation: orbit 25s linear infinite;
  }

  .score-ring .orbit-1 {
    inset: -8px;
    animation-duration: 35s;
  }

  .score-ring .orbit-2 {
    inset: -16px;
    animation-duration: 50s;
    animation-direction: reverse;
  }

  .score-ring .orbit-dot {
    position: absolute;
    width: 3px;
    height: 3px;
    background: var(--accent);
    border-radius: 50%;
    top: -1.5px;
    left: 50%;
    transform: translateX(-50%);
    box-shadow: 0 0 6px var(--accent);
  }

  @keyframes orbit {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* ═══ TABLES ═══ */
  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 0.85rem;
  }

  th, td {
    padding: var(--sp-2) var(--sp-3);
    text-align: left;
  }

  th {
    color: var(--text-muted);
    font-family: var(--font-sans);
    font-weight: 700;
    text-transform: uppercase;
    font-size: 0.65rem;
    letter-spacing: 0.1em;
    border-bottom: 1px solid var(--border-default);
    background: var(--bg-raised);
    white-space: nowrap;
  }

  th:first-child { border-radius: var(--radius-sm) 0 0 0; }
  th:last-child { border-radius: 0 var(--radius-sm) 0 0; }

  td {
    border-bottom: 1px solid var(--border-dim);
    color: var(--text-primary);
  }

  tr:hover td {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  tr:last-child td { border-bottom: none; }
  tr:last-child td:first-child { border-radius: 0 0 0 var(--radius-sm); }
  tr:last-child td:last-child { border-radius: 0 0 var(--radius-sm) 0; }

  .compact-table th, .compact-table td {
    padding: var(--sp-2) var(--sp-3);
    font-size: 0.85rem;
  }

  .compact-table th {
    font-size: 0.65rem;
  }

  /* ═══ BADGES ═══ */
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-family: var(--font-sans);
  }

  .badge::before {
    content: '';
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: currentColor;
    flex-shrink: 0;
  }

  .badge-critical { background: var(--critical-bg); color: var(--critical); border: 1px solid var(--critical-border); }
  .badge-high { background: var(--high-bg); color: var(--high); border: 1px solid var(--high-border); }
  .badge-medium { background: var(--medium-bg); color: var(--medium); border: 1px solid var(--medium-border); }
  .badge-low { background: var(--low-bg); color: var(--low); border: 1px solid var(--low-border); }
  .badge-info { background: var(--info-bg); color: var(--info); border: 1px solid var(--info-border); }
  .badge-informational { background: rgba(100, 116, 139, 0.10); color: var(--text-tertiary); border: 1px solid rgba(100, 116, 139, 0.2); }

  /* ═══ PLATFORM BADGES ═══ */
  .platform-badges {
    display: flex;
    gap: var(--sp-2);
    flex-wrap: wrap;
    align-items: center;
  }

  .platform-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 600;
    font-family: var(--font-sans);
    background: var(--bg-raised);
    border: 1px solid var(--border-dim);
    text-transform: capitalize;
    color: var(--text-secondary);
    letter-spacing: 0.02em;
    transition: border-color 0.15s ease;
  }

  .platform-badge:hover {
    border-color: var(--border-subtle);
  }

  /* ═══ STATUS DOTS ═══ */
  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    display: inline-block;
    margin-right: var(--sp-1);
    position: relative;
  }

  .status-dot::after {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    background: inherit;
    opacity: 0.25;
    animation: pulse 2.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.25; }
    50% { transform: scale(1.3); opacity: 0.08; }
  }

  .status-healthy { background: var(--healthy); }
  .status-error { background: var(--error); }
  .status-not_configured { background: var(--not-configured); }
  .status-unknown { background: var(--not-configured); }

  /* ═══ CHART BARS ═══ */
  .chart-bar {
    display: flex;
    align-items: center;
    margin: var(--sp-1) 0;
  }

  .chart-label {
    width: 60px;
    font-size: 0.75rem;
    text-transform: capitalize;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .chart-track {
    flex: 1;
    height: 18px;
    background: var(--bg-raised);
    border-radius: 4px;
    overflow: hidden;
    margin: 0 var(--sp-2);
    border: 1px solid var(--border-dim);
  }

  .chart-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
  }

  .chart-fill-endpoint { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
  .chart-fill-email { background: linear-gradient(90deg, #8b5cf6, #a78bfa); }
  .chart-fill-web { background: linear-gradient(90deg, #10b981, #34d399); }
  .chart-fill-cloud { background: linear-gradient(90deg, #f59e0b, #fbbf24); }

  .chart-value {
    width: 40px;
    text-align: right;
    font-family: var(--font-mono);
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--text-primary);
  }

  /* ═══ STAT ROWS ═══ */
  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--sp-1) 0;
    border-bottom: 1px solid var(--border-dim);
  }

  .stat-row:last-child {
    border-bottom: none;
  }

  .stat-label {
    color: var(--text-secondary);
    font-size: 0.8rem;
  }

  .stat-value {
    font-family: var(--font-mono);
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--text-primary);
  }

  .tactic-list .stat-label,
  .technique-list .stat-label {
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ═══ BANNERS ═══ */
  .error-banner {
    background: var(--critical-bg);
    border: 1px solid var(--critical-border);
    border-radius: var(--radius-md);
    padding: var(--sp-3) var(--sp-4);
    margin-bottom: var(--sp-3);
    color: var(--critical);
    position: relative;
    overflow: hidden;
    font-size: 0.9rem;
  }

  .error-banner::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--critical);
  }

  .warning-banner {
    background: var(--medium-bg);
    border: 1px solid var(--medium-border);
    color: var(--medium);
  }

  .warning-banner::before {
    background: var(--medium);
  }

  /* ═══ NO DATA ═══ */
  .no-data {
    color: var(--text-tertiary);
    font-style: italic;
    text-align: center;
    padding: var(--sp-4);
    font-size: 0.85rem;
  }

  /* ═══ FOOTER ═══ */
  footer {
    text-align: center;
    padding-top: var(--sp-2);
    border-top: 1px solid var(--border-dim);
    color: var(--text-ghost);
    font-size: 0.7rem;
    flex-shrink: 0;
    letter-spacing: 0.02em;
  }

  footer p {
    margin: 1px 0;
  }

  /* ═══ SCREEN READER ONLY ═══ */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  /* ═══ ICONS ═══ */
  .icon {
    width: 16px;
    height: 16px;
    display: inline-block;
    flex-shrink: 0;
  }

  /* ═══ HTMX LOADING ═══ */
  .htmx-request {
    opacity: 0.5;
    pointer-events: none;
  }

  .htmx-request .refresh-btn .icon {
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* ═══ TREND INDICATORS ═══ */
  .metric-trend {
    font-family: var(--font-mono);
    font-size: 0.65rem;
    font-weight: 600;
    margin-top: var(--sp-1);
    letter-spacing: 0.02em;
  }

  .trend-good { color: var(--healthy); }
  .trend-bad { color: var(--critical); }

  .metric-source {
    font-family: var(--font-mono);
    font-size: 0.55rem;
    font-weight: 700;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-top: var(--sp-1);
    padding: 2px 5px;
    border-radius: 3px;
    border: 1px solid var(--border-subtle);
    display: inline-block;
  }

  /* ═══ CACHE INDICATOR ═══ */
  .cache-indicator {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-1);
    font-size: 0.7rem;
    color: var(--text-secondary);
    font-family: var(--font-mono);
  }

  .cache-indicator a {
    font-family: var(--font-sans);
  }

  /* ═══ REPORT LINK ═══ */
  .report-link {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.4rem 0.75rem;
    background: var(--bg-raised);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: 0.85rem;
    font-weight: 500;
    text-decoration: none;
    transition: all 0.15s ease;
  }

  .report-link:hover {
    background: var(--bg-hover);
    border-color: var(--border-strong);
    text-decoration: none;
  }

  .report-link svg {
    width: 12px;
    height: 12px;
  }

  /* ═══ LINKS ═══ */
  a {
    color: var(--accent);
    text-decoration: none;
    transition: color 0.15s ease;
  }

  a:hover {
    color: var(--accent-bright);
    text-decoration: underline;
  }

  /* ═══ PAGE NAVIGATION (Security / Intune) ═══ */
  .tab-link {
    display: inline-flex;
    align-items: center;
    padding: 6px 14px;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-tertiary);
    text-decoration: none;
    transition: all 0.15s ease;
    border: 1px solid transparent;
  }

  .tab-link:hover {
    color: var(--text-secondary);
    background: var(--bg-hover);
    text-decoration: none;
  }

  .tab-active {
    color: var(--accent) !important;
    background: var(--accent-glow);
    border-color: rgba(6, 182, 212, 0.2);
  }

  /* ═══ TABLE OVERFLOW ═══ */
  .card table {
    display: block;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  /* ═══ SECTION TITLE ═══ */
  .section-title {
    display: flex;
    align-items: baseline;
    gap: var(--sp-2);
  }

  .section-count {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--text-secondary);
    font-weight: 600;
  }

  /* ═══ CRITICAL SCAN LINE ═══ */
  .card.has-critical::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--critical), transparent);
    animation: scan 4s ease-in-out infinite;
  }

  @keyframes scan {
    0% { transform: translateX(-100%); opacity: 0; }
    50% { opacity: 1; }
    100% { transform: translateX(100%); opacity: 0; }
  }

  /* ═══ SCROLLBAR ═══ */
  ::-webkit-scrollbar {
    width: 4px;
    height: 4px;
  }

  ::-webkit-scrollbar-track {
    background: var(--bg-surface);
    border-radius: 2px;
  }

  ::-webkit-scrollbar-thumb {
    background: var(--border-default);
    border-radius: 2px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: var(--text-muted);
  }

  /* ═══ TAB NAVIGATION ═══ */
  .tab-nav {
    display: flex;
    gap: 0;
    margin-bottom: var(--sp-3);
    border-bottom: 1px solid var(--border-dim);
    overflow-x: auto;
    flex-shrink: 0;
    scrollbar-width: none;
  }

  .tab-nav::-webkit-scrollbar {
    display: none;
  }

  .tab-btn {
    padding: var(--sp-2) var(--sp-4);
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    color: var(--text-muted);
    font-family: var(--font-sans);
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    margin-bottom: -1px;
    transition: color 0.2s ease, border-color 0.2s ease;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    white-space: nowrap;
    backdrop-filter: none;
  }

  .tab-btn:hover {
    color: var(--text-secondary);
    background: transparent;
    transform: none;
    box-shadow: none;
  }

  .tab-btn.active {
    color: var(--accent-bright);
    border-bottom-color: var(--accent);
  }

  .tab-content {
    display: none;
  }

  .tab-content.active {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: var(--sp-4);
    overflow-y: auto;
    flex: 1;
    min-height: 0;
    align-content: start;
    padding: var(--sp-1) 0;
  }

  /* ═══ SECTION HEADERS ═══ */
  .section-header {
    font-family: var(--font-sans);
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.14em;
    margin-bottom: var(--sp-2);
    display: flex;
    align-items: center;
    gap: var(--sp-3);
  }

  .section-header::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border-dim);
  }

  /* ═══ KPI STRIP (top-level metrics row) ═══ */
  .kpi-strip {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
    gap: 0;
    padding: 0;
    background: var(--bg-surface);
    border: 1px solid var(--border-dim);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .kpi-item {
    text-align: center;
    padding: var(--sp-3) var(--sp-2);
    border-right: 1px solid var(--border-dim);
    transition: background 0.15s ease;
  }

  .kpi-item:last-child {
    border-right: none;
  }

  .kpi-item:hover {
    background: var(--bg-hover);
  }

  .kpi-value {
    font-family: var(--font-mono);
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1;
    letter-spacing: -0.03em;
  }

  .kpi-label {
    font-size: 0.6rem;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-top: 5px;
    font-weight: 600;
  }

  .kpi-source {
    font-family: var(--font-mono);
    font-size: 0.5rem;
    font-weight: 700;
    color: var(--text-ghost);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-top: 3px;
  }

  .kpi-item.kpi-pulse .kpi-value {
    animation: kpi-glow 2s ease-in-out infinite;
  }

  @keyframes kpi-glow {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  /* ═══ RESPONSIVE ═══ */
  @media (max-width: 768px) {
    html, body {
      height: auto;
      overflow-y: auto;
    }

    body {
      padding: var(--sp-3);
    }

    .dashboard-wrapper {
      height: auto;
    }

    .tab-content.active {
      overflow-y: visible;
    }

    .kpi-strip {
      grid-template-columns: repeat(2, 1fr);
    }

    .kpi-item {
      border-right: none;
      border-bottom: 1px solid var(--border-dim);
    }

    .kpi-item:nth-last-child(-n+2) {
      border-bottom: none;
    }

    .metric-grid[style*="repeat(5"], .metric-grid[style*="repeat(6"] {
      grid-template-columns: repeat(2, 1fr) !important;
    }

    .header-left h1 {
      font-size: 0.9rem;
    }
  }

  /* ═══ GAUGE / DONUT CHARTS ═══ */
  .gauge {
    position: relative;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--sp-1);
  }

  .gauge-ring {
    position: relative;
    width: 120px;
    height: 120px;
  }

  .gauge-ring svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .gauge-ring .gauge-track {
    fill: none;
    stroke: var(--border-dim);
    stroke-width: 6;
  }

  .gauge-ring .gauge-fill {
    fill: none;
    stroke-width: 6;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .gauge-center {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--sp-3);
  }

  .gauge-value {
    font-family: var(--font-mono);
    font-size: 1.6rem;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1;
    letter-spacing: -0.04em;
  }

  .gauge-sub {
    font-size: 0.6rem;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 500;
    margin-top: 3px;
  }

  .gauge-label {
    font-size: 0.7rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 700;
    text-align: center;
    margin-top: var(--sp-1);
  }

  /* Gauge in compact card context */
  .gauge-sm .gauge-ring {
    width: 90px;
    height: 90px;
  }

  .gauge-sm .gauge-ring .gauge-track,
  .gauge-sm .gauge-ring .gauge-fill {
    stroke-width: 5;
  }

  .gauge-sm .gauge-value {
    font-size: 1.25rem;
  }

  .gauge-sm .gauge-sub {
    font-size: 0.55rem;
  }

  .gauge-sm .gauge-center {
    padding: var(--sp-2);
  }

  /* Gauge row layout — multiple gauges in a row */
  .gauge-row {
    display: flex;
    justify-content: space-evenly;
    align-items: flex-start;
    gap: var(--sp-3);
    padding: var(--sp-2) 0;
  }

  /* ═══ DONUT CHART ═══ */
  .donut {
    position: relative;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--sp-1);
  }

  .donut-ring {
    position: relative;
    width: 120px;
    height: 120px;
  }

  .donut-ring svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .donut-ring .donut-segment {
    fill: none;
    stroke-width: 14;
    transition: stroke-dashoffset 0.6s ease;
  }

  .donut-center {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .donut-total {
    font-family: var(--font-mono);
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1;
  }

  .donut-total-label {
    font-size: 0.6rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-top: 2px;
  }

  .donut-legend {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-2);
    justify-content: center;
    margin-top: var(--sp-1);
  }

  .donut-legend-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.7rem;
    color: var(--text-secondary);
  }

  .donut-legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .donut-legend-value {
    font-family: var(--font-mono);
    font-weight: 600;
    color: var(--text-primary);
  }

  /* ═══ PROGRESS BAR ═══ */
  .progress-bar-container {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
  }

  .progress-bar-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .progress-bar-label {
    font-size: 0.75rem;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .progress-bar-value {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .progress-bar-track {
    height: 8px;
    background: var(--bg-raised);
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid var(--border-dim);
  }

  .progress-bar-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
  }

  .progress-bar-fill::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%);
    animation: shimmer 2s ease-in-out infinite;
  }

  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  /* ═══ EXECUTIVE TAB ═══ */
  .exec-headline {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--sp-4);
  }

  .exec-headline-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-dim);
    border-radius: var(--radius-md);
    padding: var(--sp-5);
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--sp-2);
    transition: border-color 0.2s ease;
  }

  .exec-headline-card:hover {
    border-color: var(--border-subtle);
  }

  .exec-big-value {
    font-family: var(--font-mono);
    font-size: 2.5rem;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.04em;
  }

  .exec-label {
    font-size: 0.7rem;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 700;
  }

  .exec-sublabel {
    font-size: 0.6rem;
    color: var(--text-muted);
    font-family: var(--font-mono);
    letter-spacing: 0.02em;
  }

  /* ═══ HEALTH INDICATOR GRID ═══ */
  .exec-health-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: var(--sp-3);
  }

  .exec-health-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-dim);
    border-radius: var(--radius-md);
    padding: var(--sp-4);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--sp-2);
    border-left: 3px solid var(--border-dim);
  }

  .exec-health-card.health-good { border-left-color: var(--healthy); }
  .exec-health-card.health-warn { border-left-color: var(--medium); }
  .exec-health-card.health-bad { border-left-color: var(--critical); }

  .health-title {
    font-family: var(--font-sans);
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    text-align: center;
  }

  .health-metrics {
    width: 100%;
  }

  .health-metric-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 2px 0;
    font-size: 0.7rem;
  }

  .health-metric-row .stat-label {
    color: var(--text-muted);
    font-size: 0.7rem;
  }

  .health-metric-row .stat-value {
    font-family: var(--font-mono);
    font-weight: 600;
    font-size: 0.75rem;
  }

  .health-metric-row .metric-source {
    font-size: 0.5rem;
    padding: 1px 3px;
  }

  /* ═══ EXECUTIVE SUMMARY CARDS ═══ */
  .exec-summary-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--sp-3);
  }

  .exec-summary-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-dim);
    border-radius: var(--radius-md);
    padding: var(--sp-4);
  }

  .exec-summary-card .card-title {
    margin-bottom: var(--sp-3);
    font-size: 0.7rem;
  }

  .exec-stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--sp-1) 0;
    border-bottom: 1px solid rgba(148, 163, 184, 0.06);
  }

  .exec-stat-row:last-child { border-bottom: none; }

  .exec-stat-label {
    font-size: 0.75rem;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: var(--sp-1);
  }

  .exec-stat-value {
    font-family: var(--font-mono);
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--text-primary);
  }

  /* ═══ ACTION ITEMS ═══ */
  .exec-actions {
    border-left: 3px solid var(--accent);
  }

  .exec-action-item {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    padding: var(--sp-2) 0;
    border-bottom: 1px solid rgba(148, 163, 184, 0.06);
  }

  .exec-action-item:last-child { border-bottom: none; }

  .exec-action-text {
    flex: 1;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .exec-all-clear {
    color: var(--healthy);
    font-size: 0.85rem;
    padding: var(--sp-2) 0;
  }

  /* ═══ HORIZONTAL BAR CHART ═══ */
  .hbar-row {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    margin: var(--sp-1) 0;
  }

  .hbar-label {
    width: 110px;
    font-size: 0.75rem;
    color: var(--text-secondary);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .hbar-track {
    flex: 1;
    height: 16px;
    background: var(--bg-raised);
    border-radius: 3px;
    overflow: hidden;
    border: 1px solid var(--border-dim);
  }

  .hbar-fill {
    height: 100%;
    border-radius: 2px;
    background: var(--accent);
    transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .hbar-value {
    width: 65px;
    text-align: right;
    font-family: var(--font-mono);
    font-weight: 600;
    font-size: 0.75rem;
    color: var(--text-primary);
    flex-shrink: 0;
  }

  /* ═══ SHADOW IT TABLE RISK BAR ═══ */
  .risk-bar {
    display: inline-block;
    width: 40px;
    height: 6px;
    border-radius: 3px;
    background: rgba(255,255,255,0.06);
    overflow: hidden;
    vertical-align: middle;
    margin-left: 4px;
  }

  .risk-bar-fill {
    height: 100%;
    border-radius: 3px;
  }

  /* ═══ RESPONSIVE: EXECUTIVE ═══ */
  @media (max-width: 1200px) {
    .exec-headline {
      grid-template-columns: repeat(3, 1fr);
    }
    .exec-health-grid {
      grid-template-columns: repeat(3, 1fr);
    }
    .exec-summary-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 768px) {
    .exec-headline {
      grid-template-columns: 1fr;
    }
    .exec-health-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .exec-summary-grid {
      grid-template-columns: 1fr;
    }
  }

  /* ═══ PRINT STYLES ═══ */
  @media print {
    html, body {
      height: auto;
      overflow: visible;
    }

    .grid-bg,
    .refresh-btn,
    .tab-nav {
      display: none !important;
    }

    .tab-content {
      display: grid !important;
      grid-template-columns: repeat(12, 1fr);
      gap: var(--sp-3);
      overflow: visible;
    }

    body {
      background: white;
      color: black;
    }

    .card {
      break-inside: avoid;
      box-shadow: none;
      border: 1px solid #ddd;
    }
  }
`;
