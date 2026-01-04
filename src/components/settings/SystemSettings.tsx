"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  getSystemInfo,
  getSystemResources,
  getDataManagementSettings,
  updateDataManagementSettings,
  runBackupNow,
} from "@/api/system/system";
import type { SystemInfo, SystemResources } from "@/lib/types";

export default function SystemSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | null>(
    null
  );
  const [error, setError] = useState<string>("");

  // System info state
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [systemResources, setSystemResources] =
    useState<SystemResources | null>(null);

  // Data management settings state
  const [sensorDataRetention, setSensorDataRetention] = useState<string>("90");
  const [alertHistoryRetention, setAlertHistoryRetention] =
    useState<string>("180");
  const [automatedBackupsEnabled, setAutomatedBackupsEnabled] = useState(true);
  const [backupFrequency, setBackupFrequency] = useState<
    "hourly" | "daily" | "weekly" | "monthly"
  >("daily");
  const [backupRetention, setBackupRetention] = useState<string>("7");

  // Confirmation dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    title: "",
    description: "",
    onConfirm: () => {},
  });

  const triggerConfirm = (
    title: string,
    description: string,
    onConfirm: () => void
  ) => {
    setConfirmConfig({ title, description, onConfirm });
    setConfirmOpen(true);
  };

  // Load data on mount
  useEffect(() => {
    loadSystemData();
    // Refresh system resources every 30 seconds
    const interval = setInterval(() => {
      loadSystemResources();
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSystemData = async () => {
    try {
      setLoading(true);
      setError("");
      await Promise.all([
        loadSystemInfo(),
        loadSystemResources(),
        loadDataManagementSettings(),
      ]);
    } catch {
      setError("Failed to load system data. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  const loadSystemInfo = async () => {
    try {
      const info = await getSystemInfo();
      setSystemInfo(info);
    } catch (err) {
      console.error("Error loading system info:", err);
    }
  };

  const loadSystemResources = async () => {
    try {
      const resources = await getSystemResources();
      setSystemResources(resources);
    } catch (err) {
      console.error("Error loading system resources:", err);
    }
  };

  const loadDataManagementSettings = async () => {
    try {
      const settings = await getDataManagementSettings();
      setSensorDataRetention(
        settings.sensor_data_retention_days === null
          ? "forever"
          : settings.sensor_data_retention_days.toString()
      );
      setAlertHistoryRetention(
        settings.alert_history_retention_days === null
          ? "forever"
          : settings.alert_history_retention_days.toString()
      );
      setAutomatedBackupsEnabled(settings.automated_backups_enabled);
      setBackupFrequency(settings.backup_frequency);
      setBackupRetention(settings.backup_retention_count.toString());
    } catch (err) {
      console.error("Error loading data management settings:", err);
    }
  };

  const handleSaveSettings = async () => {
    triggerConfirm(
      "Save Data Management Settings",
      "Are you sure you want to save these data retention and backup settings? This will update the system's management policies.",
      async () => {
        try {
          setSaving(true);
          setSaveStatus(null);
          setError("");

          await updateDataManagementSettings({
            sensor_data_retention_days:
              sensorDataRetention === "forever"
                ? null
                : parseInt(sensorDataRetention),
            alert_history_retention_days:
              alertHistoryRetention === "forever"
                ? null
                : parseInt(alertHistoryRetention),
            automated_backups_enabled: automatedBackupsEnabled,
            backup_frequency: backupFrequency,
            backup_retention_count: parseInt(backupRetention),
          });

          setSaveStatus("success");
          toast({
            title: "Settings Saved",
            description: "System settings have been saved successfully.",
          });

          setTimeout(() => {
            setSaveStatus(null);
          }, 3000);
        } catch (err) {
          console.error("Error saving settings:", err);
          setSaveStatus("error");
          const errorMessage =
            err && typeof err === "object" && "response" in err
              ? (err as { response?: { data?: { message?: string } } }).response
                  ?.data?.message
              : err && typeof err === "object" && "message" in err
                ? (err as { message?: string }).message
                : undefined;
          const finalErrorMessage =
            errorMessage || "Failed to save settings. Please try again.";
          setError(finalErrorMessage);
          toast({
            title: "Save Failed",
            description: finalErrorMessage,
            variant: "destructive",
          });
        } finally {
          setSaving(false);
        }
      }
    );
  };

  const handleRunBackup = async () => {
    triggerConfirm(
      "Run Backup Now",
      "Are you sure you want to start a full system backup now? This may take several minutes depending on your data size.",
      async () => {
        try {
          setSaving(true);
          setError("");

          await runBackupNow({ backup_type: "full" });

          toast({
            title: "Backup Started",
            description: "Backup has been started successfully.",
          });

          // Reload settings to get updated backup status
          await loadDataManagementSettings();
        } catch (err) {
          console.error("Error running backup:", err);
          const errorMessage =
            err && typeof err === "object" && "response" in err
              ? (err as { response?: { data?: { message?: string } } }).response
                  ?.data?.message
              : err && typeof err === "object" && "message" in err
                ? (err as { message?: string }).message
                : undefined;
          const finalErrorMessage =
            errorMessage || "Failed to start backup. Please try again.";
          setError(finalErrorMessage);
          toast({
            title: "Backup Failed",
            description: finalErrorMessage,
            variant: "destructive",
          });
        } finally {
          setSaving(false);
        }
      }
    );
  };

  const handleToggleAutomatedBackups = async (enabled: boolean) => {
    const actionLabel = enabled ? "Enable" : "Disable";
    triggerConfirm(
      `${actionLabel} Automated Backups`,
      `Are you sure you want to ${actionLabel.toLowerCase()} automated system backups?`,
      async () => {
        setAutomatedBackupsEnabled(enabled);
        try {
          await updateDataManagementSettings({
            automated_backups_enabled: enabled,
          });
          toast({
            title: "Settings Updated",
            description: `Automated backups have been ${enabled ? "enabled" : "disabled"}.`,
          });
        } catch (err) {
          console.error("Error updating automated backups:", err);
          setAutomatedBackupsEnabled(!enabled); // Revert on error
          toast({
            title: "Update Failed",
            description:
              "Failed to update automated backups setting. Please try again.",
            variant: "destructive",
          });
        }
      }
    );
  };

  const handleBackupFrequencyChange = async (value: string) => {
    triggerConfirm(
      "Change Backup Frequency",
      `Are you sure you want to change the backup frequency to ${value}?`,
      async () => {
        setBackupFrequency(value as "hourly" | "daily" | "weekly" | "monthly");
        try {
          await updateDataManagementSettings({
            backup_frequency: value as
              | "hourly"
              | "daily"
              | "weekly"
              | "monthly",
          });
          toast({
            title: "Settings Updated",
            description: `Backup frequency has been updated to ${value}.`,
          });
        } catch (err) {
          console.error("Error updating backup frequency:", err);
          toast({
            title: "Update Failed",
            description: "Failed to update backup frequency. Please try again.",
            variant: "destructive",
          });
        }
      }
    );
  };

  const handleBackupRetentionChange = async (value: string) => {
    triggerConfirm(
      "Change Backup Retention",
      `Are you sure you want to change the backup retention to ${value} backups?`,
      async () => {
        setBackupRetention(value);
        try {
          await updateDataManagementSettings({
            backup_retention_count: parseInt(value),
          });
          toast({
            title: "Settings Updated",
            description: `Backup retention has been updated to ${value} backups.`,
          });
        } catch (err) {
          console.error("Error updating backup retention:", err);
          toast({
            title: "Update Failed",
            description: "Failed to update backup retention. Please try again.",
            variant: "destructive",
          });
        }
      }
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  // Get status color
  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "connected":
      case "operational":
        return "bg-green-500";
      case "disconnected":
      case "down":
        return "bg-red-500";
      case "degraded":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

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

      <Card className="bg-[#030616] border-[1.35px] border-[#374151] text-white">
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>View and manage system information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-2">System Name</h3>
              <p className="text-sm">
                {systemInfo?.system_name || "TBKK-Surazense"}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">System Version</h3>
              <p className="text-sm">
                {systemInfo?.system_version || "v1.0.0"}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Last Updated</h3>
              <p className="text-sm">
                {formatDate(systemInfo?.last_updated || systemInfo?.updated_at)}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Organization</h3>
              <p className="text-sm">
                {systemInfo?.organization_name || "TBKK"}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Database Status</h3>
              <div className="flex items-center">
                <div
                  className={`h-2 w-2 rounded-full mr-2 ${getStatusColor(systemInfo?.database_status)}`}
                ></div>
                <p className="text-sm capitalize">
                  {systemInfo?.database_status || "Unknown"}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">API Status</h3>
              <div className="flex items-center">
                <div
                  className={`h-2 w-2 rounded-full mr-2 ${getStatusColor(systemInfo?.api_status)}`}
                ></div>
                <p className="text-sm capitalize">
                  {systemInfo?.api_status || "Unknown"}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">System Resources</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>CPU Usage</span>
                  <span>{systemResources?.cpu_usage?.toFixed(1) || 0}%</span>
                </div>
                <Progress value={systemResources?.cpu_usage || 0} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Memory Usage</span>
                  <span>{systemResources?.memory_usage?.toFixed(1) || 0}%</span>
                </div>
                <Progress value={systemResources?.memory_usage || 0} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Disk Usage</span>
                  <span>{systemResources?.disk_usage?.toFixed(1) || 0}%</span>
                </div>
                <Progress value={systemResources?.disk_usage || 0} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#030616] border-[1.35px] border-[#374151] text-white">
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>
            Configure data retention and backup settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Data Retention</h3>
              <p className="text-sm text-gray-500">
                Configure how long to keep historical data
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="sensor-data">Sensor Data Retention</Label>
                <Select
                  value={sensorDataRetention}
                  onValueChange={setSensorDataRetention}
                  disabled={saving}
                >
                  <SelectTrigger
                    id="sensor-data"
                    className="bg-[#030616] border-[1.35px] border-[#374151] text-white"
                  >
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#11171F] border-[#4B5563] text-white">
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">180 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                    <SelectItem value="forever">Forever</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="alert-data">Alert History Retention</Label>
                <Select
                  value={alertHistoryRetention}
                  onValueChange={setAlertHistoryRetention}
                  disabled={saving}
                >
                  <SelectTrigger
                    id="alert-data"
                    className="bg-[#030616] border-[1.35px] border-[#374151] text-white"
                  >
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#11171F] border-[#4B5563] text-white">
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">180 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                    <SelectItem value="forever">Forever</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Automated Backups</h3>
              <p className="text-sm text-gray-500">
                Configure system backup schedule
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-medium">
                  Enable Automated Backups
                </h4>
                <p className="text-sm text-gray-500">
                  Regularly backup system data
                </p>
              </div>
              <Switch
                checked={automatedBackupsEnabled}
                onCheckedChange={handleToggleAutomatedBackups}
                disabled={saving}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="backup-frequency">Backup Frequency</Label>
                <Select
                  value={backupFrequency}
                  onValueChange={handleBackupFrequencyChange}
                  disabled={saving || !automatedBackupsEnabled}
                >
                  <SelectTrigger
                    id="backup-frequency"
                    className="bg-[#030616] border-[1.35px] border-[#374151] text-white"
                  >
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#11171F] border-[#4B5563] text-white">
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="backup-retention">Backup Retention</Label>
                <Select
                  value={backupRetention}
                  onValueChange={handleBackupRetentionChange}
                  disabled={saving || !automatedBackupsEnabled}
                >
                  <SelectTrigger
                    id="backup-retention"
                    className="bg-[#030616] border-[1.35px] border-[#374151] text-white"
                  >
                    <SelectValue placeholder="Select retention" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#11171F] border-[#4B5563] text-white">
                    <SelectItem value="3">3 backups</SelectItem>
                    <SelectItem value="7">7 backups</SelectItem>
                    <SelectItem value="14">14 backups</SelectItem>
                    <SelectItem value="30">30 backups</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={handleRunBackup} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running...
            </>
          ) : (
            "Run Backup Now"
          )}
        </Button>
        <Button onClick={handleSaveSettings} disabled={saving}>
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
