-- ============================================
-- Salesforce Service Cloud Integration
-- Migration: 0002_salesforce_tickets.sql
-- ============================================

-- ============================================
-- Enhanced Security Tickets from Salesforce
-- ============================================
CREATE TABLE IF NOT EXISTS security_tickets (
    id TEXT PRIMARY KEY,              -- Salesforce Case ID (18-char)
    case_number TEXT UNIQUE NOT NULL,
    subject TEXT,
    description TEXT,
    status TEXT NOT NULL,
    priority TEXT,
    ticket_type TEXT,                 -- Security Incident, Access Request, etc.
    reason TEXT,                      -- Category/subcategory
    origin TEXT,                      -- Email, Phone, Web, Chat
    is_escalated INTEGER DEFAULT 0,
    is_closed INTEGER DEFAULT 0,
    owner_id TEXT,
    owner_name TEXT,
    contact_id TEXT,
    contact_name TEXT,
    account_id TEXT,
    account_name TEXT,
    created_at TEXT NOT NULL,
    closed_at TEXT,
    first_response_at TEXT,
    resolution_time_minutes INTEGER,  -- Calculated: (closed_at - created_at) in minutes
    synced_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_security_tickets_status ON security_tickets(status);
CREATE INDEX IF NOT EXISTS idx_security_tickets_priority ON security_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_security_tickets_created ON security_tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_security_tickets_closed ON security_tickets(is_closed);
CREATE INDEX IF NOT EXISTS idx_security_tickets_type ON security_tickets(ticket_type);
CREATE INDEX IF NOT EXISTS idx_security_tickets_escalated ON security_tickets(is_escalated);
CREATE INDEX IF NOT EXISTS idx_security_tickets_owner ON security_tickets(owner_name);

-- ============================================
-- Daily Ticket Metrics (Pre-aggregated)
-- ============================================
CREATE TABLE IF NOT EXISTS ticket_metrics_daily (
    date TEXT NOT NULL,
    total_created INTEGER DEFAULT 0,
    total_closed INTEGER DEFAULT 0,
    total_open INTEGER DEFAULT 0,
    avg_resolution_minutes REAL,
    mttr_p1_minutes REAL,
    mttr_p2_minutes REAL,
    mttr_p3_minutes REAL,
    mttr_p4_minutes REAL,
    sla_compliance_rate REAL,
    escalation_rate REAL,
    reopen_count INTEGER DEFAULT 0,
    p1_created INTEGER DEFAULT 0,
    p2_created INTEGER DEFAULT 0,
    p3_created INTEGER DEFAULT 0,
    p4_created INTEGER DEFAULT 0,
    origin_email INTEGER DEFAULT 0,
    origin_phone INTEGER DEFAULT 0,
    origin_web INTEGER DEFAULT 0,
    origin_chat INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (date)
);

CREATE INDEX IF NOT EXISTS idx_ticket_metrics_date ON ticket_metrics_daily(date);
