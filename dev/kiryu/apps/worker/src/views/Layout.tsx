import type { FC, PropsWithChildren } from 'hono/jsx';

export const Layout: FC<PropsWithChildren<{ title?: string }>> = ({ children, title = 'Security Dashboard' }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <script src="https://unpkg.com/htmx.org@1.9.10"></script>
        <style>{styles}</style>
      </head>
      <body hx-boost="true">
        {children}
      </body>
    </html>
  );
};

const styles = `
  :root {
    --bg: #0f172a;
    --card-bg: #1e293b;
    --card-border: #334155;
    --text: #f1f5f9;
    --text-muted: #94a3b8;
    --critical: #ef4444;
    --high: #f97316;
    --medium: #eab308;
    --low: #22c55e;
    --info: #3b82f6;
    --healthy: #22c55e;
    --error: #ef4444;
    --not-configured: #6b7280;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    padding: 1.5rem;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .header-left h1 {
    font-size: 1.5rem;
    font-weight: 700;
  }

  .header-left p {
    color: var(--text-muted);
    font-size: 0.875rem;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  select, button {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 0.5rem;
    padding: 0.5rem 1rem;
    color: var(--text);
    font-size: 0.875rem;
    cursor: pointer;
  }

  select:focus, button:focus {
    outline: 2px solid var(--info);
    outline-offset: 2px;
  }

  button:hover {
    background: #334155;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 1.5rem;
  }

  .card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 0.75rem;
    padding: 1.25rem;
  }

  .card-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-muted);
    margin-bottom: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .col-3 { grid-column: span 3; }
  .col-4 { grid-column: span 4; }
  .col-5 { grid-column: span 5; }
  .col-6 { grid-column: span 6; }
  .col-9 { grid-column: span 9; }
  .col-12 { grid-column: span 12; }

  @media (max-width: 1024px) {
    .col-3, .col-4, .col-5, .col-6, .col-9 { grid-column: span 6; }
  }

  @media (max-width: 640px) {
    .col-3, .col-4, .col-5, .col-6, .col-9 { grid-column: span 12; }
  }

  .metric-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
  }

  @media (max-width: 768px) {
    .metric-grid { grid-template-columns: repeat(2, 1fr); }
  }

  .metric-card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 0.5rem;
    padding: 1rem;
    text-align: center;
  }

  .metric-value {
    font-size: 2rem;
    font-weight: 700;
    line-height: 1;
  }

  .metric-label {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 0.5rem;
    text-transform: uppercase;
  }

  .severity-critical { color: var(--critical); border-color: var(--critical); }
  .severity-high { color: var(--high); border-color: var(--high); }
  .severity-medium { color: var(--medium); border-color: var(--medium); }
  .severity-low { color: var(--low); border-color: var(--low); }

  .score-ring {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
    position: relative;
  }

  .score-value {
    font-size: 2.5rem;
    font-weight: 700;
  }

  .score-good { background: conic-gradient(var(--healthy) calc(var(--score) * 3.6deg), var(--card-border) 0); }
  .score-medium { background: conic-gradient(var(--medium) calc(var(--score) * 3.6deg), var(--card-border) 0); }
  .score-bad { background: conic-gradient(var(--critical) calc(var(--score) * 3.6deg), var(--card-border) 0); }

  .score-inner {
    width: 100px;
    height: 100px;
    background: var(--card-bg);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
  }

  .score-label {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  th, td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--card-border);
  }

  th {
    color: var(--text-muted);
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.75rem;
  }

  .badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .badge-critical { background: rgba(239, 68, 68, 0.2); color: var(--critical); }
  .badge-high { background: rgba(249, 115, 22, 0.2); color: var(--high); }
  .badge-medium { background: rgba(234, 179, 8, 0.2); color: var(--medium); }
  .badge-low { background: rgba(34, 197, 94, 0.2); color: var(--low); }

  .platform-list {
    list-style: none;
  }

  .platform-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--card-border);
  }

  .platform-item:last-child {
    border-bottom: none;
  }

  .platform-name {
    font-weight: 500;
    text-transform: capitalize;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 0.5rem;
  }

  .status-healthy { background: var(--healthy); }
  .status-error { background: var(--error); }
  .status-not_configured { background: var(--not-configured); }
  .status-unknown { background: var(--not-configured); }

  .chart-bar {
    display: flex;
    align-items: center;
    margin: 0.5rem 0;
  }

  .chart-label {
    width: 80px;
    font-size: 0.875rem;
    text-transform: capitalize;
  }

  .chart-track {
    flex: 1;
    height: 24px;
    background: var(--card-border);
    border-radius: 4px;
    overflow: hidden;
    margin: 0 0.75rem;
  }

  .chart-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .chart-fill-endpoint { background: var(--critical); }
  .chart-fill-email { background: var(--high); }
  .chart-fill-web { background: var(--medium); }
  .chart-fill-cloud { background: var(--info); }

  .chart-value {
    width: 40px;
    text-align: right;
    font-weight: 600;
  }

  footer {
    text-align: center;
    margin-top: 2rem;
    color: var(--text-muted);
    font-size: 0.875rem;
  }

  .loading {
    opacity: 0.5;
  }

  .htmx-request .loading-indicator {
    display: inline-block;
  }

  .error-banner {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 1.5rem;
    color: var(--critical);
  }

  .icon {
    width: 24px;
    height: 24px;
    display: inline-block;
  }

  .shield-icon {
    color: var(--info);
  }
`;
