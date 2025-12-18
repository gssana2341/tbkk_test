-- Threshold Settings Database Schema
-- This schema supports global thresholds and machine-specific overrides

-- Global Threshold Settings Table
CREATE TABLE IF NOT EXISTS threshold_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    -- Temperature thresholds
    temperature_warning DECIMAL(10, 2) NOT NULL DEFAULT 30.0,
    temperature_critical DECIMAL(10, 2) NOT NULL DEFAULT 35.0,
    -- Vibration thresholds
    vibration_warning DECIMAL(10, 2) NOT NULL DEFAULT 0.8,
    vibration_critical DECIMAL(10, 2) NOT NULL DEFAULT 1.2,
    -- Vibration axis thresholds
    vibration_x_axis_warning DECIMAL(10, 2),
    vibration_y_axis_warning DECIMAL(10, 2),
    vibration_z_axis_warning DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id)
);

-- Machine Threshold Overrides Table
CREATE TABLE IF NOT EXISTS machine_threshold_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    machine_id UUID REFERENCES machines(id) ON DELETE CASCADE, -- Nullable, can use machine_name/machine_class instead
    machine_name VARCHAR(255), -- For reference, required if machine_id is null
    machine_class VARCHAR(255), -- For reference, can be null if machine_id exists
    -- Temperature overrides
    temperature_warning DECIMAL(10, 2),
    temperature_critical DECIMAL(10, 2),
    -- Vibration overrides
    vibration_warning DECIMAL(10, 2),
    vibration_critical DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Ensure at least one override value is provided
    CHECK (
        temperature_warning IS NOT NULL OR 
        temperature_critical IS NOT NULL OR 
        vibration_warning IS NOT NULL OR 
        vibration_critical IS NOT NULL
    ),
    -- Ensure either machine_id or machine_name is provided
    CHECK (
        machine_id IS NOT NULL OR 
        (machine_name IS NOT NULL AND machine_name != '')
    )
);

-- Create unique indexes for machine identification
-- For cases where machine_id is provided
CREATE UNIQUE INDEX IF NOT EXISTS idx_machine_overrides_org_machine_id 
    ON machine_threshold_overrides(organization_id, machine_id) 
    WHERE machine_id IS NOT NULL;

-- For cases where machine_name is used instead of machine_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_machine_overrides_org_machine_name 
    ON machine_threshold_overrides(organization_id, machine_name) 
    WHERE machine_id IS NULL AND machine_name IS NOT NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_threshold_settings_org_id ON threshold_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_machine_overrides_org_id ON machine_threshold_overrides(organization_id);
CREATE INDEX IF NOT EXISTS idx_machine_overrides_machine_id ON machine_threshold_overrides(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_overrides_machine_class ON machine_threshold_overrides(machine_class);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_threshold_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_threshold_settings_updated_at 
    BEFORE UPDATE ON threshold_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_threshold_updated_at_column();

CREATE TRIGGER update_machine_overrides_updated_at 
    BEFORE UPDATE ON machine_threshold_overrides
    FOR EACH ROW
    EXECUTE FUNCTION update_threshold_updated_at_column();

-- Example queries:

-- Get threshold settings for an organization
-- SELECT * FROM threshold_settings WHERE organization_id = '<organization_id>';

-- Get machine overrides for an organization
-- SELECT 
--     mto.*,
--     m.name as machine_name,
--     m.type as machine_type
-- FROM machine_threshold_overrides mto
-- LEFT JOIN machines m ON m.id = mto.machine_id
-- WHERE mto.organization_id = '<organization_id>';

-- Get effective thresholds for a specific machine
-- (combines global settings with machine-specific overrides)
-- SELECT 
--     COALESCE(mto.temperature_warning, ts.temperature_warning) as temperature_warning,
--     COALESCE(mto.temperature_critical, ts.temperature_critical) as temperature_critical,
--     COALESCE(mto.vibration_warning, ts.vibration_warning) as vibration_warning,
--     COALESCE(mto.vibration_critical, ts.vibration_critical) as vibration_critical
-- FROM threshold_settings ts
-- LEFT JOIN machine_threshold_overrides mto ON mto.machine_id = '<machine_id>' 
--     AND mto.organization_id = ts.organization_id
-- WHERE ts.organization_id = '<organization_id>';

-- Update global threshold settings (UPSERT)
-- INSERT INTO threshold_settings (
--     organization_id,
--     temperature_warning,
--     temperature_critical,
--     vibration_warning,
--     vibration_critical,
--     vibration_x_axis_warning,
--     vibration_y_axis_warning,
--     vibration_z_axis_warning
-- )
-- VALUES (
--     '<organization_id>',
--     30.0,
--     35.0,
--     0.8,
--     1.2,
--     0.8,
--     0.8,
--     0.8
-- )
-- ON CONFLICT (organization_id)
-- DO UPDATE SET
--     temperature_warning = EXCLUDED.temperature_warning,
--     temperature_critical = EXCLUDED.temperature_critical,
--     vibration_warning = EXCLUDED.vibration_warning,
--     vibration_critical = EXCLUDED.vibration_critical,
--     vibration_x_axis_warning = EXCLUDED.vibration_x_axis_warning,
--     vibration_y_axis_warning = EXCLUDED.vibration_y_axis_warning,
--     vibration_z_axis_warning = EXCLUDED.vibration_z_axis_warning,
--     updated_at = CURRENT_TIMESTAMP;

-- Add machine threshold override (UPSERT)
-- INSERT INTO machine_threshold_overrides (
--     organization_id,
--     machine_id,
--     machine_name,
--     machine_class,
--     temperature_warning,
--     temperature_critical
-- )
-- VALUES (
--     '<organization_id>',
--     '<machine_id>',
--     'Pump-01',
--     'pump',
--     28.0,
--     33.0
-- )
-- ON CONFLICT (organization_id, machine_id)
-- DO UPDATE SET
--     temperature_warning = EXCLUDED.temperature_warning,
--     temperature_critical = EXCLUDED.temperature_critical,
--     vibration_warning = EXCLUDED.vibration_warning,
--     vibration_critical = EXCLUDED.vibration_critical,
--     updated_at = CURRENT_TIMESTAMP;

-- Delete machine threshold override
-- DELETE FROM machine_threshold_overrides 
-- WHERE id = '<override_id>' AND organization_id = '<organization_id>';

