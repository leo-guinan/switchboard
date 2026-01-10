-- Migration: 001_create_feeds
-- Creates the feeds table for the Switchboard coordination feed system

CREATE TABLE IF NOT EXISTS feeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    policy_json JSONB,
    created_at TIMESTAMP DEFAULT now()
);
