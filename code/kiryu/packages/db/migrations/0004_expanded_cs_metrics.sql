-- Migration 0004: Add expanded CrowdStrike metrics columns
-- Supports: CrowdScore, Spotlight Vulnerabilities, Identity Protection, Discover, Sensor Usage

-- CrowdScore
ALTER TABLE crowdstrike_metrics_daily ADD COLUMN crowdscore INTEGER DEFAULT NULL;
ALTER TABLE crowdstrike_metrics_daily ADD COLUMN crowdscore_adjusted INTEGER DEFAULT NULL;

-- Vulnerabilities (Spotlight)
ALTER TABLE crowdstrike_metrics_daily ADD COLUMN vulns_total INTEGER DEFAULT 0;
ALTER TABLE crowdstrike_metrics_daily ADD COLUMN vulns_critical INTEGER DEFAULT 0;
ALTER TABLE crowdstrike_metrics_daily ADD COLUMN vulns_high INTEGER DEFAULT 0;
ALTER TABLE crowdstrike_metrics_daily ADD COLUMN vulns_medium INTEGER DEFAULT 0;
ALTER TABLE crowdstrike_metrics_daily ADD COLUMN vulns_low INTEGER DEFAULT 0;
ALTER TABLE crowdstrike_metrics_daily ADD COLUMN vulns_with_exploits INTEGER DEFAULT 0;
ALTER TABLE crowdstrike_metrics_daily ADD COLUMN vulns_unique_cves INTEGER DEFAULT 0;

-- Identity Protection
ALTER TABLE crowdstrike_metrics_daily ADD COLUMN idp_detections_total INTEGER DEFAULT 0;
ALTER TABLE crowdstrike_metrics_daily ADD COLUMN idp_detections_critical INTEGER DEFAULT 0;
ALTER TABLE crowdstrike_metrics_daily ADD COLUMN idp_detections_high INTEGER DEFAULT 0;
ALTER TABLE crowdstrike_metrics_daily ADD COLUMN idp_targeted_accounts INTEGER DEFAULT 0;
ALTER TABLE crowdstrike_metrics_daily ADD COLUMN idp_source_endpoints INTEGER DEFAULT 0;

-- Discover + Sensors
ALTER TABLE crowdstrike_metrics_daily ADD COLUMN discover_total_apps INTEGER DEFAULT 0;
ALTER TABLE crowdstrike_metrics_daily ADD COLUMN discover_unmanaged_assets INTEGER DEFAULT 0;
ALTER TABLE crowdstrike_metrics_daily ADD COLUMN discover_sensor_coverage REAL DEFAULT 0;
ALTER TABLE crowdstrike_metrics_daily ADD COLUMN sensor_total_count INTEGER DEFAULT 0;
