-- Migration: Add Resend domain ID to mailbox_domains table
-- Run this if you already have the mailbox_domains table created

ALTER TABLE mailbox_domains 
ADD COLUMN IF NOT EXISTS resend_domain_id TEXT;

COMMENT ON COLUMN mailbox_domains.resend_domain_id IS 'Resend.com domain ID for email infrastructure integration'; 