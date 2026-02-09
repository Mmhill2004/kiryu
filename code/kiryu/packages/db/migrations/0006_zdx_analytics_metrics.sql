-- ============================================
-- ZDX Performance + Analytics + Enhanced ZIA/ZPA Columns
-- Migration: 0006_zdx_analytics_metrics.sql
-- ============================================

-- ZDX Performance columns
ALTER TABLE zscaler_metrics_daily ADD COLUMN zdx_avg_score REAL;
ALTER TABLE zscaler_metrics_daily ADD COLUMN zdx_score_category TEXT;
ALTER TABLE zscaler_metrics_daily ADD COLUMN zdx_apps_monitored INTEGER DEFAULT 0;
ALTER TABLE zscaler_metrics_daily ADD COLUMN zdx_lowest_app_score REAL;
ALTER TABLE zscaler_metrics_daily ADD COLUMN zdx_total_devices INTEGER DEFAULT 0;
ALTER TABLE zscaler_metrics_daily ADD COLUMN zdx_active_alerts INTEGER DEFAULT 0;
ALTER TABLE zscaler_metrics_daily ADD COLUMN zdx_critical_alerts INTEGER DEFAULT 0;

-- Analytics GraphQL columns
ALTER TABLE zscaler_metrics_daily ADD COLUMN analytics_traffic_allowed INTEGER DEFAULT 0;
ALTER TABLE zscaler_metrics_daily ADD COLUMN analytics_traffic_blocked INTEGER DEFAULT 0;
ALTER TABLE zscaler_metrics_daily ADD COLUMN analytics_threats_total INTEGER DEFAULT 0;

-- Enhanced ZIA columns
ALTER TABLE zscaler_metrics_daily ADD COLUMN zia_custom_url_categories INTEGER DEFAULT 0;
ALTER TABLE zscaler_metrics_daily ADD COLUMN zia_sandbox_enabled INTEGER DEFAULT 0;
ALTER TABLE zscaler_metrics_daily ADD COLUMN zia_bandwidth_rules INTEGER DEFAULT 0;

-- Enhanced ZPA columns
ALTER TABLE zscaler_metrics_daily ADD COLUMN zpa_connector_groups INTEGER DEFAULT 0;
ALTER TABLE zscaler_metrics_daily ADD COLUMN zpa_apps_double_encrypt INTEGER DEFAULT 0;
