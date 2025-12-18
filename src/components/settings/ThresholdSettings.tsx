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
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getThresholdSettings,
  updateTemperatureThresholds,
  updateVibrationThresholds,
  addMachineThresholdOverride,
  deleteMachineThresholdOverride,
} from "@/api/settings/thresholds";
import { getMachines } from "@/lib/data/machines";
import type { ThresholdSettings } from "@/lib/types";
import type { Machine } from "@/lib/types";
import { Loader2, CheckCircle2, AlertCircle, Trash2, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

export default function ThresholdSettings() {
  const [settings, setSettings] = useState<ThresholdSettings | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | null>(
    null
  );
  const [error, setError] = useState<string>("");
  const [selectedMachine, setSelectedMachine] = useState<string>("");
  const [tempOverrideWarning, setTempOverrideWarning] = useState<string>("");
  const [tempOverrideCritical, setTempOverrideCritical] = useState<string>("");
  const { toast } = useToast();

  // Load settings and machines on mount
  useEffect(() => {
    loadSettings();
    loadMachines();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(""); // Clear any previous errors
      const loadedSettings = await getThresholdSettings();

      // The getThresholdSettings function always returns valid settings (with defaults if needed)
      // So we can safely use the loaded settings
      setSettings({
        temperature: {
          warning: loadedSettings.temperature?.warning,
          critical: loadedSettings.temperature?.critical,
        },
        vibration: {
          warning: loadedSettings.vibration?.warning,
          critical: loadedSettings.vibration?.critical,
          x_axis_warning: loadedSettings.vibration?.x_axis_warning,
          y_axis_warning: loadedSettings.vibration?.y_axis_warning,
          z_axis_warning: loadedSettings.vibration?.z_axis_warning,
        },
        machine_overrides: Array.isArray(loadedSettings.machine_overrides)
          ? loadedSettings.machine_overrides.filter(
              (override) => override != null
            )
          : [],
      });
    } catch {
      // Don't show error message or set error state
      // The getThresholdSettings function should have already handled the error and returned defaults
      // But if it somehow throws, use defaults here as well
      setSettings({
        temperature: {
          warning: 0,
          critical: 0,
        },
        vibration: {
          warning: 0,
          critical: 0,
          x_axis_warning: 0,
          y_axis_warning: 0,
          z_axis_warning: 0,
        },
        machine_overrides: [],
      });
      // Don't set error state - this is expected fallback behavior
    } finally {
      setLoading(false);
    }
  };

  const loadMachines = async () => {
    try {
      const machinesList = await getMachines();
      setMachines(machinesList);
    } catch (err) {
      console.error("Error loading machines:", err);
    }
  };

  const handleSaveTemperature = async () => {
    if (!settings) return;

    // Use safe defaults if temperature is not set
    const currentTemperature = settings.temperature || {
      warning: 0,
      critical: 0,
    };

    // Validate that critical threshold is greater than warning threshold
    const warning = currentTemperature.warning;
    const critical = currentTemperature.critical;

    if (critical <= warning) {
      setSaveStatus("error");
      setError("Critical threshold must be greater than warning threshold.");
      toast({
        title: "Validation Error",
        description:
          "Critical threshold must be greater than warning threshold.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      setSaveStatus(null);
      setError("");

      const updated = await updateTemperatureThresholds(currentTemperature);
      setSettings({
        ...settings,
        temperature: updated,
      });
      setSaveStatus("success");
      toast({
        title: "Settings Saved",
        description: "Temperature thresholds have been saved successfully.",
      });

      setTimeout(() => {
        setSaveStatus(null);
      }, 3000);
    } catch (err) {
      console.error("Error saving temperature thresholds:", err);
      setSaveStatus("error");

      // Check if error message contains validation error
      const errorMessage =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : err && typeof err === "object" && "message" in err
            ? (err as { message?: string }).message
            : undefined;
      const finalErrorMessage =
        errorMessage ||
        "Failed to save temperature thresholds. Please try again.";
      setError(finalErrorMessage);

      toast({
        title: "Save Failed",
        description: finalErrorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVibration = async () => {
    if (!settings) return;

    // Use safe defaults if vibration is not set
    const currentVibration = settings.vibration || {
      warning: 0,
      critical: 0,
      x_axis_warning: 0,
      y_axis_warning: 0,
      z_axis_warning: 0,
    };

    // Validate that critical threshold is greater than warning threshold
    if (currentVibration.critical <= currentVibration.warning) {
      setSaveStatus("error");
      setError("Critical threshold must be greater than warning threshold.");
      toast({
        title: "Validation Error",
        description:
          "Critical threshold must be greater than warning threshold.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      setSaveStatus(null);
      setError("");

      const updated = await updateVibrationThresholds(currentVibration);
      setSettings({
        ...settings,
        vibration: updated,
      });
      setSaveStatus("success");
      toast({
        title: "Settings Saved",
        description: "Vibration thresholds have been saved successfully.",
      });

      setTimeout(() => {
        setSaveStatus(null);
      }, 3000);
    } catch (err) {
      console.error("Error saving vibration thresholds:", err);
      setSaveStatus("error");

      // Check if error message contains validation error
      const errorMessage =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : err && typeof err === "object" && "message" in err
            ? (err as { message?: string }).message
            : undefined;
      const finalErrorMessage =
        errorMessage ||
        "Failed to save vibration thresholds. Please try again.";
      setError(finalErrorMessage);

      toast({
        title: "Save Failed",
        description: finalErrorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddMachineOverride = async () => {
    if (!settings || !selectedMachine) {
      toast({
        title: "Missing Information",
        description: "Please select a machine and enter threshold values.",
        variant: "destructive",
      });
      return;
    }

    const machine = machines.find(
      (m) => m.id === selectedMachine || m.name === selectedMachine
    );
    if (!machine) {
      toast({
        title: "Invalid Machine",
        description: "Selected machine not found.",
        variant: "destructive",
      });
      return;
    }

    const warning = parseFloat(tempOverrideWarning);
    const critical = parseFloat(tempOverrideCritical);

    if (isNaN(warning) || isNaN(critical)) {
      toast({
        title: "Invalid Values",
        description: "Please enter valid threshold values.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const newOverride = await addMachineThresholdOverride({
        machine_id: machine.id,
        machine_name: machine.name,
        machine_class: machine.type,
        temperature_warning: warning,
        temperature_critical: critical,
      });

      const currentSettings = settings || {
        temperature: {
          warning: 0,
          critical: 0,
        },
        vibration: {
          warning: 0,
          critical: 0,
          x_axis_warning: 0,
          y_axis_warning: 0,
          z_axis_warning: 0,
        },
        machine_overrides: [],
      };

      setSettings({
        ...currentSettings,
        machine_overrides: [
          ...(currentSettings.machine_overrides || []).filter((o) => o != null),
          newOverride,
        ],
      });

      // Reset form
      setSelectedMachine("");
      setTempOverrideWarning("");
      setTempOverrideCritical("");

      toast({
        title: "Override Added",
        description: `Threshold override for ${machine.name} has been added.`,
      });
    } catch (err) {
      console.error("Error adding machine override:", err);
      toast({
        title: "Add Failed",
        description: "Failed to add machine override. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMachineOverride = async (overrideId: string) => {
    if (!overrideId) return;

    const currentSettings = settings || {
      temperature: {
        warning: 0,
        critical: 0,
      },
      vibration: {
        warning: 0,
        critical: 0,
        x_axis_warning: 0,
        y_axis_warning: 0,
        z_axis_warning: 0,
      },
      machine_overrides: [],
    };

    try {
      setSaving(true);
      await deleteMachineThresholdOverride(overrideId);
      setSettings({
        ...currentSettings,
        machine_overrides: (currentSettings.machine_overrides || [])
          .filter((o) => o != null && o.id !== overrideId)
          .filter((o) => o != null), // Double filter to ensure no null values
      });
      toast({
        title: "Override Deleted",
        description: "Machine threshold override has been deleted.",
      });
    } catch (err) {
      console.error("Error deleting machine override:", err);
      toast({
        title: "Delete Failed",
        description: "Failed to delete machine override. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateTemperatureSetting = (
    key: "warning" | "critical",
    value: number
  ) => {
    // Always ensure settings exist
    const currentSettings = settings || {
      temperature: {
        warning: 0,
        critical: 0,
      },
      vibration: {
        warning: 0,
        critical: 0,
        x_axis_warning: 0,
        y_axis_warning: 0,
        z_axis_warning: 0,
      },
      machine_overrides: [],
    };

    // Update the setting without auto-adjusting the other value
    const currentTemperature = currentSettings.temperature || {
      warning: 0,
      critical: 0,
    };

    setSettings({
      ...currentSettings,
      temperature: {
        ...currentTemperature,
        [key]: value,
      },
    });

    // Clear error when user adjusts values
    if (saveStatus === "error") {
      setSaveStatus(null);
      setError("");
    }
  };

  const updateVibrationSetting = (
    key:
      | "warning"
      | "critical"
      | "x_axis_warning"
      | "y_axis_warning"
      | "z_axis_warning",
    value: number
  ) => {
    // Always ensure settings exist
    const currentSettings = settings || {
      temperature: {
        warning: 0,
        critical: 0,
      },
      vibration: {
        warning: 0,
        critical: 0,
        x_axis_warning: 0,
        y_axis_warning: 0,
        z_axis_warning: 0,
      },
      machine_overrides: [],
    };

    // Update the setting without auto-adjusting the other value
    const currentVibration = currentSettings.vibration || {
      warning: 0,
      critical: 0,
      x_axis_warning: 0,
      y_axis_warning: 0,
      z_axis_warning: 0,
    };

    setSettings({
      ...currentSettings,
      vibration: {
        ...currentVibration,
        [key]: value,
      },
    });

    // Clear error when user adjusts values
    if (saveStatus === "error") {
      setSaveStatus(null);
      setError("");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Use default settings if not loaded yet
  const displaySettings: ThresholdSettings = settings || {
    temperature: {
      warning: 0,
      critical: 0,
    },
    vibration: {
      warning: 0,
      critical: 0,
      x_axis_warning: 0,
      y_axis_warning: 0,
      z_axis_warning: 0,
    },
    machine_overrides: [],
  };

  // Ensure temperature and vibration exist with defaults
  const safeTemperature = displaySettings.temperature || {
    warning: 0,
    critical: 0,
  };
  const safeVibration = displaySettings.vibration || {
    warning: 0,
    critical: 0,
    x_axis_warning: 0,
    y_axis_warning: 0,
    z_axis_warning: 0,
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

      <Tabs defaultValue="temperature" className="w-full">
        <TabsList className="grid w-full md:w-auto grid-cols-2 bg-[#1F2937] border border-[#374151] text-white">
          <TabsTrigger value="temperature">Temperature</TabsTrigger>
          <TabsTrigger value="vibration">Vibration</TabsTrigger>
        </TabsList>

        <TabsContent value="temperature">
          <Card className="bg-[#1F2937] border-[#374151] text-white">
            <CardHeader>
              <CardTitle>Temperature Thresholds</CardTitle>
              <CardDescription>
                Configure temperature alert thresholds for all sensors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Warning Threshold</h3>
                  <p className="text-sm text-gray-500">
                    Alerts will be triggered when temperature exceeds this value
                  </p>
                </div>

                <div className="space-y-6 pt-2">
                  <div>
                    <div className="flex justify-between mb-2 text-sm">
                      <span>Current value: {safeTemperature.warning}°C</span>
                    </div>
                    <Slider
                      value={[safeTemperature.warning]}
                      min={0}
                      max={50}
                      step={0.5}
                      onValueChange={(value) =>
                        updateTemperatureSetting("warning", value[0])
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Critical Threshold</h3>
                  <p className="text-sm text-gray-500">
                    Critical alerts will be triggered when temperature exceeds
                    this value
                  </p>
                </div>

                <div className="space-y-6 pt-2">
                  <div>
                    <div className="flex justify-between mb-2 text-sm">
                      <span>Current value: {safeTemperature.critical}°C</span>
                    </div>
                    <Slider
                      value={[safeTemperature.critical]}
                      min={0}
                      max={50}
                      step={0.5}
                      onValueChange={(value) =>
                        updateTemperatureSetting("critical", value[0])
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={loadSettings}
                  disabled={saving}
                  className="bg-transparent border-[#4B5563] text-white hover:bg-[#374151] hover:text-white"
                >
                  Reset
                </Button>
                <Button onClick={handleSaveTemperature} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Temperature Thresholds"
                  )}
                </Button>
              </div>

              <div className="space-y-4 pt-6 border-t">
                <div>
                  <h3 className="text-lg font-medium">
                    Machine-Specific Overrides
                  </h3>
                  <p className="text-sm text-gray-500">
                    Set different thresholds for specific machines or sensor
                    groups
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Machine</Label>
                      <Select
                        value={selectedMachine}
                        onValueChange={setSelectedMachine}
                      >
                        <SelectTrigger className="bg-[#11171F] border-[#4B5563] text-white">
                          <SelectValue placeholder="Select machine" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#11171F] border-[#4B5563] text-white">
                          {machines.map((machine) => (
                            <SelectItem key={machine.id} value={machine.id}>
                              {machine.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="warning-override">Warning (°C)</Label>
                      <Input
                        id="warning-override"
                        type="number"
                        value={tempOverrideWarning}
                        onChange={(e) => setTempOverrideWarning(e.target.value)}
                        placeholder="28"
                        step="0.5"
                        className="bg-[#11171F] border-[#4B5563] text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="critical-override">Critical (°C)</Label>
                      <Input
                        id="critical-override"
                        type="number"
                        value={tempOverrideCritical}
                        onChange={(e) =>
                          setTempOverrideCritical(e.target.value)
                        }
                        placeholder="33"
                        step="0.5"
                        className="bg-[#11171F] border-[#4B5563] text-white"
                      />
                    </div>

                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        onClick={handleAddMachineOverride}
                        disabled={saving || !selectedMachine}
                        className="w-full bg-[#11171F] border-[#4B5563] text-white hover:bg-[#1F2937] hover:text-white"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Override
                      </Button>
                    </div>
                  </div>

                  {displaySettings.machine_overrides &&
                    displaySettings.machine_overrides.length > 0 && (
                      <div className="space-y-2">
                        <Label>Existing Overrides</Label>
                        <div className="space-y-2">
                          {displaySettings.machine_overrides
                            .filter((override) => override != null)
                            .map((override) => (
                              <div
                                key={
                                  override?.id || `override-${Math.random()}`
                                }
                                className="flex items-center justify-between p-3 border rounded-lg"
                              >
                                <div className="flex-1">
                                  <p className="font-medium">
                                    {override?.machine_name ||
                                      override?.machine_id ||
                                      "Unknown Machine"}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    Warning:{" "}
                                    {override?.temperature_warning ?? "N/A"}°C |
                                    Critical:{" "}
                                    {override?.temperature_critical ?? "N/A"}°C
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    override?.id &&
                                    handleDeleteMachineOverride(override.id)
                                  }
                                  disabled={saving || !override?.id}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vibration">
          <Card className="bg-[#1F2937] border-[#374151] text-white">
            <CardHeader>
              <CardTitle>Vibration Thresholds</CardTitle>
              <CardDescription>
                Configure vibration alert thresholds for all sensors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Warning Threshold</h3>
                  <p className="text-sm text-gray-500">
                    Alerts will be triggered when vibration exceeds this value
                  </p>
                </div>

                <div className="space-y-6 pt-2">
                  <div>
                    <div className="flex justify-between mb-2 text-sm">
                      <span>Current value: {safeVibration.warning}</span>
                    </div>
                    <Slider
                      value={[safeVibration.warning]}
                      min={0}
                      max={2}
                      step={0.1}
                      onValueChange={(value) =>
                        updateVibrationSetting("warning", value[0])
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Critical Threshold</h3>
                  <p className="text-sm text-gray-500">
                    Critical alerts will be triggered when vibration exceeds
                    this value
                  </p>
                </div>

                <div className="space-y-6 pt-2">
                  <div>
                    <div className="flex justify-between mb-2 text-sm">
                      <span>Current value: {safeVibration.critical}</span>
                    </div>
                    <Slider
                      value={[safeVibration.critical]}
                      min={0}
                      max={2}
                      step={0.1}
                      onValueChange={(value) =>
                        updateVibrationSetting("critical", value[0])
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Axis Configuration</h3>
                  <p className="text-sm text-gray-500">
                    Configure thresholds for individual vibration axes
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="x-axis">X-Axis Warning</Label>
                    <Input
                      id="x-axis"
                      type="number"
                      step="0.1"
                      value={safeVibration.x_axis_warning ?? 0}
                      onChange={(e) =>
                        updateVibrationSetting(
                          "x_axis_warning",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="bg-[#11171F] border-[#4B5563] text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="y-axis">Y-Axis Warning</Label>
                    <Input
                      id="y-axis"
                      type="number"
                      step="0.1"
                      value={safeVibration.y_axis_warning ?? 0}
                      onChange={(e) =>
                        updateVibrationSetting(
                          "y_axis_warning",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="bg-[#11171F] border-[#4B5563] text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="z-axis">Z-Axis Warning</Label>
                    <Input
                      id="z-axis"
                      type="number"
                      step="0.1"
                      value={safeVibration.z_axis_warning ?? 0}
                      onChange={(e) =>
                        updateVibrationSetting(
                          "z_axis_warning",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="bg-[#11171F] border-[#4B5563] text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={loadSettings}
                  disabled={saving}
                  className="bg-transparent border-[#4B5563] text-white hover:bg-[#374151] hover:text-white"
                >
                  Reset
                </Button>
                <Button onClick={handleSaveVibration} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Vibration Thresholds"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
