-- Migration: 002_create_events
-- Creates the events table for the Switchboard coordination feed system

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY,
    feed_id UUID NOT NULL REFERENCES feeds(id),
    type TEXT NOT NULL,
    author_identity_id TEXT NOT NULL,
    source_platform TEXT NOT NULL,
    source_msg_id TEXT,
    ts TIMESTAMP NOT NULL,
    payload_json JSONB NOT NULL,
    refs_json JSONB
);

CREATE INDEX IF NOT EXISTS idx_events_feed_id_ts ON events(feed_id, ts);

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_source_dedup 
    ON events(source_platform, source_msg_id) 
    WHERE source_msg_id IS NOT NULL;
