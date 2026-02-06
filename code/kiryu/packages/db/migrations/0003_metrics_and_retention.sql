-- ============================================
-- CrowdStrike Daily Metrics (Pre-aggregated)
-- Migration: 0003_metrics_and_retention.sql
-- ============================================

CREATE TABLE IF NOT EXISTS crowdstrike_metrics_daily (
    date TEXT NOT NULL,

    -- Alert metrics
    alerts_total INTEGER DEFAULT 0,
    alerts_critical INTEGER DEFAULT 0,
    alerts_high INTEGER DEFAULT 0,
    alerts_medium INTEGER DEFAULT 0,
    alerts_low INTEGER DEFAULT 0,
    alerts_informational INTEGER DEFAULT 0,
    alerts_new INTEGER DEFAULT 0,
    alerts_in_progress INTEGER DEFAULT 0,
    alerts_resolved INTEGER DEFAULT 0,

    -- Host metrics
    hosts_total INTEGER DEFAULT 0,
    hosts_online INTEGER DEFAULT 0,
    hosts_offline INTEGER DEFAULT 0,
    hosts_contained INTEGER DEFAULT 0,
    hosts_stale INTEGER DEFAULT 0,
    hosts_reduced_functionality INTEGER DEFAULT 0,
    hosts_windows INTEGER DEFAULT 0,
    hosts_mac INTEGER DEFAULT 0,
    hosts_linux INTEGER DEFAULT 0,

    -- Incident metrics
    incidents_total INTEGER DEFAULT 0,
    incidents_open INTEGER DEFAULT 0,
    incidents_closed INTEGER DEFAULT 0,
    incidents_critical INTEGER DEFAULT 0,
    incidents_high INTEGER DEFAULT 0,
    incidents_medium INTEGER DEFAULT 0,
    incidents_low INTEGER DEFAULT 0,
    incidents_with_lateral_movement INTEGER DEFAULT 0,
    incidents_avg_fine_score REAL DEFAULT 0,
    incidents_mttr_hours REAL,

    -- ZTA metrics
    zta_total_assessed INTEGER DEFAULT 0,
    zta_avg_score REAL DEFAULT 0,
    zta_excellent INTEGER DEFAULT 0,
    zta_good INTEGER DEFAULT 0,
    zta_fair INTEGER DEFAULT 0,
    zta_poor INTEGER DEFAULT 0,

    -- NGSIEM metrics
    ngsiem_repositories INTEGER DEFAULT 0,
    ngsiem_total_ingest_gb REAL DEFAULT 0,
    ngsiem_events_total INTEGER DEFAULT 0,
    ngsiem_auth_events INTEGER DEFAULT 0,
    ngsiem_network_events INTEGER DEFAULT 0,
    ngsiem_process_events INTEGER DEFAULT 0,
    ngsiem_dns_events INTEGER DEFAULT 0,

    -- OverWatch metrics
    overwatch_total_detections INTEGER DEFAULT 0,
    overwatch_active_escalations INTEGER DEFAULT 0,
    overwatch_resolved_30d INTEGER DEFAULT 0,
    overwatch_critical INTEGER DEFAULT 0,
    overwatch_high INTEGER DEFAULT 0,
    overwatch_medium INTEGER DEFAULT 0,
    overwatch_low INTEGER DEFAULT 0,

    -- Computed security score
    security_score INTEGER DEFAULT 100,

    -- Overflow data (tactics, techniques, top event types, etc.)
    metadata TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    PRIMARY KEY (date)
);

CREATE INDEX IF NOT EXISTS idx_cs_metrics_date ON crowdstrike_metrics_daily(date);

-- ============================================
-- Data Retention Tracking
-- ============================================
CREATE TABLE IF NOT EXISTS data_retention_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_at TEXT NOT NULL,
    table_name TEXT NOT NULL,
    records_deleted INTEGER DEFAULT 0,
    oldest_date_removed TEXT,
    newest_date_removed TEXT
);
