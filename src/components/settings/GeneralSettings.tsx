"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getSettings, updateSettings } from "@/api/settings/settings";
import type { Settings } from "@/lib/types";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function GeneralSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | null>(
    null
  );
  const [error, setError] = useState<string>("");

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError("");
      const loadedSettings = await getSettings();
      setSettings(loadedSettings);
    } catch (err) {
      console.error("Error loading settings:", err);
      setError("Failed to load settings. Using default values.");
      // Use default settings if loading fails
      setSettings({
        system: {
          system_name: "TBKK-Surazense",
          timezone: "UTC",
          date_format: "MM/DD/YYYY",
          temperature_unit: "celsius",
        },
        display: {
          auto_refresh: true,
          refresh_interval: 30,
          show_grid_lines: true,
          show_tooltips: true,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      setSaveStatus(null);
      setError("");

      await updateSettings(settings);
      setSaveStatus("success");

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveStatus(null);
      }, 3000);
    } catch (err) {
      console.error("Error saving settings:", err);
      setSaveStatus("error");
      setError("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const updateSystemSetting = <K extends keyof Settings["system"]>(
    key: K,
    value: Settings["system"][K]
  ) => {
    if (!settings) return;
    setSettings({
      ...settings,
      system: {
        ...settings.system,
        [key]: value,
      },
    });
  };

  const updateDisplaySetting = <K extends keyof Settings["display"]>(
    key: K,
    value: Settings["display"][K]
  ) => {
    if (!settings) return;
    setSettings({
      ...settings,
      display: {
        ...settings.display,
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
          Failed to load settings. Please refresh the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 mt-6">
      <Card className="bg-[#1F2937] border-[#374151] text-white">
        <CardHeader>
          <CardTitle>System Settings</CardTitle>
          <CardDescription>Configure general system settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="system-name">System Name</Label>
              <Input
                id="system-name"
                value={settings.system.system_name}
                onChange={(e) =>
                  updateSystemSetting("system_name", e.target.value)
                }
                placeholder="Enter system name"
                className="bg-[#11171F] border-[#4B5563] text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={settings.system.timezone}
                onValueChange={(value) =>
                  updateSystemSetting("timezone", value)
                }
              >
                <SelectTrigger
                  id="timezone"
                  className="bg-[#11171F] border-[#4B5563] text-white"
                >
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent className="bg-[#11171F] border-[#4B5563] text-white">
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">
                    Eastern Time (ET)
                  </SelectItem>
                  <SelectItem value="America/Chicago">
                    Central Time (CT)
                  </SelectItem>
                  <SelectItem value="America/Denver">
                    Mountain Time (MT)
                  </SelectItem>
                  <SelectItem value="America/Los_Angeles">
                    Pacific Time (PT)
                  </SelectItem>
                  <SelectItem value="Europe/London">London (GMT)</SelectItem>
                  <SelectItem value="Europe/Paris">
                    Central European Time (CET)
                  </SelectItem>
                  <SelectItem value="Asia/Bangkok">Thailand (ICT)</SelectItem>
                  <SelectItem value="Asia/Tokyo">
                    Japan Standard Time (JST)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-format">Date Format</Label>
              <Select
                value={settings.system.date_format}
                onValueChange={(value) =>
                  updateSystemSetting("date_format", value)
                }
              >
                <SelectTrigger
                  id="date-format"
                  className="bg-[#11171F] border-[#4B5563] text-white"
                >
                  <SelectValue placeholder="Select date format" />
                </SelectTrigger>
                <SelectContent className="bg-[#11171F] border-[#4B5563] text-white">
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  <SelectItem value="YYYY/MM/DD">YYYY/MM/DD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="temperature-unit">Temperature Unit</Label>
              <Select
                value={settings.system.temperature_unit}
                onValueChange={(value: "celsius" | "fahrenheit") =>
                  updateSystemSetting("temperature_unit", value)
                }
              >
                <SelectTrigger
                  id="temperature-unit"
                  className="bg-[#11171F] border-[#4B5563] text-white"
                >
                  <SelectValue placeholder="Select temperature unit" />
                </SelectTrigger>
                <SelectContent className="bg-[#11171F] border-[#4B5563] text-white">
                  <SelectItem value="celsius">Celsius (°C)</SelectItem>
                  <SelectItem value="fahrenheit">Fahrenheit (°F)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#1F2937] border-[#374151] text-white">
        <CardHeader>
          <CardTitle>Display Settings</CardTitle>
          <CardDescription>
            Configure how data is displayed and refreshed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Auto-refresh Data</h3>
              <p className="text-sm text-gray-500">
                Automatically refresh data at regular intervals
              </p>
            </div>
            <Switch
              checked={settings.display.auto_refresh}
              onCheckedChange={(checked) =>
                updateDisplaySetting("auto_refresh", checked)
              }
            />
          </div>

          {settings.display.auto_refresh && (
            <div className="pl-6 border-l-2 border-gray-200 dark:border-gray-700 space-y-2">
              <Label htmlFor="refresh-interval">
                Refresh Interval (seconds)
              </Label>
              <div className="flex gap-4">
                <Select
                  value={settings.display.refresh_interval.toString()}
                  onValueChange={(value) =>
                    updateDisplaySetting(
                      "refresh_interval",
                      parseInt(value, 10)
                    )
                  }
                >
                  <SelectTrigger
                    id="refresh-interval"
                    className="w-[180px] bg-[#11171F] border-[#4B5563] text-white"
                  >
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#11171F] border-[#4B5563] text-white">
                    <SelectItem value="10">10 seconds</SelectItem>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="60">1 minute</SelectItem>
                    <SelectItem value="300">5 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Show Grid Lines</h3>
              <p className="text-sm text-gray-500">
                Display grid lines on charts
              </p>
            </div>
            <Switch
              checked={settings.display.show_grid_lines}
              onCheckedChange={(checked) =>
                updateDisplaySetting("show_grid_lines", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Show Tooltips</h3>
              <p className="text-sm text-gray-500">Display tooltips on hover</p>
            </div>
            <Switch
              checked={settings.display.show_tooltips}
              onCheckedChange={(checked) =>
                updateDisplaySetting("show_tooltips", checked)
              }
            />
          </div>
        </CardContent>
      </Card>

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

      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={loadSettings}
          disabled={saving}
          className="bg-transparent border-[#4B5563] text-white hover:bg-[#374151] hover:text-white"
        >
          Reset
        </Button>
        <Button onClick={handleSave} disabled={saving || !settings}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Settings"
          )}
        </Button>
      </div>
    </div>
  );
}
