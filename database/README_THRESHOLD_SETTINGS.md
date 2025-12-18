# Threshold Settings Database Schema

## Overview

This database schema supports global threshold settings and machine-specific threshold overrides for temperature and vibration alerts in the TBKK-Surazense application.

## Tables

### 1. threshold_settings

Stores global threshold settings for temperature and vibration alerts at the organization level.

**Columns:**

- `id` (UUID): Primary key
- `organization_id` (UUID): Reference to organizations table
- `temperature_warning` (DECIMAL): Warning threshold for temperature in Celsius
- `temperature_critical` (DECIMAL): Critical threshold for temperature in Celsius
- `vibration_warning` (DECIMAL): Warning threshold for vibration
- `vibration_critical` (DECIMAL): Critical threshold for vibration
- `vibration_x_axis_warning` (DECIMAL): Optional X-axis vibration warning threshold
- `vibration_y_axis_warning` (DECIMAL): Optional Y-axis vibration warning threshold
- `vibration_z_axis_warning` (DECIMAL): Optional Z-axis vibration warning threshold
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

**Constraints:**

- Unique constraint on organization_id to ensure one setting per organization

### 2. machine_threshold_overrides

Stores machine-specific threshold overrides that take precedence over global settings.

**Columns:**

- `id` (UUID): Primary key
- `organization_id` (UUID): Reference to organizations table
- `machine_id` (UUID): Reference to machines table (nullable - use machine_name if machine_id is not a valid UUID)
- `machine_name` (VARCHAR): Machine name for reference (required if machine_id is null)
- `machine_class` (VARCHAR): Machine class for reference
- `temperature_warning` (DECIMAL): Optional override for temperature warning threshold
- `temperature_critical` (DECIMAL): Optional override for temperature critical threshold
- `vibration_warning` (DECIMAL): Optional override for vibration warning threshold
- `vibration_critical` (DECIMAL): Optional override for vibration critical threshold
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

**Constraints:**

- Unique index on (organization_id, machine_id) where machine_id IS NOT NULL
- Unique index on (organization_id, machine_name) where machine_id IS NULL
- Check constraint to ensure at least one override value is provided
- Check constraint to ensure either machine_id or machine_name is provided

## Features

### 1. Automatic Timestamp Updates

Triggers automatically update the `updated_at` column when records are modified.

### 2. Organization Level Settings

Global thresholds are set at the organization level.

### 3. Machine-Specific Overrides

Individual machines can have custom thresholds that override global settings.

### 4. Threshold Resolution Logic

When determining thresholds for a sensor:

1. Check for machine-specific override (highest priority)
2. If no override, use global organization thresholds
3. If no organization thresholds, use system defaults

## API Endpoints (Backend Implementation Required)

### GET /settings/thresholds

Get all threshold settings for the current organization.

**Response:**

```json
{
  "settings": {
    "temperature": {
      "warning": 30.0,
      "critical": 35.0
    },
    "vibration": {
      "warning": 0.8,
      "critical": 1.2,
      "x_axis_warning": 0.8,
      "y_axis_warning": 0.8,
      "z_axis_warning": 0.8
    },
    "machine_overrides": [
      {
        "id": "override-123",
        "machine_id": "machine-456",
        "machine_name": "Pump-01",
        "machine_class": "pump",
        "temperature_warning": 28.0,
        "temperature_critical": 33.0
      }
    ]
  }
}
```

### PUT /settings/thresholds/temperature

Update global temperature thresholds.

**Request Body:**

```json
{
  "warning": 30.0,
  "critical": 35.0
}
```

### PUT /settings/thresholds/vibration

Update global vibration thresholds.

**Request Body:**

```json
{
  "warning": 0.8,
  "critical": 1.2,
  "x_axis_warning": 0.8,
  "y_axis_warning": 0.8,
  "z_axis_warning": 0.8
}
```

### POST /settings/thresholds/machine-overrides

Add a new machine threshold override.

**Request Body:**

```json
{
  "machine_id": "machine-456",
  "machine_name": "Pump-01",
  "machine_class": "pump",
  "temperature_warning": 28.0,
  "temperature_critical": 33.0
}
```

### PUT /settings/thresholds/machine-overrides/:id

Update an existing machine threshold override.

**Request Body:**

```json
{
  "temperature_warning": 29.0,
  "temperature_critical": 34.0
}
```

### DELETE /settings/thresholds/machine-overrides/:id

Delete a machine threshold override.

### PUT /settings/thresholds

Update all threshold settings at once.

**Request Body:**

```json
{
  "temperature": {
    "warning": 30.0,
    "critical": 35.0
  },
  "vibration": {
    "warning": 0.8,
    "critical": 1.2
  }
}
```

## Usage Notes

1. **Global vs Machine-Specific**: Global thresholds apply to all sensors unless overridden by machine-specific settings.

2. **Threshold Resolution**: When checking sensor values:
   - First check for machine-specific override
   - If not found, use global organization thresholds
   - If not found, use system defaults

3. **Default Values**: Default values are defined in the schema and in the frontend code (localStorage fallback).

4. **LocalStorage Fallback**: The frontend includes localStorage fallback for cases where the backend API is not available or during development.

5. **Authentication**: All API endpoints require authentication (Bearer token).

6. **Organization Scope**: All threshold settings are scoped to organizations.

## Migration Steps

1. Run the SQL schema file to create tables:

   ```sql
   \i database/threshold_settings_schema.sql
   ```

2. Verify tables are created:

   ```sql
   \d threshold_settings
   \d machine_threshold_overrides
   ```

3. Test insert and update operations.

4. Implement backend API endpoints matching the frontend API service.

## Example Backend Implementation (Node.js/Express)

```javascript
// Get threshold settings
app.get("/settings/thresholds", authenticate, async (req, res) => {
  const orgId = req.user.organization_id;

  // Get global thresholds
  const globalThresholds = await db.query(
    "SELECT * FROM threshold_settings WHERE organization_id = $1",
    [orgId]
  );

  // Get machine overrides
  const machineOverrides = await db.query(
    "SELECT * FROM machine_threshold_overrides WHERE organization_id = $1",
    [orgId]
  );

  // Use defaults if no settings found
  const settings = globalThresholds.rows[0] || {
    temperature_warning: 30.0,
    temperature_critical: 35.0,
    vibration_warning: 0.8,
    vibration_critical: 1.2,
  };

  res.json({
    settings: {
      temperature: {
        warning: parseFloat(settings.temperature_warning),
        critical: parseFloat(settings.temperature_critical),
      },
      vibration: {
        warning: parseFloat(settings.vibration_warning),
        critical: parseFloat(settings.vibration_critical),
        x_axis_warning: settings.vibration_x_axis_warning
          ? parseFloat(settings.vibration_x_axis_warning)
          : undefined,
        y_axis_warning: settings.vibration_y_axis_warning
          ? parseFloat(settings.vibration_y_axis_warning)
          : undefined,
        z_axis_warning: settings.vibration_z_axis_warning
          ? parseFloat(settings.vibration_z_axis_warning)
          : undefined,
      },
      machine_overrides: machineOverrides.rows.map((row) => ({
        id: row.id,
        machine_id: row.machine_id,
        machine_name: row.machine_name,
        machine_class: row.machine_class,
        temperature_warning: row.temperature_warning
          ? parseFloat(row.temperature_warning)
          : undefined,
        temperature_critical: row.temperature_critical
          ? parseFloat(row.temperature_critical)
          : undefined,
        vibration_warning: row.vibration_warning
          ? parseFloat(row.vibration_warning)
          : undefined,
        vibration_critical: row.vibration_critical
          ? parseFloat(row.vibration_critical)
          : undefined,
      })),
    },
  });
});

// Update temperature thresholds
app.put("/settings/thresholds/temperature", authenticate, async (req, res) => {
  const orgId = req.user.organization_id;
  const { warning, critical } = req.body;

  const result = await db.query(
    `INSERT INTO threshold_settings (organization_id, temperature_warning, temperature_critical)
     VALUES ($1, $2, $3)
     ON CONFLICT (organization_id)
     DO UPDATE SET
       temperature_warning = EXCLUDED.temperature_warning,
       temperature_critical = EXCLUDED.temperature_critical,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [orgId, warning, critical]
  );

  res.json({
    thresholds: {
      warning: parseFloat(result.rows[0].temperature_warning),
      critical: parseFloat(result.rows[0].temperature_critical),
    },
  });
});

// Add machine override
app.post(
  "/settings/thresholds/machine-overrides",
  authenticate,
  async (req, res) => {
    const orgId = req.user.organization_id;
    const {
      machine_id,
      machine_name,
      machine_class,
      temperature_warning,
      temperature_critical,
      vibration_warning,
      vibration_critical,
    } = req.body;

    const result = await db.query(
      `INSERT INTO machine_threshold_overrides (
      organization_id, machine_id, machine_name, machine_class,
      temperature_warning, temperature_critical, vibration_warning, vibration_critical
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (organization_id, machine_id)
    DO UPDATE SET
      temperature_warning = EXCLUDED.temperature_warning,
      temperature_critical = EXCLUDED.temperature_critical,
      vibration_warning = EXCLUDED.vibration_warning,
      vibration_critical = EXCLUDED.vibration_critical,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *`,
      [
        orgId,
        machine_id,
        machine_name,
        machine_class,
        temperature_warning,
        temperature_critical,
        vibration_warning,
        vibration_critical,
      ]
    );

    res.json({ override: result.rows[0] });
  }
);
```

## Security Considerations

1. **Authorization**: Ensure users can only access/modify threshold settings for their organization.
2. **Validation**: Validate threshold values (e.g., critical > warning, positive values).
3. **Machine Access**: Validate that users have access to machines before creating overrides.
4. **Data Types**: Use DECIMAL for precise threshold values instead of FLOAT.

## Integration with Sensor Alerts

When a sensor reading is received:

1. Get the sensor's machine_id or machine_class
2. Query for machine-specific override first
3. If not found, use global organization thresholds
4. Compare sensor values against thresholds
5. Trigger alerts if thresholds are exceeded
