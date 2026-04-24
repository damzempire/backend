-- Migration: Create Identity Mapping Tables
-- File: backend/db/migrations/20260423_create_identity_mapping.sql

-- 1. Create table for verified human entities (KYC profiles)
CREATE TABLE kyc_profiles (
    profile_id UUID PRIMARY KEY,
    full_name TEXT NOT NULL,
    dob DATE,
    verification_status TEXT CHECK (verification_status IN ('pending','verified','rejected')) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create table for mapping Stellar public keys to a KYC profile
CREATE TABLE stellar_keys (
    key_id UUID PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES kyc_profiles(profile_id) ON DELETE CASCADE,
    public_key TEXT UNIQUE NOT NULL,
    vesting_schedule JSONB, -- optional: store vesting details per key
    linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Indexes for fast lookups
CREATE INDEX idx_stellar_keys_profile_id ON stellar_keys(profile_id);
CREATE INDEX idx_stellar_keys_public_key ON stellar_keys(public_key);

-- 4. Constraint: only allow linking if profile is verified
-- (enforced via trigger or application logic; here’s a simple check trigger)
CREATE OR REPLACE FUNCTION enforce_verified_profile()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT verification_status FROM kyc_profiles WHERE profile_id = NEW.profile_id) <> 'verified' THEN
        RAISE EXCEPTION 'Cannot link Stellar key: profile not verified';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_verified_profile
BEFORE INSERT ON stellar_keys
FOR EACH ROW
EXECUTE FUNCTION enforce_verified_profile();
