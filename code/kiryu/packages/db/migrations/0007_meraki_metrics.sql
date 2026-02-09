-- Meraki network infrastructure daily metrics
CREATE TABLE IF NOT EXISTS meraki_metrics_daily (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  org_id TEXT NOT NULL DEFAULT '',

  -- Device counts
  devices_total INTEGER DEFAULT 0,
  devices_online INTEGER DEFAULT 0,
  devices_alerting INTEGER DEFAULT 0,
  devices_offline INTEGER DEFAULT 0,
  devices_dormant INTEGER DEFAULT 0,

  -- By product type
  devices_wireless INTEGER DEFAULT 0,
  devices_switch INTEGER DEFAULT 0,
  devices_appliance INTEGER DEFAULT 0,
  devices_camera INTEGER DEFAULT 0,
  devices_sensor INTEGER DEFAULT 0,

  -- Network counts
  networks_total INTEGER DEFAULT 0,

  -- VPN
  vpn_tunnels_total INTEGER DEFAULT 0,
  vpn_tunnels_online INTEGER DEFAULT 0,
  vpn_tunnels_offline INTEGER DEFAULT 0,

  -- Uplinks
  uplinks_total INTEGER DEFAULT 0,
  uplinks_active INTEGER DEFAULT 0,
  uplinks_failed INTEGER DEFAULT 0,

  -- Licensing
  license_status TEXT DEFAULT '',
  license_expiration TEXT DEFAULT '',
  licensed_device_count INTEGER DEFAULT 0,

  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(date, org_id)
);
