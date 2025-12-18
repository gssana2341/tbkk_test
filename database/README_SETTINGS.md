# Settings Database Schema

## Overview

This database schema supports user-level and organization-level settings for the TBKK-Surazense application.

## Tables

### 1. system_settings

Stores system configuration settings such as system name, timezone, date format, and temperature unit.

**Columns:**

- `id` (UUID): Primary key
- `user_id` (UUID): Reference to users table (nullable for org-level settings)
- `organization_id` (UUID): Reference to organizations table
- `system_name` (VARCHAR): Name of the system
- `timezone` (VARCHAR): Timezone (e.g., 'Asia/Bangkok', 'UTC')
- `date_format` (VARCHAR): Date format (e.g., 'MM/DD/YYYY', 'DD/MM/YYYY')
- `temperature_unit` (VARCHAR): 'celsius' or 'fahrenheit'
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

**Constraints:**

- Unique constraint on (user_id, organization_id) to ensure one setting per user/org combination
- Check constraint on temperature_unit to ensure valid values

### 2. display_settings

Stores display preferences such as auto-refresh, refresh interval, grid lines, and tooltips.

**Columns:**

- `id` (UUID): Primary key
- `user_id` (UUID): Reference to users table (nullable for org-level settings)
- `organization_id` (UUID): Reference to organizations table
- `auto_refresh` (BOOLEAN): Enable/disable auto-refresh
- `refresh_interval` (INTEGER): Refresh interval in seconds (must be > 0)
- `show_grid_lines` (BOOLEAN): Show/hide grid lines on charts
- `show_tooltips` (BOOLEAN): Show/hide tooltips on hover
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

**Constraints:**

- Unique constraint on (user_id, organization_id)
- Check constraint on refresh_interval to ensure positive values

## Features

### 1. Automatic Timestamp Updates

Triggers automatically update the `updated_at` column when records are modified.

### 2. User and Organization Level Settings

Settings can be set at both user level and organization level. User-level settings take precedence over organization-level settings.

### 3. Indexes

Indexes are created on `user_id` and `organization_id` for better query performance.

## API Endpoints (Backend Implementation Required)

### GET /settings

Get all settings for the current user (merges user-level and org-level settings).

**Response:**

```json
{
  "settings": {
    "system": {
      "system_name": "TBKK-Surazense",
      "timezone": "Asia/Bangkok",
      "date_format": "DD/MM/YYYY",
      "temperature_unit": "celsius"
    },
    "display": {
      "auto_refresh": true,
      "refresh_interval": 30,
      "show_grid_lines": true,
      "show_tooltips": true
    }
  }
}
```

### PUT /settings/system

Update system settings.

**Request Body:**

```json
{
  "system_name": "New Name",
  "timezone": "Asia/Bangkok",
  "date_format": "DD/MM/YYYY",
  "temperature_unit": "celsius"
}
```

### PUT /settings/display

Update display settings.

**Request Body:**

```json
{
  "auto_refresh": true,
  "refresh_interval": 60,
  "show_grid_lines": true,
  "show_tooltips": true
}
```

### PUT /settings

Update all settings at once.

**Request Body:**

```json
{
  "system": {
    "system_name": "New Name",
    "timezone": "Asia/Bangkok"
  },
  "display": {
    "auto_refresh": false,
    "refresh_interval": 60
  }
}
```

## Usage Notes

1. **User-level vs Organization-level**: When querying settings, user-level settings take precedence. If a user doesn't have user-level settings, organization-level settings are used.

2. **Default Values**: Default values are defined in the schema and in the frontend code (localStorage fallback).

3. **LocalStorage Fallback**: The frontend includes localStorage fallback for cases where the backend API is not available or during development.

4. **Authentication**: All API endpoints require authentication (Bearer token).

## Migration Steps

1. Run the SQL schema file to create tables:

   ```sql
   \i database/settings_schema.sql
   ```

2. Verify tables are created:

   ```sql
   \d system_settings
   \d display_settings
   ```

3. Test insert and update operations.

4. Implement backend API endpoints matching the frontend API service.

## Example Backend Implementation (Node.js/Express)

```javascript
// Get settings
app.get("/settings", authenticate, async (req, res) => {
  const userId = req.user.id;
  const orgId = req.user.organization_id;

  // Get user-level settings
  const userSettings = await db.query(
    "SELECT * FROM system_settings WHERE user_id = $1",
    [userId]
  );

  // Get org-level settings
  const orgSettings = await db.query(
    "SELECT * FROM system_settings WHERE organization_id = $1 AND user_id IS NULL",
    [orgId]
  );

  // Merge settings (user takes precedence)
  const settings = mergeSettings(userSettings, orgSettings);

  res.json({ settings });
});

// Update system settings
app.put("/settings/system", authenticate, async (req, res) => {
  const userId = req.user.id;
  const orgId = req.user.organization_id;
  const { system_name, timezone, date_format, temperature_unit } = req.body;

  const result = await db.query(
    `INSERT INTO system_settings (user_id, organization_id, system_name, timezone, date_format, temperature_unit)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, organization_id)
     DO UPDATE SET
       system_name = EXCLUDED.system_name,
       timezone = EXCLUDED.timezone,
       date_format = EXCLUDED.date_format,
       temperature_unit = EXCLUDED.temperature_unit,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [userId, orgId, system_name, timezone, date_format, temperature_unit]
  );

  res.json({ settings: result.rows[0] });
});
```
