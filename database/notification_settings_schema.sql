-- Notification Settings Database Schema
-- This schema supports user-level and organization-level notification settings

-- Email Notification Settings Table
CREATE TABLE IF NOT EXISTS email_notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT false,
    recipients TEXT NOT NULL DEFAULT '', -- comma-separated email addresses
    sender_email VARCHAR(255) NOT NULL DEFAULT 'notifications@example.com',
    critical_alerts BOOLEAN NOT NULL DEFAULT true,
    warning_alerts BOOLEAN NOT NULL DEFAULT true,
    info_alerts BOOLEAN NOT NULL DEFAULT false,
    daily_reports BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, organization_id)
);

-- SMS Notification Settings Table
CREATE TABLE IF NOT EXISTS sms_notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT false,
    phone_numbers TEXT NOT NULL DEFAULT '', -- comma-separated phone numbers
    provider VARCHAR(50) NOT NULL DEFAULT 'twilio' CHECK (provider IN ('twilio', 'aws-sns', 'custom')),
    critical_alerts BOOLEAN NOT NULL DEFAULT true,
    warning_alerts BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, organization_id)
);

-- Webhook Notification Settings Table
CREATE TABLE IF NOT EXISTS webhook_notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT false,
    webhook_url TEXT NOT NULL DEFAULT '',
    webhook_secret TEXT, -- Optional secret for webhook authentication
    payload_format VARCHAR(20) NOT NULL DEFAULT 'json' CHECK (payload_format IN ('json', 'xml', 'form')),
    custom_template TEXT, -- Optional custom payload template
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, organization_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_email_notifications_user_id ON email_notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_org_id ON email_notification_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_user_id ON sms_notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_org_id ON sms_notification_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_webhook_notifications_user_id ON webhook_notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_notifications_org_id ON webhook_notification_settings(organization_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_email_notifications_updated_at 
    BEFORE UPDATE ON email_notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_updated_at_column();

CREATE TRIGGER update_sms_notifications_updated_at 
    BEFORE UPDATE ON sms_notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_updated_at_column();

CREATE TRIGGER update_webhook_notifications_updated_at 
    BEFORE UPDATE ON webhook_notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_updated_at_column();

-- Example queries:

-- Get all notification settings for a user
-- SELECT 
--     e.enabled as email_enabled,
--     e.recipients as email_recipients,
--     e.sender_email,
--     e.critical_alerts as email_critical,
--     e.warning_alerts as email_warning,
--     e.info_alerts as email_info,
--     e.daily_reports as email_daily_reports,
--     s.enabled as sms_enabled,
--     s.phone_numbers,
--     s.provider as sms_provider,
--     s.critical_alerts as sms_critical,
--     s.warning_alerts as sms_warning,
--     w.enabled as webhook_enabled,
--     w.webhook_url,
--     w.payload_format,
--     w.custom_template
-- FROM users u
-- LEFT JOIN email_notification_settings e ON e.user_id = u.id
-- LEFT JOIN sms_notification_settings s ON s.user_id = u.id
-- LEFT JOIN webhook_notification_settings w ON w.user_id = u.id
-- WHERE u.id = '<user_id>';

-- Update email notification settings (UPSERT)
-- INSERT INTO email_notification_settings (
--     user_id, 
--     organization_id, 
--     enabled, 
--     recipients, 
--     sender_email,
--     critical_alerts,
--     warning_alerts,
--     info_alerts,
--     daily_reports
-- )
-- VALUES (
--     '<user_id>', 
--     '<organization_id>', 
--     true, 
--     'user1@example.com,user2@example.com', 
--     'notifications@example.com',
--     true,
--     true,
--     false,
--     true
-- )
-- ON CONFLICT (user_id, organization_id) 
-- DO UPDATE SET 
--     enabled = EXCLUDED.enabled,
--     recipients = EXCLUDED.recipients,
--     sender_email = EXCLUDED.sender_email,
--     critical_alerts = EXCLUDED.critical_alerts,
--     warning_alerts = EXCLUDED.warning_alerts,
--     info_alerts = EXCLUDED.info_alerts,
--     daily_reports = EXCLUDED.daily_reports,
--     updated_at = CURRENT_TIMESTAMP;

-- Update SMS notification settings (UPSERT)
-- INSERT INTO sms_notification_settings (
--     user_id,
--     organization_id,
--     enabled,
--     phone_numbers,
--     provider,
--     critical_alerts,
--     warning_alerts
-- )
-- VALUES (
--     '<user_id>',
--     '<organization_id>',
--     true,
--     '+1234567890,+0987654321',
--     'twilio',
--     true,
--     false
-- )
-- ON CONFLICT (user_id, organization_id)
-- DO UPDATE SET
--     enabled = EXCLUDED.enabled,
--     phone_numbers = EXCLUDED.phone_numbers,
--     provider = EXCLUDED.provider,
--     critical_alerts = EXCLUDED.critical_alerts,
--     warning_alerts = EXCLUDED.warning_alerts,
--     updated_at = CURRENT_TIMESTAMP;

-- Update webhook notification settings (UPSERT)
-- INSERT INTO webhook_notification_settings (
--     user_id,
--     organization_id,
--     enabled,
--     webhook_url,
--     webhook_secret,
--     payload_format,
--     custom_template
-- )
-- VALUES (
--     '<user_id>',
--     '<organization_id>',
--     true,
--     'https://your-webhook-endpoint.com/notify',
--     'your-secret-key',
--     'json',
--     '{"event": "{{event}}", "sensor": "{{sensor}}", "value": "{{value}}"}'
-- )
-- ON CONFLICT (user_id, organization_id)
-- DO UPDATE SET
--     enabled = EXCLUDED.enabled,
--     webhook_url = EXCLUDED.webhook_url,
--     webhook_secret = EXCLUDED.webhook_secret,
--     payload_format = EXCLUDED.payload_format,
--     custom_template = EXCLUDED.custom_template,
--     updated_at = CURRENT_TIMESTAMP;

