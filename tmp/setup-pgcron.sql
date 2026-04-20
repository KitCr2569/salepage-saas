-- ═══════════════════════════════════════════════════════════════
-- Supabase pg_cron Setup: Auto-cancel expired orders every minute
-- Run this SQL in Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Step 1: Enable required extensions (already available in Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 2: Remove old cron job if exists (safe to run multiple times)
SELECT cron.unschedule('expire-orders-cron') 
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-orders-cron');

-- Step 3: Create the cron job — runs every 1 minute
-- This calls our API endpoint which handles cancellation + Messenger notification
SELECT cron.schedule(
    'expire-orders-cron',           -- job name
    '* * * * *',                     -- every 1 minute
    $$
    SELECT net.http_get(
        url := 'https://www.hdgwrapskin.com/api/cron/expire-orders',
        headers := '{"Content-Type": "application/json"}'::jsonb
    );
    $$
);

-- Step 4: Verify the cron job was created
SELECT * FROM cron.job WHERE jobname = 'expire-orders-cron';
