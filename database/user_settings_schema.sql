-- User Settings Schema
-- This schema defines tables for user profile and security settings

-- ============================================================================
-- USERS TABLE (if not already exists)
-- ============================================================================
-- This table stores basic user information
-- Note: If you already have a users table, you can skip this section
-- or modify it to match your existing schema
-- 
-- Expected columns in existing users table:
-- - id (UUID, Primary Key)
-- - name (VARCHAR)
-- - email (VARCHAR, Unique)
-- - password_hash (VARCHAR) - Hashed password
-- - organization_id (UUID, Foreign Key to organizations)
-- - org_code (VARCHAR)
-- - role (VARCHAR) - 'admin', 'user', 'viewer', etc.
-- - created_at (TIMESTAMP)
-- - updated_at (TIMESTAMP)
--
-- If your users table has a different structure, please modify the foreign
-- key constraints in the tables below accordingly.

-- ============================================================================
-- USER_PROFILES TABLE
-- ============================================================================
-- This table stores additional user profile information
-- Separated from users table to keep core authentication data separate

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    avatar_url TEXT, -- URL to user's avatar image
    job_title VARCHAR(255), -- e.g., "Senior Engineer"
    department VARCHAR(255), -- e.g., "Maintenance"
    phone_number VARCHAR(20),
    bio TEXT, -- User biography
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key to users table
    CONSTRAINT fk_user_profiles_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE
);

-- Index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- ============================================================================
-- USER_SECURITY_SETTINGS TABLE
-- ============================================================================
-- This table stores user security and preference settings

CREATE TABLE IF NOT EXISTS user_security_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255), -- Secret key for 2FA (encrypted)
    two_factor_backup_codes TEXT[], -- Backup codes for 2FA
    session_timeout_minutes INTEGER DEFAULT 30, -- Session timeout in minutes (NULL = never)
    last_password_change TIMESTAMP WITH TIME ZONE,
    password_reset_token VARCHAR(255), -- For password reset flow
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP WITH TIME ZONE, -- Account lockout until this time
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key to users table
    CONSTRAINT fk_user_security_settings_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT chk_session_timeout 
        CHECK (session_timeout_minutes IS NULL OR session_timeout_minutes > 0),
    CONSTRAINT chk_failed_login_attempts 
        CHECK (failed_login_attempts >= 0)
);

-- Index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_user_security_settings_user_id ON user_security_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_security_settings_reset_token ON user_security_settings(password_reset_token);

-- ============================================================================
-- USER_PASSWORD_HISTORY TABLE (Optional - for password history enforcement)
-- ============================================================================
-- This table stores password history to prevent users from reusing old passwords

CREATE TABLE IF NOT EXISTS user_password_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key to users table
    CONSTRAINT fk_user_password_history_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_password_history_user_id ON user_password_history(user_id, created_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update updated_at timestamp on users table
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();

-- Trigger to update updated_at timestamp on user_profiles table
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_profiles_updated_at();

-- Trigger to update updated_at timestamp on user_security_settings table
CREATE OR REPLACE FUNCTION update_user_security_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_security_settings_updated_at
    BEFORE UPDATE ON user_security_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_security_settings_updated_at();

-- ============================================================================
-- INITIAL DATA (Optional)
-- ============================================================================

-- You can insert default security settings for existing users here
-- For example:
-- INSERT INTO user_security_settings (user_id, session_timeout_minutes)
-- SELECT id, 30 FROM users
-- ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- VIEWS (Optional - for easier queries)
-- ============================================================================

-- View to get complete user information with profile and security settings
-- Note: This view only includes columns that exist in the users table
-- If your users table has additional columns, you can add them here
CREATE OR REPLACE VIEW user_complete_info AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.organization_id,
    u.org_code,
    u.role,
    u.created_at as user_created_at,
    u.updated_at as user_updated_at,
    up.avatar_url,
    up.job_title,
    up.department,
    up.phone_number,
    up.bio,
    up.created_at as profile_created_at,
    up.updated_at as profile_updated_at,
    uss.two_factor_enabled,
    uss.session_timeout_minutes,
    uss.last_password_change,
    uss.failed_login_attempts,
    uss.account_locked_until,
    uss.created_at as security_created_at,
    uss.updated_at as security_updated_at
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN user_security_settings uss ON u.id = uss.user_id;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'Stores basic user authentication and account information';
COMMENT ON TABLE user_profiles IS 'Stores additional user profile information';
COMMENT ON TABLE user_security_settings IS 'Stores user security settings and preferences';
COMMENT ON TABLE user_password_history IS 'Stores password history to prevent password reuse';

COMMENT ON COLUMN users.password_hash IS 'Hashed password using bcrypt, argon2, or similar';
COMMENT ON COLUMN user_security_settings.two_factor_secret IS 'Encrypted secret key for 2FA';
COMMENT ON COLUMN user_security_settings.two_factor_backup_codes IS 'Array of backup codes for 2FA';
COMMENT ON COLUMN user_security_settings.session_timeout_minutes IS 'Session timeout in minutes. NULL means never timeout';
COMMENT ON COLUMN user_security_settings.password_reset_token IS 'Token for password reset flow';
COMMENT ON COLUMN user_security_settings.password_reset_expires IS 'Expiration time for password reset token';
COMMENT ON COLUMN user_security_settings.failed_login_attempts IS 'Number of consecutive failed login attempts';
COMMENT ON COLUMN user_security_settings.account_locked_until IS 'Account lockout expiration time';

