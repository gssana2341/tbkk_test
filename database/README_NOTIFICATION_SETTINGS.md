# Notification Settings Database Schema

## Overview

This database schema supports user-level and organization-level notification settings for Email, SMS, and Webhook notifications in the TBKK-Surazense application.

## Tables

### 1. email_notification_settings

Stores email notification configuration including recipients, sender, and notification type preferences.

**Columns:**

- `id` (UUID): Primary key
- `user_id` (UUID): Reference to users table (nullable for org-level settings)
- `organization_id` (UUID): Reference to organizations table
- `enabled` (BOOLEAN): Enable/disable email notifications
- `recipients` (TEXT): Comma-separated email addresses
- `sender_email` (VARCHAR): Sender email address
- `critical_alerts` (BOOLEAN): Enable critical alerts
- `warning_alerts` (BOOLEAN): Enable warning alerts
- `info_alerts` (BOOLEAN): Enable info alerts
- `daily_reports` (BOOLEAN): Enable daily reports
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

**Constraints:**

- Unique constraint on (user_id, organization_id)

### 2. sms_notification_settings

Stores SMS notification configuration including phone numbers, provider, and alert types.

**Columns:**

- `id` (UUID): Primary key
- `user_id` (UUID): Reference to users table (nullable for org-level settings)
- `organization_id` (UUID): Reference to organizations table
- `enabled` (BOOLEAN): Enable/disable SMS notifications
- `phone_numbers` (TEXT): Comma-separated phone numbers
- `provider` (VARCHAR): SMS provider ('twilio', 'aws-sns', 'custom')
- `critical_alerts` (BOOLEAN): Enable critical alerts
- `warning_alerts` (BOOLEAN): Enable warning alerts
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

**Constraints:**

- Unique constraint on (user_id, organization_id)
- Check constraint on provider to ensure valid values

### 3. webhook_notification_settings

Stores webhook notification configuration including URL, secret, format, and custom template.

**Columns:**

- `id` (UUID): Primary key
- `user_id` (UUID): Reference to users table (nullable for org-level settings)
- `organization_id` (UUID): Reference to organizations table
- `enabled` (BOOLEAN): Enable/disable webhook notifications
- `webhook_url` (TEXT): Webhook endpoint URL
- `webhook_secret` (TEXT): Optional secret for authentication
- `payload_format` (VARCHAR): Payload format ('json', 'xml', 'form')
- `custom_template` (TEXT): Optional custom payload template
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Last update timestamp

**Constraints:**

- Unique constraint on (user_id, organization_id)
- Check constraint on payload_format to ensure valid values

## Features

### 1. Automatic Timestamp Updates

Triggers automatically update the `updated_at` column when records are modified.

### 2. User and Organization Level Settings

Settings can be set at both user level and organization level. User-level settings take precedence over organization-level settings.

### 3. Indexes

Indexes are created on `user_id` and `organization_id` for better query performance.

## API Endpoints (Backend Implementation Required)

### GET /settings/notifications

Get all notification settings for the current user.

**Response:**

```json
{
  "settings": {
    "email": {
      "enabled": true,
      "recipients": "user1@example.com,user2@example.com",
      "sender_email": "notifications@example.com",
      "critical_alerts": true,
      "warning_alerts": true,
      "info_alerts": false,
      "daily_reports": true
    },
    "sms": {
      "enabled": false,
      "phone_numbers": "+1234567890",
      "provider": "twilio",
      "critical_alerts": true,
      "warning_alerts": false
    },
    "webhook": {
      "enabled": false,
      "webhook_url": "https://your-webhook-endpoint.com/notify",
      "webhook_secret": "",
      "payload_format": "json",
      "custom_template": ""
    }
  }
}
```

### PUT /settings/notifications/email

Update email notification settings.

**Request Body:**

```json
{
  "enabled": true,
  "recipients": "user1@example.com,user2@example.com",
  "sender_email": "notifications@example.com",
  "critical_alerts": true,
  "warning_alerts": true,
  "info_alerts": false,
  "daily_reports": true
}
```

### PUT /settings/notifications/sms

Update SMS notification settings.

**Request Body:**

```json
{
  "enabled": true,
  "phone_numbers": "+1234567890,+0987654321",
  "provider": "twilio",
  "critical_alerts": true,
  "warning_alerts": false
}
```

### PUT /settings/notifications/webhook

Update webhook notification settings.

**Request Body:**

```json
{
  "enabled": true,
  "webhook_url": "https://your-webhook-endpoint.com/notify",
  "webhook_secret": "your-secret-key",
  "payload_format": "json",
  "custom_template": "{\"event\": \"{{event}}\", \"sensor\": \"{{sensor}}\"}"
}
```

### PUT /settings/notifications

Update all notification settings at once.

**Request Body:**

```json
{
  "email": {
    "enabled": true,
    "recipients": "user@example.com"
  },
  "sms": {
    "enabled": false
  },
  "webhook": {
    "enabled": true,
    "webhook_url": "https://example.com/webhook"
  }
}
```

## Usage Notes

1. **User-level vs Organization-level**: When querying settings, user-level settings take precedence. If a user doesn't have user-level settings, organization-level settings are used.

2. **Default Values**: Default values are defined in the schema and in the frontend code (localStorage fallback).

3. **LocalStorage Fallback**: The frontend includes localStorage fallback for cases where the backend API is not available or during development.

4. **Authentication**: All API endpoints require authentication (Bearer token).

5. **Recipients/Phone Numbers Format**: Store as comma-separated strings. Parse in application code.

6. **Webhook Template Variables**: Supported variables: `{{event}}`, `{{sensor}}`, `{{value}}`, `{{timestamp}}`, `{{location}}`, `{{machine}}`

## Migration Steps

1. Run the SQL schema file to create tables:

   ```sql
   \i database/notification_settings_schema.sql
   ```

2. Verify tables are created:

   ```sql
   \d email_notification_settings
   \d sms_notification_settings
   \d webhook_notification_settings
   ```

3. Test insert and update operations.

4. Implement backend API endpoints matching the frontend API service.

## Example Backend Implementation (Node.js/Express)

```javascript
// Get notification settings
app.get("/settings/notifications", authenticate, async (req, res) => {
  const userId = req.user.id;
  const orgId = req.user.organization_id;

  // Get user-level settings
  const emailSettings = await db.query(
    "SELECT * FROM email_notification_settings WHERE user_id = $1",
    [userId]
  );

  const smsSettings = await db.query(
    "SELECT * FROM sms_notification_settings WHERE user_id = $1",
    [userId]
  );

  const webhookSettings = await db.query(
    "SELECT * FROM webhook_notification_settings WHERE user_id = $1",
    [userId]
  );

  // If no user-level settings, get org-level
  const email =
    emailSettings.rows[0] || (await getOrgLevelSettings("email", orgId));
  const sms = smsSettings.rows[0] || (await getOrgLevelSettings("sms", orgId));
  const webhook =
    webhookSettings.rows[0] || (await getOrgLevelSettings("webhook", orgId));

  res.json({
    settings: {
      email: email || getDefaultEmailSettings(),
      sms: sms || getDefaultSmsSettings(),
      webhook: webhook || getDefaultWebhookSettings(),
    },
  });
});

// Update email notification settings
app.put("/settings/notifications/email", authenticate, async (req, res) => {
  const userId = req.user.id;
  const orgId = req.user.organization_id;
  const {
    enabled,
    recipients,
    sender_email,
    critical_alerts,
    warning_alerts,
    info_alerts,
    daily_reports,
  } = req.body;

  const result = await db.query(
    `INSERT INTO email_notification_settings (
      user_id, organization_id, enabled, recipients, sender_email,
      critical_alerts, warning_alerts, info_alerts, daily_reports
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (user_id, organization_id)
    DO UPDATE SET
      enabled = EXCLUDED.enabled,
      recipients = EXCLUDED.recipients,
      sender_email = EXCLUDED.sender_email,
      critical_alerts = EXCLUDED.critical_alerts,
      warning_alerts = EXCLUDED.warning_alerts,
      info_alerts = EXCLUDED.info_alerts,
      daily_reports = EXCLUDED.daily_reports,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *`,
    [
      userId,
      orgId,
      enabled,
      recipients,
      sender_email,
      critical_alerts,
      warning_alerts,
      info_alerts,
      daily_reports,
    ]
  );

  res.json({ settings: result.rows[0] });
});
```

## Security Considerations

1. **Webhook Secret**: Store webhook secrets securely. Consider encryption at rest.
2. **Phone Numbers**: Validate phone number format before storing.
3. **Email Validation**: Validate email addresses before storing.
4. **URL Validation**: Validate webhook URLs before storing.
5. **Access Control**: Ensure users can only access/modify their own settings or organization settings they have permission for.
