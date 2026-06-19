-- MIGRATION: Add custom_daily_limit and subscription management extensions
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS custom_daily_limit integer DEFAULT NULL;

-- Enforce CHECK constraint on status checks
ALTER TABLE public.user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_status_check;
ALTER TABLE public.user_subscriptions ADD CONSTRAINT user_subscriptions_status_check CHECK (status IN ('trialing', 'active', 'expired', 'cancelled', 'past_due'));
