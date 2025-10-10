-- Fix critical security issues - Part 1: Setup

-- 1. Add new enum values for founder and verified (must be in separate transaction)
DO $$ 
BEGIN
    BEGIN
        ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'founder';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

DO $$ 
BEGIN
    BEGIN
        ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'verified';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;