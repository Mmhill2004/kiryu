-- ============================================
-- Zscaler Daily Metrics (Pre-aggregated)
-- Migration: 0005_zscaler_metrics.sql
-- ============================================

CREATE TABLE IF NOT EXISTS zscaler_metrics_daily (
    date TEXT NOT NULL PRIMARY KEY,

    -- ZPA Connector Health
    zpa_connectors_total INTEGER DEFAULT 0,
    zpa_connectors_healthy INTEGER DEFAULT 0,
    zpa_connectors_unhealthy INTEGER DEFAULT 0,
    zpa_connectors_unknown INTEGER DEFAULT 0,
    zpa_connectors_outdated INTEGER DEFAULT 0,

    -- ZPA Application Inventory
    zpa_apps_total INTEGER DEFAULT 0,
    zpa_apps_enabled INTEGER DEFAULT 0,
    zpa_apps_disabled INTEGER DEFAULT 0,
    zpa_server_groups INTEGER DEFAULT 0,
    zpa_segment_groups INTEGER DEFAULT 0,
    zpa_access_policies INTEGER DEFAULT 0,

    -- ZIA Policy Posture
    zia_atp_protections_enabled INTEGER DEFAULT 0,
    zia_ssl_inspection_enabled INTEGER DEFAULT 0,
    zia_url_filter_rules_total INTEGER DEFAULT 0,
    zia_url_filter_rules_enabled INTEGER DEFAULT 0,
    zia_firewall_rules_total INTEGER DEFAULT 0,
    zia_firewall_rules_enabled INTEGER DEFAULT 0,
    zia_dlp_rules_total INTEGER DEFAULT 0,
    zia_dlp_dictionaries INTEGER DEFAULT 0,
    zia_locations_total INTEGER DEFAULT 0,
    zia_users_total INTEGER DEFAULT 0,
    zia_activation_pending INTEGER DEFAULT 0,
    zia_admin_changes_24h INTEGER DEFAULT 0,

    -- Risk360 (manual entry snapshot)
    risk360_overall INTEGER,
    risk360_external_attack_surface INTEGER,
    risk360_compromise INTEGER,
    risk360_lateral_propagation INTEGER,
    risk360_data_loss INTEGER,

    -- Metadata
    metadata TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_zscaler_metrics_date ON zscaler_metrics_daily(date);
