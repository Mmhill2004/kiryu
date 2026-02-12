-- Migration 0009: Microsoft metrics daily table
-- Covers ALL Microsoft modules for historical trend tracking:
-- Security Alerts, Defender, Secure Score, Identity, Incidents, Machines,
-- Assessments, Compliance, and Intune (Devices, Policies, Apps)

CREATE TABLE IF NOT EXISTS microsoft_metrics_daily (
  date TEXT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT '',

  -- Security Alerts (Graph)
  alerts_total INTEGER DEFAULT 0,
  alerts_active INTEGER DEFAULT 0,
  alerts_high INTEGER DEFAULT 0,
  alerts_medium INTEGER DEFAULT 0,
  alerts_low INTEGER DEFAULT 0,

  -- Defender for Endpoint
  defender_alerts_total INTEGER DEFAULT 0,
  defender_alerts_active INTEGER DEFAULT 0,

  -- Secure Score
  secure_score_current REAL DEFAULT 0,
  secure_score_max REAL DEFAULT 0,

  -- Identity Risk
  risky_users_total INTEGER DEFAULT 0,
  risky_users_unresolved INTEGER DEFAULT 0,
  risky_users_high INTEGER DEFAULT 0,

  -- Incidents
  incidents_total INTEGER DEFAULT 0,
  incidents_open INTEGER DEFAULT 0,

  -- Machines (Defender for Endpoint)
  machines_total INTEGER DEFAULT 0,
  machines_onboarded INTEGER DEFAULT 0,
  machines_stale INTEGER DEFAULT 0,
  machines_high_risk INTEGER DEFAULT 0,

  -- Cloud Defender Assessments
  assessments_total INTEGER DEFAULT 0,
  assessments_pass_rate REAL DEFAULT 0,

  -- Device Compliance (basic)
  compliance_compliant INTEGER DEFAULT 0,
  compliance_non_compliant INTEGER DEFAULT 0,
  compliance_unknown INTEGER DEFAULT 0,

  -- Intune Devices
  intune_devices_total INTEGER DEFAULT 0,
  intune_compliant INTEGER DEFAULT 0,
  intune_non_compliant INTEGER DEFAULT 0,
  intune_stale INTEGER DEFAULT 0,
  intune_encrypted INTEGER DEFAULT 0,
  intune_recent_enrollments INTEGER DEFAULT 0,
  intune_by_os TEXT,             -- JSON: { "Windows": 50, "iOS": 30, ... }

  -- Intune Policies
  intune_policies_total INTEGER DEFAULT 0,
  intune_top_policies TEXT,      -- JSON: [{ name, passRate, success, failed }, ...]

  -- Intune Apps
  intune_detected_apps_total INTEGER DEFAULT 0,
  intune_top_apps TEXT,          -- JSON: [{ name, deviceCount, publisher }, ...]

  -- Intune Management
  intune_by_mgmt_state TEXT,     -- JSON: { "managed": 80, "retirePending": 2, ... }

  -- Metadata
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now')),

  UNIQUE(date, tenant_id)
);
