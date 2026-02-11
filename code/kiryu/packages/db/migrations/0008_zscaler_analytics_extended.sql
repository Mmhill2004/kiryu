-- Migration 0008: Extended ZINS analytics storage
-- Adds aggregate counts and JSON snapshots to track Zscaler analytics trends over time
-- Previously only 3 numbers (traffic_allowed, traffic_blocked, threats_total) were stored

-- Aggregate counts for trend tracking
ALTER TABLE zscaler_metrics_daily ADD COLUMN analytics_shadow_it_total INTEGER DEFAULT 0;
ALTER TABLE zscaler_metrics_daily ADD COLUMN analytics_shadow_it_high_risk INTEGER DEFAULT 0;
ALTER TABLE zscaler_metrics_daily ADD COLUMN analytics_threat_categories_count INTEGER DEFAULT 0;

-- JSON snapshots of top-N breakdowns (stored as JSON arrays for historical context)
ALTER TABLE zscaler_metrics_daily ADD COLUMN analytics_top_protocols TEXT;
ALTER TABLE zscaler_metrics_daily ADD COLUMN analytics_top_locations TEXT;
ALTER TABLE zscaler_metrics_daily ADD COLUMN analytics_top_threats TEXT;
ALTER TABLE zscaler_metrics_daily ADD COLUMN analytics_top_incidents TEXT;
ALTER TABLE zscaler_metrics_daily ADD COLUMN analytics_top_shadow_it TEXT;
