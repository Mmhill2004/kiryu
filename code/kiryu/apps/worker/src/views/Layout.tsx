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
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style>{styles}</style>
      </head>
      <body hx-boost="true">
        <div class="noise-overlay"></div>
        <div class="gradient-orb gradient-orb-1"></div>
        <div class="gradient-orb gradient-orb-2"></div>
        {children}
      </body>
    </html>
  );
};

const styles = `
  :root {
    /* Base palette - sophisticated slate */
    --bg-deep: #0a0e14;
    --bg-primary: #0d1117;
    --bg-elevated: #151b23;
    --bg-card: #1a212b;
    --bg-hover: #222c3a;

    /* Borders & Lines */
    --border-subtle: rgba(255, 255, 255, 0.06);
    --border-default: rgba(255, 255, 255, 0.1);
    --border-strong: rgba(255, 255, 255, 0.15);

    /* Text hierarchy */
    --text-primary: #f0f4f8;
    --text-secondary: #8b9cb3;
    --text-tertiary: #5c6f8a;
    --text-muted: #3d4f66;

    /* Accent - warm amber gold */
    --accent-primary: #f59e0b;
    --accent-secondary: #fbbf24;
    --accent-glow: rgba(245, 158, 11, 0.15);

    /* Severity spectrum */
    --critical: #ef4444;
    --critical-bg: rgba(239, 68, 68, 0.12);
    --critical-glow: rgba(239, 68, 68, 0.3);

    --high: #f97316;
    --high-bg: rgba(249, 115, 22, 0.12);

    --medium: #eab308;
    --medium-bg: rgba(234, 179, 8, 0.12);

    --low: #22c55e;
    --low-bg: rgba(34, 197, 94, 0.12);

    --info: #3b82f6;
    --info-bg: rgba(59, 130, 246, 0.12);

    /* Status */
    --healthy: #10b981;
    --healthy-bg: rgba(16, 185, 129, 0.12);
    --error: #ef4444;
    --not-configured: #6b7280;

    /* Spacing scale */
    --space-xs: 0.25rem;
    --space-sm: 0.5rem;
    --space-md: 1rem;
    --space-lg: 1.5rem;
    --space-xl: 2rem;
    --space-2xl: 3rem;

    /* Typography */
    --font-display: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

    /* Effects */
    --glass-bg: rgba(26, 33, 43, 0.7);
    --glass-border: rgba(255, 255, 255, 0.08);
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
    --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.5);
    --shadow-glow: 0 0 40px rgba(245, 158, 11, 0.1);
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    font-size: 15px;
  }

  body {
    font-family: var(--font-display);
    background: var(--bg-deep);
    color: var(--text-primary);
    min-height: 100vh;
    padding: var(--space-xl);
    position: relative;
    overflow-x: hidden;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Subtle noise texture overlay */
  .noise-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    opacity: 0.02;
    pointer-events: none;
    z-index: 1000;
  }

  /* Ambient gradient orbs */
  .gradient-orb {
    position: fixed;
    border-radius: 50%;
    filter: blur(100px);
    pointer-events: none;
    z-index: -1;
  }

  .gradient-orb-1 {
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(245, 158, 11, 0.08) 0%, transparent 70%);
    top: -200px;
    right: -100px;
    animation: float 20s ease-in-out infinite;
  }

  .gradient-orb-2 {
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.06) 0%, transparent 70%);
    bottom: -150px;
    left: -100px;
    animation: float 25s ease-in-out infinite reverse;
  }

  @keyframes float {
    0%, 100% { transform: translate(0, 0); }
    50% { transform: translate(30px, 20px); }
  }

  /* Header */
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-xl);
    padding-bottom: var(--space-lg);
    border-bottom: 1px solid var(--border-subtle);
    flex-wrap: wrap;
    gap: var(--space-md);
    position: relative;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--space-md);
  }

  .logo-mark {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-glow);
    position: relative;
  }

  .logo-mark::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 13px;
    background: linear-gradient(135deg, var(--accent-secondary), transparent);
    z-index: -1;
    opacity: 0.5;
  }

  .logo-mark svg {
    width: 26px;
    height: 26px;
    color: var(--bg-deep);
  }

  .header-title {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .header-left h1 {
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .header-left p {
    color: var(--text-tertiary);
    font-size: 0.8rem;
    font-weight: 400;
    letter-spacing: 0.02em;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  /* Form controls */
  select, button {
    font-family: var(--font-display);
    background: var(--bg-card);
    border: 1px solid var(--border-default);
    border-radius: 8px;
    padding: 0.6rem 1rem;
    color: var(--text-primary);
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    backdrop-filter: blur(10px);
  }

  select {
    padding-right: 2rem;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b9cb3' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.75rem center;
  }

  select:hover, button:hover {
    background: var(--bg-hover);
    border-color: var(--border-strong);
  }

  select:focus, button:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px var(--accent-glow);
  }

  .refresh-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
    border: none;
    color: var(--bg-deep);
    font-weight: 600;
    padding: 0.6rem 1.25rem;
  }

  .refresh-btn:hover {
    background: linear-gradient(135deg, var(--accent-secondary), var(--accent-primary));
    transform: translateY(-1px);
    box-shadow: var(--shadow-glow);
  }

  .refresh-btn .icon {
    width: 16px;
    height: 16px;
  }

  /* Grid system */
  .grid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: var(--space-lg);
  }

  /* Card styles */
  .card {
    background: var(--glass-bg);
    backdrop-filter: blur(20px);
    border: 1px solid var(--glass-border);
    border-radius: 16px;
    padding: var(--space-lg);
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
  }

  .card:hover {
    border-color: var(--border-strong);
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }

  .card-title {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-tertiary);
    margin-bottom: var(--space-md);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .card-title::before {
    content: '';
    width: 3px;
    height: 12px;
    background: var(--accent-primary);
    border-radius: 2px;
  }

  /* Column spans */
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
    body { padding: var(--space-md); }
  }

  /* Metric grid */
  .metric-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-md);
  }

  @media (max-width: 1024px) {
    .metric-grid { grid-template-columns: repeat(2, 1fr); }
  }

  /* Metric cards */
  .metric-card {
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: 12px;
    padding: var(--space-md) var(--space-lg);
    text-align: center;
    position: relative;
    overflow: hidden;
    transition: all 0.2s ease;
  }

  .metric-card::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 60%;
    height: 2px;
    background: var(--border-subtle);
    border-radius: 2px;
    transition: all 0.3s ease;
  }

  .metric-card:hover {
    border-color: var(--border-default);
    background: var(--bg-hover);
  }

  .metric-card:hover::after {
    width: 80%;
    background: var(--accent-primary);
  }

  .metric-value {
    font-family: var(--font-mono);
    font-size: 2rem;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.02em;
    color: var(--text-primary);
  }

  .metric-label {
    font-size: 0.7rem;
    color: var(--text-tertiary);
    margin-top: var(--space-sm);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 500;
  }

  /* Severity colors */
  .severity-critical { color: var(--critical) !important; }
  .severity-critical .metric-card { border-color: var(--critical-bg); }
  .severity-high { color: var(--high) !important; }
  .severity-medium { color: var(--medium) !important; }
  .severity-low { color: var(--low) !important; }

  .metric-card.severity-critical { border-left: 3px solid var(--critical); }
  .metric-card.severity-high { border-left: 3px solid var(--high); }
  .metric-card.severity-medium { border-left: 3px solid var(--medium); }
  .metric-card.severity-low { border-left: 3px solid var(--low); }

  /* Security Score Ring */
  .score-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-md) 0;
  }

  .score-ring {
    width: 140px;
    height: 140px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    background: var(--bg-elevated);
  }

  .score-ring::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    padding: 4px;
    background: conic-gradient(
      var(--score-color, var(--healthy)) calc(var(--score) * 3.6deg),
      var(--border-subtle) 0
    );
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
  }

  .score-ring::after {
    content: '';
    position: absolute;
    inset: 8px;
    border-radius: 50%;
    background: var(--bg-card);
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
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1;
  }

  .score-label {
    font-size: 0.7rem;
    color: var(--text-tertiary);
    margin-top: 4px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  /* Orbital animation rings */
  .score-ring .orbit {
    position: absolute;
    border-radius: 50%;
    border: 1px dashed var(--border-subtle);
    animation: orbit 20s linear infinite;
  }

  .score-ring .orbit-1 {
    inset: -15px;
    animation-duration: 30s;
  }

  .score-ring .orbit-2 {
    inset: -30px;
    animation-duration: 45s;
    animation-direction: reverse;
  }

  .score-ring .orbit-dot {
    position: absolute;
    width: 6px;
    height: 6px;
    background: var(--accent-primary);
    border-radius: 50%;
    top: -3px;
    left: 50%;
    transform: translateX(-50%);
    box-shadow: 0 0 10px var(--accent-primary);
  }

  @keyframes orbit {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 0.85rem;
  }

  th, td {
    padding: var(--space-sm) var(--space-md);
    text-align: left;
  }

  th {
    color: var(--text-tertiary);
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.65rem;
    letter-spacing: 0.1em;
    border-bottom: 1px solid var(--border-default);
    background: var(--bg-elevated);
  }

  th:first-child { border-radius: 8px 0 0 0; }
  th:last-child { border-radius: 0 8px 0 0; }

  td {
    border-bottom: 1px solid var(--border-subtle);
    color: var(--text-secondary);
  }

  tr:hover td {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  tr:last-child td { border-bottom: none; }
  tr:last-child td:first-child { border-radius: 0 0 0 8px; }
  tr:last-child td:last-child { border-radius: 0 0 8px 0; }

  /* Badges */
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0.25rem 0.6rem;
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .badge::before {
    content: '';
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
  }

  .badge-critical { background: var(--critical-bg); color: var(--critical); }
  .badge-high { background: var(--high-bg); color: var(--high); }
  .badge-medium { background: var(--medium-bg); color: var(--medium); }
  .badge-low { background: var(--low-bg); color: var(--low); }
  .badge-info { background: var(--info-bg); color: var(--info); }
  .badge-informational { background: rgba(100, 116, 139, 0.15); color: var(--text-tertiary); }

  /* Platform status list */
  .platform-list {
    list-style: none;
  }

  .platform-item {
    display: flex;
    flex-direction: column;
    padding: var(--space-sm) 0;
    border-bottom: 1px solid var(--border-subtle);
  }

  .platform-item:last-child {
    border-bottom: none;
  }

  .platform-name {
    font-weight: 500;
    text-transform: capitalize;
    color: var(--text-primary);
    font-size: 0.9rem;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
    margin-right: var(--space-sm);
    position: relative;
  }

  .status-dot::after {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    background: inherit;
    opacity: 0.3;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.3; }
    50% { transform: scale(1.2); opacity: 0.1; }
  }

  .status-healthy { background: var(--healthy); }
  .status-error { background: var(--error); }
  .status-not_configured { background: var(--not-configured); }
  .status-unknown { background: var(--not-configured); }

  /* Horizontal platform grid */
  .platform-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: var(--space-md);
  }

  .platform-card {
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: 12px;
    padding: var(--space-md);
    text-align: center;
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
  }

  .platform-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--border-subtle);
    transition: background 0.2s ease;
  }

  .platform-card.platform-healthy::before {
    background: var(--healthy);
  }

  .platform-card.platform-error::before {
    background: var(--error);
  }

  .platform-card.platform-not_configured::before {
    background: var(--not-configured);
  }

  .platform-card:hover {
    border-color: var(--border-default);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  .platform-card-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    margin-bottom: var(--space-sm);
  }

  .platform-icon {
    font-size: 1.5rem;
    line-height: 1;
  }

  .platform-card .platform-name {
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: capitalize;
  }

  .platform-card-status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-xs);
    margin-top: var(--space-xs);
  }

  .platform-card-status .status-text {
    font-size: 0.75rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .platform-card-sync {
    font-size: 0.7rem;
    color: var(--text-muted);
    margin-top: var(--space-xs);
    font-family: var(--font-mono);
  }

  .platform-card-error {
    font-size: 0.65rem;
    color: var(--error);
    margin-top: var(--space-xs);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Chart bars */
  .chart-bar {
    display: flex;
    align-items: center;
    margin: var(--space-sm) 0;
  }

  .chart-label {
    width: 70px;
    font-size: 0.8rem;
    text-transform: capitalize;
    color: var(--text-secondary);
  }

  .chart-track {
    flex: 1;
    height: 28px;
    background: var(--bg-elevated);
    border-radius: 6px;
    overflow: hidden;
    margin: 0 var(--space-sm);
    border: 1px solid var(--border-subtle);
  }

  .chart-fill {
    height: 100%;
    border-radius: 5px;
    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .chart-fill::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%);
    animation: shimmer 2s infinite;
  }

  @keyframes shimmer {
    from { transform: translateX(-100%); }
    to { transform: translateX(100%); }
  }

  .chart-fill-endpoint { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
  .chart-fill-email { background: linear-gradient(90deg, #8b5cf6, #a78bfa); }
  .chart-fill-web { background: linear-gradient(90deg, #10b981, #34d399); }
  .chart-fill-cloud { background: linear-gradient(90deg, #f59e0b, #fbbf24); }

  .chart-value {
    width: 45px;
    text-align: right;
    font-family: var(--font-mono);
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--text-primary);
  }

  /* Stat rows */
  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-sm) 0;
    border-bottom: 1px solid var(--border-subtle);
  }

  .stat-row:last-child {
    border-bottom: none;
  }

  .stat-label {
    color: var(--text-secondary);
    font-size: 0.85rem;
  }

  .stat-value {
    font-family: var(--font-mono);
    font-weight: 600;
    font-size: 1rem;
    color: var(--text-primary);
  }

  .tactic-list .stat-label,
  .technique-list .stat-label {
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Error banner */
  .error-banner {
    background: var(--critical-bg);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 12px;
    padding: var(--space-md) var(--space-lg);
    margin-bottom: var(--space-lg);
    color: var(--critical);
    position: relative;
    overflow: hidden;
  }

  .error-banner::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: var(--critical);
  }

  .warning-banner {
    background: var(--medium-bg);
    border: 1px solid rgba(234, 179, 8, 0.3);
    color: var(--medium);
  }

  .warning-banner::before {
    background: var(--medium);
  }

  /* No data state */
  .no-data {
    color: var(--text-muted);
    font-style: italic;
    text-align: center;
    padding: var(--space-lg);
    font-size: 0.85rem;
  }

  /* Footer */
  footer {
    text-align: center;
    margin-top: var(--space-2xl);
    padding-top: var(--space-lg);
    border-top: 1px solid var(--border-subtle);
    color: var(--text-muted);
    font-size: 0.8rem;
  }

  footer p {
    margin: var(--space-xs) 0;
  }

  /* Icons */
  .icon {
    width: 20px;
    height: 20px;
    display: inline-block;
    flex-shrink: 0;
  }

  /* Loading states */
  .htmx-request {
    opacity: 0.6;
    pointer-events: none;
  }

  .htmx-request .refresh-btn .icon {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* Trend indicators */
  .metric-trend {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    font-weight: 600;
    margin-top: var(--space-xs);
    letter-spacing: 0.02em;
  }

  .trend-good {
    color: var(--healthy);
  }

  .trend-bad {
    color: var(--critical);
  }

  .metric-source {
    font-family: var(--font-mono);
    font-size: 0.55rem;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-top: var(--space-xs);
    padding: 1px 6px;
    border-radius: 4px;
    border: 1px solid var(--border-subtle);
    display: inline-block;
  }

  /* Cache indicator */
  .cache-indicator {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: 0.75rem;
    color: var(--text-tertiary);
    font-family: var(--font-mono);
  }

  .cache-indicator a {
    font-family: var(--font-display);
  }

  /* Report link button */
  .report-link {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.6rem 1rem;
    background: var(--bg-card);
    border: 1px solid var(--border-default);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 0.85rem;
    font-weight: 500;
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .report-link:hover {
    background: var(--bg-hover);
    border-color: var(--border-strong);
    text-decoration: none;
  }

  .report-link svg {
    width: 16px;
    height: 16px;
  }

  /* Links */
  a {
    color: var(--accent-primary);
    text-decoration: none;
    transition: color 0.2s ease;
  }

  a:hover {
    color: var(--accent-secondary);
    text-decoration: underline;
  }

  /* Responsive table wrapper */
  .card table {
    display: block;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  /* Section title with count */
  .section-title {
    display: flex;
    align-items: baseline;
    gap: var(--space-sm);
  }

  .section-count {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--text-tertiary);
    font-weight: 600;
  }

  /* Animated scan line effect for critical cards */
  .card.has-critical::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--critical), transparent);
    animation: scan 3s ease-in-out infinite;
  }

  @keyframes scan {
    0% { transform: translateX(-100%); opacity: 0; }
    50% { opacity: 1; }
    100% { transform: translateX(100%); opacity: 0; }
  }

  /* Custom scrollbar */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: var(--bg-elevated);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb {
    background: var(--border-strong);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: var(--text-muted);
  }

  /* Responsive grid adjustments */
  @media (max-width: 768px) {
    .metric-grid[style*="repeat(5"] {
      grid-template-columns: repeat(2, 1fr) !important;
    }

    .metric-grid[style*="repeat(6"] {
      grid-template-columns: repeat(2, 1fr) !important;
    }

    .header-left h1 {
      font-size: 1.25rem;
    }
  }

  /* Print styles */
  @media print {
    .noise-overlay,
    .gradient-orb,
    .refresh-btn {
      display: none !important;
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
