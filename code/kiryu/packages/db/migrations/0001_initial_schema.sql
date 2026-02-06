-- Security Dashboard Database Schema
-- Migration: 0001_initial_schema.sql

-- ============================================
-- Security Events Table
-- Stores normalized security events from all platforms
-- ============================================
CREATE TABLE IF NOT EXISTS security_events (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL, -- crowdstrike, abnormal, zscaler, microsoft
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium', -- critical, high, medium, low, info
    title TEXT NOT NULL,
    description TEXT,
    threat_count INTEGER DEFAULT 1,
    raw_data TEXT, -- JSON blob of original data
    created_at TEXT NOT NULL,
    synced_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_security_events_source ON security_events(source);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_source_created ON security_events(source, created_at);

-- ============================================
-- Incidents Table
-- Tracks ongoing security incidents
-- ============================================
CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'open', -- open, investigating, resolved, closed
    assigned_to TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT,
    raw_data TEXT
);

CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_source ON incidents(source);

-- ============================================
-- Tickets Table
-- Stores service desk tickets from Salesforce
-- ============================================
CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    case_number TEXT UNIQUE,
    subject TEXT,
    description TEXT,
    status TEXT NOT NULL,
    priority TEXT,
    ticket_type TEXT,
    created_at TEXT NOT NULL,
    closed_at TEXT,
    resolution_time_hours REAL,
    owner_id TEXT,
    contact_id TEXT,
    synced_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(created_at);

-- ============================================
-- Platform Status Table
-- Tracks health and sync status of each platform
-- ============================================
CREATE TABLE IF NOT EXISTS platform_status (
    platform TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'unknown', -- healthy, error, not_configured, unknown
    last_sync TEXT,
    last_success TEXT,
    last_error TEXT,
    error_message TEXT,
    metadata TEXT, -- JSON blob for platform-specific data
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- Sync Logs Table
-- Audit log for data sync operations
-- ============================================
CREATE TABLE IF NOT EXISTS sync_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    status TEXT NOT NULL, -- running, success, failed
    started_at TEXT NOT NULL,
    completed_at TEXT,
    records_synced INTEGER DEFAULT 0,
    error_message TEXT,
    metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_platform ON sync_logs(platform);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started ON sync_logs(started_at);

-- ============================================
-- Metrics Table
-- Stores point-in-time metrics for trending
-- ============================================
CREATE TABLE IF NOT EXISTS metrics (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    metric_type TEXT NOT NULL,
    value REAL NOT NULL,
    metadata TEXT, -- JSON blob for additional context
    recorded_at TEXT NOT NULL,
    UNIQUE(source, metric_type, recorded_at)
);

CREATE INDEX IF NOT EXISTS idx_metrics_source_type ON metrics(source, metric_type);
CREATE INDEX IF NOT EXISTS idx_metrics_recorded ON metrics(recorded_at);

-- ============================================
-- Daily Summaries Table
-- Pre-aggregated daily statistics for fast dashboard queries
-- ============================================
CREATE TABLE IF NOT EXISTS daily_summaries (
    date TEXT NOT NULL,
    source TEXT NOT NULL,
    total_events INTEGER DEFAULT 0,
    critical_count INTEGER DEFAULT 0,
    high_count INTEGER DEFAULT 0,
    medium_count INTEGER DEFAULT 0,
    low_count INTEGER DEFAULT 0,
    unique_threats INTEGER DEFAULT 0,
    metadata TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (date, source)
);

CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries(date);

-- ============================================
-- Audit Log Table
-- Tracks all API access and changes
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    resource_id TEXT,
    user_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    request_id TEXT,
    details TEXT, -- JSON blob
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- ============================================
-- Initialize platform status records
-- ============================================
INSERT OR IGNORE INTO platform_status (platform, status) VALUES ('crowdstrike', 'not_configured');
INSERT OR IGNORE INTO platform_status (platform, status) VALUES ('abnormal', 'not_configured');
INSERT OR IGNORE INTO platform_status (platform, status) VALUES ('zscaler', 'not_configured');
INSERT OR IGNORE INTO platform_status (platform, status) VALUES ('microsoft', 'not_configured');
INSERT OR IGNORE INTO platform_status (platform, status) VALUES ('salesforce', 'not_configured');
