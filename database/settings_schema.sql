-- Settings Database Schema
-- This schema supports user-level and organization-level settings

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    system_name VARCHAR(255) NOT NULL DEFAULT 'TBKK-Surazense',
    timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
    date_format VARCHAR(20) NOT NULL DEFAULT 'MM/DD/YYYY',
    temperature_unit VARCHAR(10) NOT NULL DEFAULT 'celsius' CHECK (temperature_unit IN ('celsius', 'fahrenheit')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, organization_id)
);

-- Display Settings Table
CREATE TABLE IF NOT EXISTS display_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    auto_refresh BOOLEAN NOT NULL DEFAULT true,
    refresh_interval INTEGER NOT NULL DEFAULT 30 CHECK (refresh_interval > 0),
    show_grid_lines BOOLEAN NOT NULL DEFAULT true,
    show_tooltips BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, organization_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_system_settings_user_id ON system_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_system_settings_org_id ON system_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_display_settings_user_id ON display_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_display_settings_org_id ON display_settings(organization_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_system_settings_updated_at 
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_display_settings_updated_at 
    BEFORE UPDATE ON display_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings for organization (optional)
-- This can be used to set organization-wide defaults
-- INSERT INTO system_settings (organization_id, system_name, timezone, date_format, temperature_unit)
-- VALUES ('<organization_id>', 'TBKK-Surazense', 'Asia/Bangkok', 'DD/MM/YYYY', 'celsius');

-- Example queries:

-- Get settings for a user (user-level settings take precedence over org-level)
-- SELECT 
--     COALESCE(us.system_name, os.system_name) as system_name,
--     COALESCE(us.timezone, os.timezone) as timezone,
--     COALESCE(us.date_format, os.date_format) as date_format,
--     COALESCE(us.temperature_unit, os.temperature_unit) as temperature_unit
-- FROM users u
-- LEFT JOIN system_settings us ON us.user_id = u.id
-- LEFT JOIN system_settings os ON os.organization_id = u.organization_id AND os.user_id IS NULL
-- WHERE u.id = '<user_id>';

-- Update user system settings
-- UPDATE system_settings 
-- SET system_name = 'New Name', timezone = 'Asia/Bangkok', updated_at = CURRENT_TIMESTAMP
-- WHERE user_id = '<user_id>';

-- Insert or update user settings (UPSERT)
-- INSERT INTO system_settings (user_id, organization_id, system_name, timezone, date_format, temperature_unit)
-- VALUES ('<user_id>', '<organization_id>', 'TBKK-Surazense', 'Asia/Bangkok', 'DD/MM/YYYY', 'celsius')
-- ON CONFLICT (user_id, organization_id) 
-- DO UPDATE SET 
--     system_name = EXCLUDED.system_name,
--     timezone = EXCLUDED.timezone,
--     date_format = EXCLUDED.date_format,
--     temperature_unit = EXCLUDED.temperature_unit,
--     updated_at = CURRENT_TIMESTAMP;

