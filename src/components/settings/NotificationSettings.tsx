"use client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getNotificationSettings,
  updateEmailNotificationSettings,
  updateSmsNotificationSettings,
  updateWebhookNotificationSettings,
} from "@/api/settings/notifications";
import type { NotificationSettings } from "@/lib/types";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

const placeholders = [
  "event",
  "sensor",
  "value",
  "timestamp",
  "location",
  "machine",
];

export default function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"email" | "sms" | "webhook" | null>(
    null
  );
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | null>(
    null
  );
  const [error, setError] = useState<string>("");

  // Confirmation dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    title: "",
    description: "",
    onConfirm: () => { },
  });

  const triggerConfirm = (
    title: string,
    description: string,
    onConfirm: () => void
  ) => {
    setConfirmConfig({ title, description, onConfirm });
    setConfirmOpen(true);
  };

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError("");
      const loadedSettings = await getNotificationSettings();
      setSettings(loadedSettings);
    } catch (err) {
      console.error("Error loading notification settings:", err);
      setError("Failed to load notification settings. Using default values.");
      // Use default settings if loading fails
      setSettings({
        email: {
          enabled: true,
          recipients: "",
          sender_email: "notifications@example.com",
          critical_alerts: true,
          warning_alerts: true,
          info_alerts: false,
          daily_reports: true,
        },
        sms: {
          enabled: false,
          phone_numbers: "",
          provider: "twilio",
          critical_alerts: true,
          warning_alerts: false,
        },
        webhook: {
          enabled: false,
          webhook_url: "",
          webhook_secret: "",
          payload_format: "json",
          custom_template: "",
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!settings) return;

    triggerConfirm(
      "Save Email Settings",
      "Are you sure you want to save the email notification settings?",
      async () => {
        try {
          setSaving("email");
          setSaveStatus(null);
          setError("");

          const updated = await updateEmailNotificationSettings(settings.email);
          setSettings({
            ...settings,
            email: updated,
          });
          setSaveStatus("success");

          setTimeout(() => {
            setSaveStatus(null);
          }, 3000);
        } catch (err) {
          console.error("Error saving email settings:", err);
          setSaveStatus("error");
          setError("Failed to save email settings. Please try again.");
        } finally {
          setSaving(null);
        }
      }
    );
  };

  const handleSaveSms = async () => {
    if (!settings) return;

    triggerConfirm(
      "Save SMS Settings",
      "Are you sure you want to save the SMS notification settings?",
      async () => {
        try {
          setSaving("sms");
          setSaveStatus(null);
          setError("");

          const updated = await updateSmsNotificationSettings(settings.sms);
          setSettings({
            ...settings,
            sms: updated,
          });
          setSaveStatus("success");

          setTimeout(() => {
            setSaveStatus(null);
          }, 3000);
        } catch (err) {
          console.error("Error saving SMS settings:", err);
          setSaveStatus("error");
          setError("Failed to save SMS settings. Please try again.");
        } finally {
          setSaving(null);
        }
      }
    );
  };

  const handleSaveWebhook = async () => {
    if (!settings) return;

    triggerConfirm(
      "Save Webhook Settings",
      "Are you sure you want to save the webhook notification settings?",
      async () => {
        try {
          setSaving("webhook");
          setSaveStatus(null);
          setError("");

          const updated = await updateWebhookNotificationSettings(
            settings.webhook
          );
          setSettings({
            ...settings,
            webhook: updated,
          });
          setSaveStatus("success");

          setTimeout(() => {
            setSaveStatus(null);
          }, 3000);
        } catch (err) {
          console.error("Error saving webhook settings:", err);
          setSaveStatus("error");
          setError("Failed to save webhook settings. Please try again.");
        } finally {
          setSaving(null);
        }
      }
    );
  };

  const updateEmailSetting = <K extends keyof NotificationSettings["email"]>(
    key: K,
    value: NotificationSettings["email"][K]
  ) => {
    if (!settings) return;
    setSettings({
      ...settings,
      email: {
        ...settings.email,
        [key]: value,
      },
    });
  };

  const updateSmsSetting = <K extends keyof NotificationSettings["sms"]>(
    key: K,
    value: NotificationSettings["sms"][K]
  ) => {
    if (!settings) return;
    setSettings({
      ...settings,
      sms: {
        ...settings.sms,
        [key]: value,
      },
    });
  };

  const updateWebhookSetting = <
    K extends keyof NotificationSettings["webhook"],
  >(
    key: K,
    value: NotificationSettings["webhook"][K]
  ) => {
    if (!settings) return;
    setSettings({
      ...settings,
      webhook: {
        ...settings.webhook,
        [key]: value,
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!settings) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load notification settings. Please refresh the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 mt-6">
      {saveStatus === "success" && (
        <Alert className="mb-4">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-500">
            Settings saved successfully!
          </AlertDescription>
        </Alert>
      )}

      {saveStatus === "error" && error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="email" className="w-full">
        <TabsList className="grid w-full md:w-auto grid-cols-3 bg-[#030616] border-[1.35px] border-[#374151] text-white">
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="sms">SMS</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="email">
          <Card className="bg-[#030616] border-[1.35px] border-[#374151] text-white">
            <CardHeader>
              <CardTitle>Email Notification Settings</CardTitle>
              <CardDescription>
                Configure email notifications for alerts and reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">
                      Enable Email Notifications
                    </h3>
                    <p className="text-sm text-gray-500">
                      Send notifications via email
                    </p>
                  </div>
                  <Switch
                    checked={settings.email.enabled}
                    onCheckedChange={(checked) =>
                      updateEmailSetting("enabled", checked)
                    }
                  />
                </div>

                {settings.email.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="email-recipients">Email Recipients</Label>
                      <Input
                        id="email-recipients"
                        value={settings.email.recipients}
                        onChange={(e) =>
                          updateEmailSetting("recipients", e.target.value)
                        }
                        placeholder="Enter email addresses (comma separated)"
                        className="bg-[#030616] border-[1.35px] border-[#374151] text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email-sender">Sender Email</Label>
                      <Input
                        id="email-sender"
                        value={settings.email.sender_email}
                        onChange={(e) =>
                          updateEmailSetting("sender_email", e.target.value)
                        }
                        placeholder="Enter sender email"
                        className="bg-[#030616] border-[1.35px] border-[#374151] text-white"
                      />
                    </div>
                  </div>
                )}

                {settings.email.enabled && (
                  <div className="space-y-2">
                    <Label>Notification Types</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="critical-alerts"
                          checked={settings.email.critical_alerts}
                          onCheckedChange={(checked) =>
                            updateEmailSetting("critical_alerts", checked)
                          }
                        />
                        <Label htmlFor="critical-alerts">Critical Alerts</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="warning-alerts"
                          checked={settings.email.warning_alerts}
                          onCheckedChange={(checked) =>
                            updateEmailSetting("warning_alerts", checked)
                          }
                        />
                        <Label htmlFor="warning-alerts">Warning Alerts</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="info-alerts"
                          checked={settings.email.info_alerts}
                          onCheckedChange={(checked) =>
                            updateEmailSetting("info_alerts", checked)
                          }
                        />
                        <Label htmlFor="info-alerts">Info Alerts</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="daily-reports"
                          checked={settings.email.daily_reports}
                          onCheckedChange={(checked) =>
                            updateEmailSetting("daily_reports", checked)
                          }
                        />
                        <Label htmlFor="daily-reports">Daily Reports</Label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={loadSettings}
                  disabled={saving === "email"}
                  className="bg-transparent border-[#4B5563] text-white hover:bg-[#374151] hover:text-white"
                >
                  Reset
                </Button>
                <Button
                  onClick={handleSaveEmail}
                  disabled={saving === "email" || !settings}
                >
                  {saving === "email" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Email Settings"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sms">
          <Card className="bg-[#030616] border-[1.35px] border-[#374151] text-white">
            <CardHeader>
              <CardTitle>SMS Notification Settings</CardTitle>
              <CardDescription>
                Configure SMS notifications for critical alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">
                      Enable SMS Notifications
                    </h3>
                    <p className="text-sm text-gray-500">
                      Send critical alerts via SMS
                    </p>
                  </div>
                  <Switch
                    checked={settings.sms.enabled}
                    onCheckedChange={(checked) =>
                      updateSmsSetting("enabled", checked)
                    }
                  />
                </div>

                {settings.sms.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="phone-numbers">Phone Numbers</Label>
                      <Input
                        id="phone-numbers"
                        value={settings.sms.phone_numbers}
                        onChange={(e) =>
                          updateSmsSetting("phone_numbers", e.target.value)
                        }
                        placeholder="Enter phone numbers (comma separated)"
                        className="bg-[#030616] border-[1.35px] border-[#374151] text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sms-provider">SMS Provider</Label>
                      <Select
                        value={settings.sms.provider}
                        onValueChange={(
                          value: "twilio" | "aws-sns" | "custom"
                        ) => updateSmsSetting("provider", value)}
                      >
                        <SelectTrigger
                          id="sms-provider"
                          className="bg-[#030616] border-[1.35px] border-[#374151] text-white"
                        >
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#11171F] border-[#4B5563] text-white">
                          <SelectItem value="twilio">Twilio</SelectItem>
                          <SelectItem value="aws-sns">AWS SNS</SelectItem>
                          <SelectItem value="custom">
                            Custom Provider
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {settings.sms.enabled && (
                  <div className="space-y-2">
                    <Label>Alert Types</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="sms-critical-alerts"
                          checked={settings.sms.critical_alerts}
                          onCheckedChange={(checked) =>
                            updateSmsSetting("critical_alerts", checked)
                          }
                        />
                        <Label htmlFor="sms-critical-alerts">
                          Critical Alerts Only
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="sms-warning-alerts"
                          checked={settings.sms.warning_alerts}
                          onCheckedChange={(checked) =>
                            updateSmsSetting("warning_alerts", checked)
                          }
                        />
                        <Label htmlFor="sms-warning-alerts">
                          Warning Alerts
                        </Label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={loadSettings}
                  disabled={saving === "sms"}
                  className="bg-transparent border-[#4B5563] text-white hover:bg-[#374151] hover:text-white"
                >
                  Reset
                </Button>
                <Button
                  onClick={handleSaveSms}
                  disabled={saving === "sms" || !settings}
                >
                  {saving === "sms" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save SMS Settings"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks">
          <Card className="bg-[#030616] border-[1.35px] border-[#374151] text-white">
            <CardHeader>
              <CardTitle>Webhook Notification Settings</CardTitle>
              <CardDescription>
                Configure webhooks for system integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">
                      Enable Webhook Notifications
                    </h3>
                    <p className="text-sm text-gray-500">
                      Send notifications to external systems
                    </p>
                  </div>
                  <Switch
                    checked={settings.webhook.enabled}
                    onCheckedChange={(checked) =>
                      updateWebhookSetting("enabled", checked)
                    }
                  />
                </div>

                {settings.webhook.enabled && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="webhook-url">Webhook URL</Label>
                      <Input
                        id="webhook-url"
                        value={settings.webhook.webhook_url}
                        onChange={(e) =>
                          updateWebhookSetting("webhook_url", e.target.value)
                        }
                        placeholder="https://your-webhook-endpoint.com/notify"
                        className="bg-[#030616] border-[1.35px] border-[#374151] text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="webhook-secret">
                        Webhook Secret (Optional)
                      </Label>
                      <Input
                        id="webhook-secret"
                        type="password"
                        value={settings.webhook.webhook_secret || ""}
                        onChange={(e) =>
                          updateWebhookSetting("webhook_secret", e.target.value)
                        }
                        placeholder="Enter secret key"
                        className="bg-[#030616] border-[1.35px] border-[#374151] text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="webhook-format">Payload Format</Label>
                      <Select
                        value={settings.webhook.payload_format}
                        onValueChange={(value: "json" | "xml" | "form") =>
                          updateWebhookSetting("payload_format", value)
                        }
                      >
                        <SelectTrigger
                          id="webhook-format"
                          className="bg-[#030616] border-[1.35px] border-[#374151] text-white"
                        >
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#11171F] border-[#4B5563] text-white">
                          <SelectItem value="json">JSON</SelectItem>
                          <SelectItem value="xml">XML</SelectItem>
                          <SelectItem value="form">Form Data</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="webhook-template">
                        Custom Payload Template (Optional)
                      </Label>
                      <Textarea
                        id="webhook-template"
                        value={settings.webhook.custom_template || ""}
                        onChange={(e) =>
                          updateWebhookSetting(
                            "custom_template",
                            e.target.value
                          )
                        }
                        placeholder='{"event": "{{event}}", "sensor": "{{sensor}}", "value": "{{value}}", "timestamp": "{{timestamp}}"}'
                        className="font-mono text-sm h-32 bg-[#030616] border-[1.35px] border-[#374151] text-white"
                      />
                      <p className="text-xs text-gray-500">
                        Use{" "}
                        {placeholders
                          .map((placeholder) => `{{${placeholder}}}`)
                          .join(", ")}{" "}
                        for dynamic values. Available:{" "}
                        {placeholders
                          .map((placeholder) => `{{${placeholder}}}`)
                          .join(", ")}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={loadSettings}
                  disabled={saving === "webhook"}
                  className="bg-transparent border-[#4B5563] text-white hover:bg-[#374151] hover:text-white"
                >
                  Reset
                </Button>
                <Button
                  onClick={handleSaveWebhook}
                  disabled={saving === "webhook" || !settings}
                >
                  {saving === "webhook" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Webhook Settings"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        description={confirmConfig.description}
      />
    </div>
  );
}
