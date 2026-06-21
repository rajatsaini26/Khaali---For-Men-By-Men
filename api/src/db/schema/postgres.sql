-- ─────────────────────────────────────────────────────────────────────────────
-- Khaali — PostgreSQL Production Schema
-- Run this when switching from SQLite (dev) → PostgreSQL (prod)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT UNIQUE NOT NULL,
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'hi')),
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Letters ─────────────────────────────────────────────────────────────────
CREATE TABLE letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT,
  content TEXT NOT NULL,
  ai_reflection TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','private','sealed','thrown','caught','expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sealed_at TIMESTAMPTZ
);

-- ─── Bottles ─────────────────────────────────────────────────────────────────
CREATE TABLE bottles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id UUID UNIQUE NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'floating'
    CHECK (status IN ('floating','caught','released','expired','flagged')),
  risk_level TEXT CHECK (risk_level IN ('none','low','high','crisis')),
  thrown_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  caught_by UUID REFERENCES users(id),
  caught_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ                            -- thrown_at + 30 days
);

-- ─── Chats ───────────────────────────────────────────────────────────────────
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bottle_id UUID NOT NULL REFERENCES bottles(id) ON DELETE CASCADE,
  user_a UUID NOT NULL REFERENCES users(id),        -- thrower
  user_b UUID NOT NULL REFERENCES users(id),        -- catcher
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,                  -- created_at + 7 days (hard enforced by cron)
  deleted_at TIMESTAMPTZ
);

-- ─── Messages ────────────────────────────────────────────────────────────────
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Hard deleted with the parent chat on expiry — no orphans, no backups.

-- ─── Check-ins ───────────────────────────────────────────────────────────────
CREATE TABLE checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  response TEXT,
  voice_memo_local_ref TEXT,                        -- device-local only, never uploaded
  day_number INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Streaks ─────────────────────────────────────────────────────────────────
CREATE TABLE streaks (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_checkin_date DATE
);

-- ─── Monthly Reports ─────────────────────────────────────────────────────────
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start DATE,
  period_end DATE,
  content JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── App Versions ────────────────────────────────────────────────────────────
-- Two rows at any time: one per platform. Updated manually on each release.
CREATE TABLE app_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  latest_version TEXT NOT NULL,
  min_supported_version TEXT NOT NULL,
  force_update BOOLEAN NOT NULL DEFAULT false,
  update_url TEXT NOT NULL,
  message_en TEXT,
  message_hi TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(platform)
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX idx_letters_user_id ON letters(user_id);
CREATE INDEX idx_letters_status ON letters(status);
CREATE INDEX idx_bottles_status ON bottles(status);
CREATE INDEX idx_bottles_caught_by ON bottles(caught_by);
CREATE INDEX idx_chats_user_a ON chats(user_a);
CREATE INDEX idx_chats_user_b ON chats(user_b);
CREATE INDEX idx_chats_expires_at ON chats(expires_at);
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_checkins_user_id ON checkins(user_id);
CREATE INDEX idx_checkins_created_at ON checkins(created_at);
