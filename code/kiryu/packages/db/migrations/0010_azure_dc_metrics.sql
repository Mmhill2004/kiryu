-- Migration 0010: Azure DC metrics daily table
-- Tracks Azure virtual datacenter topology stats for historical trends

CREATE TABLE IF NOT EXISTS azure_dc_metrics_daily (
  date TEXT NOT NULL,

  -- Virtual Networks
  total_vnets INTEGER DEFAULT 0,
  total_subnets INTEGER DEFAULT 0,
  peering_count INTEGER DEFAULT 0,

  -- Virtual Machines
  total_vms INTEGER DEFAULT 0,
  running_vms INTEGER DEFAULT 0,
  deallocated_vms INTEGER DEFAULT 0,
  stopped_vms INTEGER DEFAULT 0,

  -- Network Resources
  total_public_ips INTEGER DEFAULT 0,
  total_nsgs INTEGER DEFAULT 0,
  total_load_balancers INTEGER DEFAULT 0,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (date)
);

CREATE INDEX IF NOT EXISTS idx_azure_dc_date ON azure_dc_metrics_daily(date);
