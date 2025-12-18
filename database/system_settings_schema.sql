-- System Settings Schema
-- This schema defines tables for system information, resources, and data management settings

-- ============================================================================
-- SYSTEM_INFO TABLE
-- ============================================================================
-- This table stores system information such as system name, version, and status
-- Typically, there should be only one row in this table (singleton pattern)

CREATE TABLE IF NOT EXISTS system_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system_name VARCHAR(255) NOT NULL DEFAULT 'TBKK-Surazense',
    system_version VARCHAR(50) NOT NULL DEFAULT 'v1.0.0',
    organization_id UUID,
    organization_name VARCHAR(255),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    database_status VARCHAR(50) DEFAULT 'connected', -- 'connected', 'disconnected', 'error'
    api_status VARCHAR(50) DEFAULT 'operational', -- 'operational', 'degraded', 'down'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key to organizations table (if exists)
    CONSTRAINT fk_system_info_organization 
        FOREIGN KEY (organization_id) 
        REFERENCES organizations(id) 
        ON DELETE SET NULL
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_info_organization_id ON system_info(organization_id);

-- ============================================================================
-- SYSTEM_RESOURCES TABLE
-- ============================================================================
-- This table stores system resource usage metrics
-- Can store historical data or just current snapshot

CREATE TABLE IF NOT EXISTS system_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cpu_usage DECIMAL(5, 2) NOT NULL CHECK (cpu_usage >= 0 AND cpu_usage <= 100), -- CPU usage percentage
    memory_usage DECIMAL(5, 2) NOT NULL CHECK (memory_usage >= 0 AND memory_usage <= 100), -- Memory usage percentage
    disk_usage DECIMAL(5, 2) NOT NULL CHECK (disk_usage >= 0 AND disk_usage <= 100), -- Disk usage percentage
    cpu_cores INTEGER, -- Number of CPU cores
    total_memory_gb DECIMAL(10, 2), -- Total memory in GB
    total_disk_gb DECIMAL(10, 2), -- Total disk space in GB
    free_memory_gb DECIMAL(10, 2), -- Free memory in GB
    free_disk_gb DECIMAL(10, 2), -- Free disk space in GB
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Optional: Add organization_id if resources are tracked per organization
    organization_id UUID,
    CONSTRAINT fk_system_resources_organization 
        FOREIGN KEY (organization_id) 
        REFERENCES organizations(id) 
        ON DELETE SET NULL
);

-- Index for faster lookups by time
CREATE INDEX IF NOT EXISTS idx_system_resources_recorded_at ON system_resources(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_resources_organization_id ON system_resources(organization_id);

-- ============================================================================
-- SYSTEM_DATA_MANAGEMENT_SETTINGS TABLE
-- ============================================================================
-- This table stores data retention and backup settings
-- Can be organization-level or system-level

CREATE TABLE IF NOT EXISTS system_data_management_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID, -- NULL for system-wide settings
    user_id UUID, -- NULL for system-wide settings, set for user-specific overrides
    
    -- Data Retention Settings
    sensor_data_retention_days INTEGER, -- NULL means 'forever'
    alert_history_retention_days INTEGER, -- NULL means 'forever'
    
    -- Backup Settings
    automated_backups_enabled BOOLEAN DEFAULT TRUE,
    backup_frequency VARCHAR(50) DEFAULT 'daily', -- 'hourly', 'daily', 'weekly', 'monthly'
    backup_retention_count INTEGER DEFAULT 7, -- Number of backups to keep
    
    -- Backup Status
    last_backup_time TIMESTAMP WITH TIME ZONE,
    last_backup_status VARCHAR(50), -- 'success', 'failed', 'in_progress'
    last_backup_size_mb DECIMAL(10, 2), -- Backup size in MB
    next_backup_time TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_system_data_management_organization 
        FOREIGN KEY (organization_id) 
        REFERENCES organizations(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_system_data_management_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT chk_sensor_data_retention 
        CHECK (sensor_data_retention_days IS NULL OR sensor_data_retention_days > 0),
    CONSTRAINT chk_alert_history_retention 
        CHECK (alert_history_retention_days IS NULL OR alert_history_retention_days > 0),
    CONSTRAINT chk_backup_frequency 
        CHECK (backup_frequency IN ('hourly', 'daily', 'weekly', 'monthly')),
    CONSTRAINT chk_backup_retention_count 
        CHECK (backup_retention_count > 0),
    
    -- Ensure one setting per organization/user combination
    UNIQUE(organization_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_system_data_management_org_id ON system_data_management_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_system_data_management_user_id ON system_data_management_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_system_data_management_next_backup ON system_data_management_settings(next_backup_time);

-- ============================================================================
-- BACKUP_HISTORY TABLE
-- ============================================================================
-- This table stores history of backup operations

CREATE TABLE IF NOT EXISTS backup_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    backup_type VARCHAR(50) DEFAULT 'full', -- 'full', 'incremental', 'differential'
    backup_status VARCHAR(50) NOT NULL, -- 'success', 'failed', 'in_progress', 'cancelled'
    backup_size_mb DECIMAL(10, 2), -- Backup size in MB
    backup_location TEXT, -- Path or URL to backup file
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER, -- Backup duration in seconds
    error_message TEXT, -- Error message if backup failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key
    CONSTRAINT fk_backup_history_organization 
        FOREIGN KEY (organization_id) 
        REFERENCES organizations(id) 
        ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT chk_backup_type 
        CHECK (backup_type IN ('full', 'incremental', 'differential')),
    CONSTRAINT chk_backup_status 
        CHECK (backup_status IN ('success', 'failed', 'in_progress', 'cancelled')),
    CONSTRAINT chk_backup_size 
        CHECK (backup_size_mb IS NULL OR backup_size_mb >= 0),
    CONSTRAINT chk_duration 
        CHECK (duration_seconds IS NULL OR duration_seconds >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_backup_history_org_id ON backup_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_backup_history_started_at ON backup_history(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_history_status ON backup_history(backup_status);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update updated_at timestamp on system_info table
CREATE OR REPLACE FUNCTION update_system_info_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_system_info_updated_at
    BEFORE UPDATE ON system_info
    FOR EACH ROW
    EXECUTE FUNCTION update_system_info_updated_at();

-- Trigger to update updated_at timestamp on system_data_management_settings table
CREATE OR REPLACE FUNCTION update_system_data_management_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_system_data_management_updated_at
    BEFORE UPDATE ON system_data_management_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_system_data_management_updated_at();

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default system info if not exists
INSERT INTO system_info (id, system_name, system_version, database_status, api_status)
VALUES (
    gen_random_uuid(),
    'TBKK-Surazense',
    'v1.0.0',
    'connected',
    'operational'
)
ON CONFLICT DO NOTHING;

-- Insert default system data management settings if not exists
-- (system-wide settings with organization_id = NULL)
INSERT INTO system_data_management_settings (
    organization_id,
    sensor_data_retention_days,
    alert_history_retention_days,
    automated_backups_enabled,
    backup_frequency,
    backup_retention_count
)
VALUES (
    NULL, -- System-wide settings
    90, -- 90 days retention for sensor data
    180, -- 180 days retention for alert history
    TRUE, -- Enable automated backups
    'daily', -- Daily backups
    7 -- Keep 7 backups
)
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View to get current system status
CREATE OR REPLACE VIEW system_status AS
SELECT 
    si.id,
    si.system_name,
    si.system_version,
    si.organization_id,
    si.organization_name,
    si.last_updated,
    si.database_status,
    si.api_status,
    sr.cpu_usage,
    sr.memory_usage,
    sr.disk_usage,
    sr.cpu_cores,
    sr.total_memory_gb,
    sr.total_disk_gb,
    sr.free_memory_gb,
    sr.free_disk_gb,
    sr.recorded_at as resource_recorded_at
FROM system_info si
LEFT JOIN LATERAL (
    SELECT * FROM system_resources
    ORDER BY recorded_at DESC
    LIMIT 1
) sr ON true;

-- View to get backup summary
CREATE OR REPLACE VIEW backup_summary AS
SELECT 
    organization_id,
    COUNT(*) as total_backups,
    COUNT(*) FILTER (WHERE backup_status = 'success') as successful_backups,
    COUNT(*) FILTER (WHERE backup_status = 'failed') as failed_backups,
    MAX(started_at) as last_backup_time,
    AVG(backup_size_mb) as avg_backup_size_mb,
    AVG(duration_seconds) as avg_duration_seconds
FROM backup_history
GROUP BY organization_id;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to get system resources (latest snapshot)
CREATE OR REPLACE FUNCTION get_latest_system_resources()
RETURNS TABLE (
    cpu_usage DECIMAL,
    memory_usage DECIMAL,
    disk_usage DECIMAL,
    cpu_cores INTEGER,
    total_memory_gb DECIMAL,
    total_disk_gb DECIMAL,
    free_memory_gb DECIMAL,
    free_disk_gb DECIMAL,
    recorded_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sr.cpu_usage,
        sr.memory_usage,
        sr.disk_usage,
        sr.cpu_cores,
        sr.total_memory_gb,
        sr.total_disk_gb,
        sr.free_memory_gb,
        sr.free_disk_gb,
        sr.recorded_at
    FROM system_resources sr
    ORDER BY sr.recorded_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to record system resources
CREATE OR REPLACE FUNCTION record_system_resources(
    p_cpu_usage DECIMAL,
    p_memory_usage DECIMAL,
    p_disk_usage DECIMAL,
    p_cpu_cores INTEGER DEFAULT NULL,
    p_total_memory_gb DECIMAL DEFAULT NULL,
    p_total_disk_gb DECIMAL DEFAULT NULL,
    p_free_memory_gb DECIMAL DEFAULT NULL,
    p_free_disk_gb DECIMAL DEFAULT NULL,
    p_organization_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO system_resources (
        cpu_usage,
        memory_usage,
        disk_usage,
        cpu_cores,
        total_memory_gb,
        total_disk_gb,
        free_memory_gb,
        free_disk_gb,
        organization_id
    )
    VALUES (
        p_cpu_usage,
        p_memory_usage,
        p_disk_usage,
        p_cpu_cores,
        p_total_memory_gb,
        p_total_disk_gb,
        p_free_memory_gb,
        p_free_disk_gb,
        p_organization_id
    )
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE system_info IS 'Stores system information such as name, version, and status';
COMMENT ON TABLE system_resources IS 'Stores system resource usage metrics (CPU, memory, disk)';
COMMENT ON TABLE system_data_management_settings IS 'Stores data retention and backup settings';
COMMENT ON TABLE backup_history IS 'Stores history of backup operations';

COMMENT ON COLUMN system_info.database_status IS 'Database connection status: connected, disconnected, error';
COMMENT ON COLUMN system_info.api_status IS 'API status: operational, degraded, down';
COMMENT ON COLUMN system_resources.cpu_usage IS 'CPU usage percentage (0-100)';
COMMENT ON COLUMN system_resources.memory_usage IS 'Memory usage percentage (0-100)';
COMMENT ON COLUMN system_resources.disk_usage IS 'Disk usage percentage (0-100)';
COMMENT ON COLUMN system_data_management_settings.sensor_data_retention_days IS 'Number of days to retain sensor data. NULL means forever';
COMMENT ON COLUMN system_data_management_settings.alert_history_retention_days IS 'Number of days to retain alert history. NULL means forever';
COMMENT ON COLUMN system_data_management_settings.backup_frequency IS 'Backup frequency: hourly, daily, weekly, monthly';
COMMENT ON COLUMN system_data_management_settings.backup_retention_count IS 'Number of backups to keep';
COMMENT ON COLUMN backup_history.backup_type IS 'Type of backup: full, incremental, differential';
COMMENT ON COLUMN backup_history.backup_status IS 'Backup status: success, failed, in_progress, cancelled';

