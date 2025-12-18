# System Settings Database Schema

This document describes the database schema for system information, resources, and data management settings.

## Tables

### 1. `system_info` Table

Stores system information such as system name, version, and status. Typically, there should be only one row in this table.

**Columns:**

- `id` (UUID, Primary Key): Unique system info identifier
- `system_name` (VARCHAR): Name of the system (default: 'TBKK-Surazense')
- `system_version` (VARCHAR): System version (default: 'v1.0.0')
- `organization_id` (UUID, Foreign Key): Reference to organizations table
- `organization_name` (VARCHAR): Organization name
- `last_updated` (TIMESTAMP): Last update timestamp
- `database_status` (VARCHAR): Database connection status ('connected', 'disconnected', 'error')
- `api_status` (VARCHAR): API status ('operational', 'degraded', 'down')
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

**Indexes:**

- `idx_system_info_organization_id`: Index on organization_id

### 2. `system_resources` Table

Stores system resource usage metrics (CPU, memory, disk). Can store historical data or just current snapshot.

**Columns:**

- `id` (UUID, Primary Key): Unique resource record identifier
- `cpu_usage` (DECIMAL): CPU usage percentage (0-100)
- `memory_usage` (DECIMAL): Memory usage percentage (0-100)
- `disk_usage` (DECIMAL): Disk usage percentage (0-100)
- `cpu_cores` (INTEGER): Number of CPU cores
- `total_memory_gb` (DECIMAL): Total memory in GB
- `total_disk_gb` (DECIMAL): Total disk space in GB
- `free_memory_gb` (DECIMAL): Free memory in GB
- `free_disk_gb` (DECIMAL): Free disk space in GB
- `recorded_at` (TIMESTAMP): When this resource snapshot was recorded
- `created_at` (TIMESTAMP): Creation timestamp
- `organization_id` (UUID, Foreign Key): Optional organization reference

**Constraints:**

- `chk_cpu_usage`: CPU usage must be between 0 and 100
- `chk_memory_usage`: Memory usage must be between 0 and 100
- `chk_disk_usage`: Disk usage must be between 0 and 100

**Indexes:**

- `idx_system_resources_recorded_at`: Index on recorded_at for time-based queries
- `idx_system_resources_organization_id`: Index on organization_id

### 3. `system_data_management_settings` Table

Stores data retention and backup settings. Can be organization-level or system-level.

**Columns:**

- `id` (UUID, Primary Key): Unique settings identifier
- `organization_id` (UUID, Foreign Key): Reference to organizations table (NULL for system-wide)
- `user_id` (UUID, Foreign Key): Reference to users table (NULL for system-wide, set for user-specific)
- `sensor_data_retention_days` (INTEGER): Number of days to retain sensor data (NULL = forever)
- `alert_history_retention_days` (INTEGER): Number of days to retain alert history (NULL = forever)
- `automated_backups_enabled` (BOOLEAN): Whether automated backups are enabled
- `backup_frequency` (VARCHAR): Backup frequency ('hourly', 'daily', 'weekly', 'monthly')
- `backup_retention_count` (INTEGER): Number of backups to keep
- `last_backup_time` (TIMESTAMP): Last backup timestamp
- `last_backup_status` (VARCHAR): Last backup status ('success', 'failed', 'in_progress')
- `last_backup_size_mb` (DECIMAL): Last backup size in MB
- `next_backup_time` (TIMESTAMP): Next scheduled backup time
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

**Constraints:**

- `chk_sensor_data_retention`: Sensor data retention must be positive or NULL
- `chk_alert_history_retention`: Alert history retention must be positive or NULL
- `chk_backup_frequency`: Backup frequency must be one of: hourly, daily, weekly, monthly
- `chk_backup_retention_count`: Backup retention count must be positive
- `UNIQUE(organization_id, user_id)`: One setting per organization/user combination

**Indexes:**

- `idx_system_data_management_org_id`: Index on organization_id
- `idx_system_data_management_user_id`: Index on user_id
- `idx_system_data_management_next_backup`: Index on next_backup_time

### 4. `backup_history` Table

Stores history of backup operations.

**Columns:**

- `id` (UUID, Primary Key): Unique backup record identifier
- `organization_id` (UUID, Foreign Key): Reference to organizations table
- `backup_type` (VARCHAR): Type of backup ('full', 'incremental', 'differential')
- `backup_status` (VARCHAR): Backup status ('success', 'failed', 'in_progress', 'cancelled')
- `backup_size_mb` (DECIMAL): Backup size in MB
- `backup_location` (TEXT): Path or URL to backup file
- `started_at` (TIMESTAMP): Backup start time
- `completed_at` (TIMESTAMP): Backup completion time
- `duration_seconds` (INTEGER): Backup duration in seconds
- `error_message` (TEXT): Error message if backup failed
- `created_at` (TIMESTAMP): Creation timestamp

**Constraints:**

- `chk_backup_type`: Backup type must be one of: full, incremental, differential
- `chk_backup_status`: Backup status must be one of: success, failed, in_progress, cancelled
- `chk_backup_size`: Backup size must be non-negative
- `chk_duration`: Duration must be non-negative

**Indexes:**

- `idx_backup_history_org_id`: Index on organization_id
- `idx_backup_history_started_at`: Index on started_at for time-based queries
- `idx_backup_history_status`: Index on backup_status

## Views

### `system_status` View

A view that combines system info and latest system resources for easier querying.

**Columns:** All columns from `system_info` and latest `system_resources`.

### `backup_summary` View

A view that provides backup statistics grouped by organization.

**Columns:**

- `organization_id`: Organization identifier
- `total_backups`: Total number of backups
- `successful_backups`: Number of successful backups
- `failed_backups`: Number of failed backups
- `last_backup_time`: Last backup time
- `avg_backup_size_mb`: Average backup size in MB
- `avg_duration_seconds`: Average backup duration in seconds

## Functions

### `get_latest_system_resources()`

Returns the latest system resources snapshot.

**Returns:** Table with system resource metrics.

### `record_system_resources(...)`

Records a new system resources snapshot.

**Parameters:**

- `p_cpu_usage`: CPU usage percentage
- `p_memory_usage`: Memory usage percentage
- `p_disk_usage`: Disk usage percentage
- `p_cpu_cores`: Number of CPU cores (optional)
- `p_total_memory_gb`: Total memory in GB (optional)
- `p_total_disk_gb`: Total disk space in GB (optional)
- `p_free_memory_gb`: Free memory in GB (optional)
- `p_free_disk_gb`: Free disk space in GB (optional)
- `p_organization_id`: Organization ID (optional)

**Returns:** UUID of the created record.

## API Endpoints

### 1. Get System Information

**GET** `/api/system/info`

**Response:**

```json
{
  "system": {
    "id": "uuid",
    "system_name": "TBKK-Surazense",
    "system_version": "v1.0.0",
    "organization_id": "uuid",
    "organization_name": "TBKK",
    "last_updated": "2024-01-01T00:00:00Z",
    "database_status": "connected",
    "api_status": "operational"
  }
}
```

### 2. Update System Information

**PUT** `/api/system/info`

**Request Body:**

```json
{
  "system_name": "TBKK-Surazense",
  "system_version": "v1.0.1",
  "organization_name": "TBKK",
  "database_status": "connected",
  "api_status": "operational"
}
```

**Response:**

```json
{
  "system": {
    "id": "uuid",
    "system_name": "TBKK-Surazense",
    "system_version": "v1.0.1",
    "last_updated": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "message": "System information updated successfully"
}
```

### 3. Get System Resources

**GET** `/api/system/resources`

**Response:**

```json
{
  "resources": {
    "cpu_usage": 32.5,
    "memory_usage": 45.2,
    "disk_usage": 28.1,
    "cpu_cores": 4,
    "total_memory_gb": 16.0,
    "total_disk_gb": 500.0,
    "free_memory_gb": 8.8,
    "free_disk_gb": 359.5,
    "recorded_at": "2024-01-01T00:00:00Z"
  }
}
```

### 4. Record System Resources

**POST** `/api/system/resources`

**Request Body:**

```json
{
  "cpu_usage": 32.5,
  "memory_usage": 45.2,
  "disk_usage": 28.1,
  "cpu_cores": 4,
  "total_memory_gb": 16.0,
  "total_disk_gb": 500.0,
  "free_memory_gb": 8.8,
  "free_disk_gb": 359.5
}
```

**Response:**

```json
{
  "id": "uuid",
  "message": "System resources recorded successfully"
}
```

### 5. Get Data Management Settings

**GET** `/api/system/data-management`

**Response:**

```json
{
  "settings": {
    "id": "uuid",
    "organization_id": "uuid",
    "sensor_data_retention_days": 90,
    "alert_history_retention_days": 180,
    "automated_backups_enabled": true,
    "backup_frequency": "daily",
    "backup_retention_count": 7,
    "last_backup_time": "2024-01-01T00:00:00Z",
    "last_backup_status": "success",
    "last_backup_size_mb": 1024.5,
    "next_backup_time": "2024-01-02T00:00:00Z"
  }
}
```

### 6. Update Data Management Settings

**PUT** `/api/system/data-management`

**Request Body:**

```json
{
  "sensor_data_retention_days": 90,
  "alert_history_retention_days": 180,
  "automated_backups_enabled": true,
  "backup_frequency": "daily",
  "backup_retention_count": 7
}
```

**Response:**

```json
{
  "settings": {
    "id": "uuid",
    "sensor_data_retention_days": 90,
    "alert_history_retention_days": 180,
    "automated_backups_enabled": true,
    "backup_frequency": "daily",
    "backup_retention_count": 7,
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "message": "Data management settings updated successfully"
}
```

### 7. Run Backup Now

**POST** `/api/system/backup/run`

**Request Body:**

```json
{
  "backup_type": "full"
}
```

**Response:**

```json
{
  "backup": {
    "id": "uuid",
    "backup_type": "full",
    "backup_status": "in_progress",
    "started_at": "2024-01-01T00:00:00Z"
  },
  "message": "Backup started successfully"
}
```

### 8. Get Backup History

**GET** `/api/system/backup/history`

**Query Parameters:**

- `organization_id` (optional): Filter by organization
- `limit` (optional): Number of records to return (default: 50)
- `offset` (optional): Offset for pagination (default: 0)

**Response:**

```json
{
  "backups": [
    {
      "id": "uuid",
      "backup_type": "full",
      "backup_status": "success",
      "backup_size_mb": 1024.5,
      "backup_location": "/backups/backup-2024-01-01.sql",
      "started_at": "2024-01-01T00:00:00Z",
      "completed_at": "2024-01-01T00:05:00Z",
      "duration_seconds": 300
    }
  ],
  "total": 10,
  "limit": 50,
  "offset": 0
}
```

### 9. Get Backup Summary

**GET** `/api/system/backup/summary`

**Response:**

```json
{
  "summary": {
    "organization_id": "uuid",
    "total_backups": 100,
    "successful_backups": 95,
    "failed_backups": 5,
    "last_backup_time": "2024-01-01T00:00:00Z",
    "avg_backup_size_mb": 1024.5,
    "avg_duration_seconds": 300
  }
}
```

## Implementation Notes

### 1. System Information

- Typically, there should be only one row in `system_info` table
- Update the existing record rather than creating new ones
- Use application logic to ensure singleton pattern

### 2. System Resources

- Can store historical data or just current snapshot
- Record resources periodically (e.g., every 5 minutes)
- Use `record_system_resources()` function to record new snapshots
- Query latest resources using `get_latest_system_resources()` function

### 3. Data Retention

- `sensor_data_retention_days` and `alert_history_retention_days` can be NULL (forever)
- Implement cleanup jobs to delete old data based on retention settings
- Run cleanup jobs periodically (e.g., daily)

### 4. Backup Management

- Implement backup scheduler based on `backup_frequency`
- Update `next_backup_time` after each backup
- Store backup files in secure location (cloud storage or local filesystem)
- Implement backup rotation based on `backup_retention_count`
- Delete old backups when retention count is exceeded

### 5. Backup Types

- **Full backup**: Complete backup of all data
- **Incremental backup**: Backup of changes since last backup
- **Differential backup**: Backup of changes since last full backup

### 6. Backup Status

- **in_progress**: Backup is currently running
- **success**: Backup completed successfully
- **failed**: Backup failed
- **cancelled**: Backup was cancelled

## Security Considerations

1. **Backup Security:**
   - Encrypt backup files
   - Store backups in secure location
   - Implement access control for backup files
   - Regular backup testing and restoration

2. **Data Retention:**
   - Implement secure data deletion
   - Comply with data retention policies
   - Audit data deletion operations

3. **System Resources:**
   - Monitor resource usage for anomalies
   - Set up alerts for high resource usage
   - Implement resource limits

## Example Queries

### Get System Status

```sql
SELECT * FROM system_status;
```

### Get Latest System Resources

```sql
SELECT * FROM get_latest_system_resources();
```

### Record System Resources

```sql
SELECT record_system_resources(
    32.5,  -- cpu_usage
    45.2,  -- memory_usage
    28.1,  -- disk_usage
    4,     -- cpu_cores
    16.0,  -- total_memory_gb
    500.0, -- total_disk_gb
    8.8,   -- free_memory_gb
    359.5  -- free_disk_gb
);
```

### Get Data Management Settings

```sql
SELECT * FROM system_data_management_settings
WHERE organization_id = 'uuid' OR organization_id IS NULL
ORDER BY organization_id NULLS LAST
LIMIT 1;
```

### Get Backup History

```sql
SELECT * FROM backup_history
WHERE organization_id = 'uuid'
ORDER BY started_at DESC
LIMIT 50;
```

### Get Backup Summary

```sql
SELECT * FROM backup_summary
WHERE organization_id = 'uuid';
```

### Update System Information

```sql
UPDATE system_info
SET
    system_name = 'TBKK-Surazense',
    system_version = 'v1.0.1',
    last_updated = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'uuid';
```

### Update Data Management Settings

```sql
UPDATE system_data_management_settings
SET
    sensor_data_retention_days = 90,
    alert_history_retention_days = 180,
    automated_backups_enabled = true,
    backup_frequency = 'daily',
    backup_retention_count = 7,
    updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'uuid' OR (organization_id IS NULL AND user_id IS NULL);
```

## Testing

1. Test system information retrieval and updates
2. Test system resources recording and retrieval
3. Test data management settings retrieval and updates
4. Test backup creation and history
5. Test backup summary
6. Test data retention cleanup
7. Test backup rotation
