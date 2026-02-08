import type { FC, PropsWithChildren } from 'hono/jsx';

export const Layout: FC<PropsWithChildren<{ title?: string }>> = ({ children, title = 'Security Dashboard' }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <script src="https://unpkg.com/htmx.org@1.9.10" integrity="sha384-D1Kt99CQMDuVetoL1lrYwg5t+9QdHe7NLX/SoJYkXDFfX37iInKRy5xLSi8nO7UC" crossorigin="anonymous"></script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style>{styles}</style>
      </head>
      <body hx-boost="true">
        <div class="grid-bg"></div>
        {children}
        <script>{`
          function switchTab(name) {
            document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
            document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
            document.getElementById('tab-' + name).classList.add('active');
            var btns = document.querySelectorAll('.tab-btn');
            for (var i = 0; i < btns.length; i++) {
              if (btns[i].getAttribute('data-tab') === name) { btns[i].classList.add('active'); }
            }
          }
        `}</script>
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
    --border-dim: rgba(148, 163, 184, 0.06);
    --border-subtle: rgba(148, 163, 184, 0.10);
    --border-default: rgba(148, 163, 184, 0.15);
    --border-strong: rgba(148, 163, 184, 0.25);

    /* Text */
    --text-primary: #e8ecf1;
    --text-secondary: #94a3b8;
    --text-tertiary: #64748b;
    --text-muted: #475569;
    --text-ghost: #334155;

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
    --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
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
    font-size: 14px;
    scroll-behavior: smooth;
  }

  body {
    font-family: var(--font-sans);
    background: var(--bg-void);
    color: var(--text-primary);
    min-height: 100vh;
    padding: var(--sp-6) var(--sp-8);
    position: relative;
    overflow-x: hidden;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Subtle dot grid background */
  .grid-bg {
    position: fixed;
    inset: 0;
    background-image:
      radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.04) 1px, transparent 0);
    background-size: 32px 32px;
    pointer-events: none;
    z-index: 0;
  }

  body > *:not(.grid-bg) {
    position: relative;
    z-index: 1;
  }

  /* ═══ HEADER ═══ */
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--sp-6);
    padding-bottom: var(--sp-5);
    border-bottom: 1px solid var(--border-subtle);
    flex-wrap: wrap;
    gap: var(--sp-4);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--sp-4);
  }

  .logo-mark {
    width: 42px;
    height: 42px;
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
    width: 22px;
    height: 22px;
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
    font-family: var(--font-mono);
    font-size: 1.15rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--text-primary);
    line-height: 1.2;
  }

  .header-left p {
    color: var(--text-muted);
    font-size: 0.75rem;
    font-weight: 400;
    letter-spacing: 0.01em;
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
    padding: 0.5rem 0.85rem;
    color: var(--text-primary);
    font-size: 0.8rem;
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
    gap: 0.4rem;
    background: var(--accent);
    border: 1px solid transparent;
    color: var(--bg-void);
    font-weight: 600;
    padding: 0.5rem 1rem;
  }

  .refresh-btn:hover {
    background: var(--accent-bright);
    box-shadow: 0 0 20px var(--accent-dim);
  }

  .refresh-btn .icon {
    width: 14px;
    height: 14px;
  }

  /* ═══ 12-COL GRID ═══ */
  .grid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: var(--sp-4);
  }

  /* ═══ CARDS ═══ */
  .card {
    background: var(--bg-surface);
    border: 1px solid var(--border-dim);
    border-radius: var(--radius-md);
    padding: var(--sp-5);
    position: relative;
    overflow: hidden;
    transition: border-color 0.2s ease;
  }

  .card:hover {
    border-color: var(--border-default);
  }

  .card-title {
    font-family: var(--font-mono);
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--text-tertiary);
    margin-bottom: var(--sp-4);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    display: flex;
    align-items: center;
    gap: var(--sp-2);
  }

  .card-title::before {
    content: '';
    width: 2px;
    height: 10px;
    background: var(--accent);
    border-radius: 1px;
    flex-shrink: 0;
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
    body { padding: var(--sp-4); }
  }

  /* ═══ METRIC GRID ═══ */
  .metric-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--sp-3);
  }

  @media (max-width: 1024px) {
    .metric-grid { grid-template-columns: repeat(2, 1fr); }
  }

  /* ═══ METRIC CARDS ═══ */
  .metric-card {
    background: var(--bg-raised);
    border: 1px solid var(--border-dim);
    border-radius: var(--radius-sm);
    padding: var(--sp-4) var(--sp-5);
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
    font-size: 1.75rem;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.03em;
    color: var(--text-primary);
  }

  .metric-label {
    font-size: 0.65rem;
    color: var(--text-tertiary);
    margin-top: var(--sp-2);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 500;
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

  /* ═══ SECURITY SCORE RING ═══ */
  .score-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--sp-3) 0;
  }

  .score-ring {
    width: 130px;
    height: 130px;
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
    inset: 7px;
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
    font-size: 2.25rem;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1;
    letter-spacing: -0.03em;
  }

  .score-label {
    font-size: 0.6rem;
    color: var(--text-tertiary);
    margin-top: 3px;
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
    inset: -12px;
    animation-duration: 35s;
  }

  .score-ring .orbit-2 {
    inset: -24px;
    animation-duration: 50s;
    animation-direction: reverse;
  }

  .score-ring .orbit-dot {
    position: absolute;
    width: 4px;
    height: 4px;
    background: var(--accent);
    border-radius: 50%;
    top: -2px;
    left: 50%;
    transform: translateX(-50%);
    box-shadow: 0 0 8px var(--accent);
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
    font-size: 0.8rem;
  }

  th, td {
    padding: var(--sp-2) var(--sp-3);
    text-align: left;
  }

  th {
    color: var(--text-muted);
    font-family: var(--font-mono);
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.6rem;
    letter-spacing: 0.1em;
    border-bottom: 1px solid var(--border-default);
    background: var(--bg-raised);
    white-space: nowrap;
  }

  th:first-child { border-radius: var(--radius-sm) 0 0 0; }
  th:last-child { border-radius: 0 var(--radius-sm) 0 0; }

  td {
    border-bottom: 1px solid var(--border-dim);
    color: var(--text-secondary);
  }

  tr:hover td {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  tr:last-child td { border-bottom: none; }
  tr:last-child td:first-child { border-radius: 0 0 0 var(--radius-sm); }
  tr:last-child td:last-child { border-radius: 0 0 var(--radius-sm) 0; }

  /* ═══ BADGES ═══ */
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    font-family: var(--font-mono);
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

  /* ═══ PLATFORM STATUS ═══ */
  .platform-list {
    list-style: none;
  }

  .platform-item {
    display: flex;
    flex-direction: column;
    padding: var(--sp-2) 0;
    border-bottom: 1px solid var(--border-dim);
  }

  .platform-item:last-child {
    border-bottom: none;
  }

  .platform-name {
    font-weight: 500;
    text-transform: capitalize;
    color: var(--text-primary);
    font-size: 0.85rem;
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    display: inline-block;
    margin-right: var(--sp-2);
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

  /* Platform grid (horizontal layout) */
  .platform-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: var(--sp-3);
  }

  .platform-card {
    background: var(--bg-raised);
    border: 1px solid var(--border-dim);
    border-radius: var(--radius-sm);
    padding: var(--sp-3);
    text-align: center;
    transition: border-color 0.15s ease;
    position: relative;
    overflow: hidden;
  }

  .platform-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--border-dim);
    transition: background 0.2s ease;
  }

  .platform-card.platform-healthy::before { background: var(--healthy); }
  .platform-card.platform-error::before { background: var(--error); }
  .platform-card.platform-not_configured::before { background: var(--not-configured); }

  .platform-card:hover {
    border-color: var(--border-subtle);
  }

  .platform-card-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--sp-2);
    margin-bottom: var(--sp-1);
  }

  .platform-icon {
    font-size: 1.25rem;
    line-height: 1;
  }

  .platform-card .platform-name {
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: capitalize;
  }

  .platform-card-status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--sp-1);
    margin-top: var(--sp-1);
  }

  .platform-card-status .status-text {
    font-size: 0.7rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .platform-card-sync {
    font-size: 0.65rem;
    color: var(--text-muted);
    margin-top: var(--sp-1);
    font-family: var(--font-mono);
  }

  .platform-card-error {
    font-size: 0.6rem;
    color: var(--error);
    margin-top: var(--sp-1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ═══ CHART BARS ═══ */
  .chart-bar {
    display: flex;
    align-items: center;
    margin: var(--sp-2) 0;
  }

  .chart-label {
    width: 65px;
    font-size: 0.75rem;
    text-transform: capitalize;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .chart-track {
    flex: 1;
    height: 24px;
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
    padding: var(--sp-2) 0;
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
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ═══ BANNERS ═══ */
  .error-banner {
    background: var(--critical-bg);
    border: 1px solid var(--critical-border);
    border-radius: var(--radius-md);
    padding: var(--sp-4) var(--sp-5);
    margin-bottom: var(--sp-5);
    color: var(--critical);
    position: relative;
    overflow: hidden;
    font-size: 0.85rem;
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
    color: var(--text-muted);
    font-style: italic;
    text-align: center;
    padding: var(--sp-6);
    font-size: 0.8rem;
  }

  /* ═══ FOOTER ═══ */
  footer {
    text-align: center;
    margin-top: var(--sp-12);
    padding-top: var(--sp-5);
    border-top: 1px solid var(--border-dim);
    color: var(--text-muted);
    font-size: 0.75rem;
  }

  footer p {
    margin: var(--sp-1) 0;
  }

  /* ═══ ICONS ═══ */
  .icon {
    width: 18px;
    height: 18px;
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
    font-size: 0.5rem;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-top: var(--sp-1);
    padding: 1px 5px;
    border-radius: 3px;
    border: 1px solid var(--border-dim);
    display: inline-block;
  }

  /* ═══ CACHE INDICATOR ═══ */
  .cache-indicator {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-1);
    font-size: 0.7rem;
    color: var(--text-tertiary);
    font-family: var(--font-mono);
  }

  .cache-indicator a {
    font-family: var(--font-sans);
  }

  /* ═══ REPORT LINK ═══ */
  .report-link {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.5rem 0.85rem;
    background: var(--bg-raised);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: 0.8rem;
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
    width: 14px;
    height: 14px;
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
    font-size: 0.75rem;
    color: var(--text-tertiary);
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
    width: 6px;
    height: 6px;
  }

  ::-webkit-scrollbar-track {
    background: var(--bg-surface);
    border-radius: 3px;
  }

  ::-webkit-scrollbar-thumb {
    background: var(--border-default);
    border-radius: 3px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: var(--text-muted);
  }

  /* ═══ RESPONSIVE ═══ */
  @media (max-width: 768px) {
    .metric-grid[style*="repeat(5"] {
      grid-template-columns: repeat(2, 1fr) !important;
    }

    .metric-grid[style*="repeat(6"] {
      grid-template-columns: repeat(2, 1fr) !important;
    }

    .header-left h1 {
      font-size: 1rem;
    }
  }

  /* ═══ TAB NAVIGATION ═══ */
  .tab-nav {
    display: flex;
    gap: 0;
    margin-bottom: var(--sp-5);
    border-bottom: 1px solid var(--border-subtle);
    overflow-x: auto;
  }

  .tab-btn {
    padding: var(--sp-3) var(--sp-5);
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    color: var(--text-muted);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    margin-bottom: -1px;
    transition: color 0.15s, border-color 0.15s;
    text-transform: uppercase;
    letter-spacing: 0.06em;
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
    color: var(--accent);
    border-bottom-color: var(--accent);
  }

  .tab-content {
    display: none;
  }

  .tab-content.active {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: var(--sp-4);
  }

  /* ═══ SECTION HEADERS (new) ═══ */
  .section-header {
    font-family: var(--font-mono);
    font-size: 0.6rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: var(--sp-3);
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
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: var(--sp-3);
    padding: var(--sp-4);
    background: var(--bg-surface);
    border: 1px solid var(--border-dim);
    border-radius: var(--radius-md);
  }

  .kpi-item {
    text-align: center;
    padding: var(--sp-2) 0;
    border-right: 1px solid var(--border-dim);
  }

  .kpi-item:last-child {
    border-right: none;
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
    letter-spacing: 0.08em;
    margin-top: var(--sp-1);
    font-weight: 500;
  }

  @media (max-width: 768px) {
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
  }

  /* ═══ PRINT STYLES ═══ */
  @media print {
    .grid-bg,
    .refresh-btn,
    .tab-nav {
      display: none !important;
    }

    .tab-content {
      display: grid !important;
      grid-template-columns: repeat(12, 1fr);
      gap: var(--sp-4);
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
