import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, Plus } from "lucide-react";
import { MUIDateTimePicker } from "@/components/ui/mui-date-time-picker";
import { AutocompleteInput } from "./AutocompleteInput";
import { getAllMachineClasses } from "@/lib/iso10816-3";
import Image from "next/image";

interface SensorFormFieldsProps {
  areaSuggestions: string[];
  machineNameSuggestions: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sensorData: any;
  onFieldChange: (
    field: string,
    value: string | boolean | Date | null | undefined
  ) => void;
  imagePreview?: string | null;
  onImageChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function SensorFormFields({
  areaSuggestions,
  machineNameSuggestions,
  sensorData,
  onFieldChange,
  imagePreview,
  onImageChange,
}: SensorFormFieldsProps) {
  const machineClassOptions = getAllMachineClasses();

  // Options
  const sensorTypes = ["Master", "Satellite"];
  const frequencyMaxOptions = ["1000", "2500", "5000", "10000"];
  const lorOptions = ["200", "400", "800", "1600", "3200", "6400"];
  const gScaleOptions = ["2", "4", "8", "16"];
  const motorTypeOptions = [
    "Motor Ligid Installed",
    "Motor Flexible Installed",
    "External driver Motor pump Ligid Installed",
    "External driver Motor pump Flexible Installed",
    "Integrated driver Motor pump Ligid Installed",
    "Integrated driver Motor pump Flexible Installed",
  ];

  return (
    <div className="space-y-6">
      {/* Sensor Information - Two Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Serial Number
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Enter the serial number of the sensor</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              placeholder="Enter serial number"
              value={sensorData.serialNumber || ""}
              onChange={(e) => onFieldChange("serialNumber", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Area
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Enter the area where the sensor is installed</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <AutocompleteInput
              value={sensorData.area || ""}
              onChange={(value) => onFieldChange("area", value)}
              suggestions={areaSuggestions}
              placeholder="Enter area"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Motor Start Time
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Select the motor start date and time</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <MUIDateTimePicker
              value={sensorData.motorStartTime}
              onChange={(value) => onFieldChange("motorStartTime", value)}
              label=""
            />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Sensor Type
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Select the type of sensor</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Select
              onValueChange={(value) => onFieldChange("sensorType", value)}
              value={sensorData.sensorType || ""}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select sensor type" />
              </SelectTrigger>
              <SelectContent>
                {sensorTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Machine
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Enter the machine name</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <AutocompleteInput
              value={sensorData.machine || ""}
              onChange={(value) => onFieldChange("machine", value)}
              suggestions={machineNameSuggestions}
              placeholder="Enter machine name"
            />
          </div>
        </div>
      </div>

      {/* Options - Machine Class and Name Place */}
      <div className="flex items-center gap-6">
        <div className="flex flex-row items-start space-x-3 space-y-0">
          <Checkbox
            id="machineClassEnabled"
            checked={sensorData.machineClassEnabled}
            onCheckedChange={(checked) =>
              onFieldChange("machineClassEnabled", checked)
            }
          />
          <div className="space-y-1 leading-none">
            <Label htmlFor="machineClassEnabled">Machine Class</Label>
          </div>
        </div>

        <div className="flex flex-row items-start space-x-3 space-y-0">
          <Checkbox
            id="namePlaceEnabled"
            checked={sensorData.namePlaceEnabled}
            onCheckedChange={(checked) =>
              onFieldChange("namePlaceEnabled", checked)
            }
          />
          <div className="space-y-1 leading-none">
            <Label htmlFor="namePlaceEnabled">Name Place</Label>
          </div>
        </div>
      </div>

      {/* Machine Class Section */}
      {sensorData.machineClassEnabled && (
        <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Machine Class
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Select machine class to auto-fill thresholds</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Select
              onValueChange={(value) => onFieldChange("machineClass", value)}
              value={sensorData.machineClass || ""}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select machine class" />
              </SelectTrigger>
              <SelectContent>
                {machineClassOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Thresholds - Three Boxes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 border rounded-lg bg-white">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Warning Threshold</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={sensorData.warningThreshold || ""}
                  onChange={(e) =>
                    onFieldChange("warningThreshold", e.target.value)
                  }
                />
                <p className="text-xs text-muted-foreground">mm/s</p>
              </div>
            </div>

            <div className="p-3 border rounded-lg bg-white">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Concern Threshold</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={sensorData.concernThreshold || ""}
                  onChange={(e) =>
                    onFieldChange("concernThreshold", e.target.value)
                  }
                />
                <p className="text-xs text-muted-foreground">mm/s</p>
              </div>
            </div>

            <div className="p-3 border rounded-lg bg-white">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Damage Threshold</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={sensorData.damageThreshold || ""}
                  onChange={(e) =>
                    onFieldChange("damageThreshold", e.target.value)
                  }
                />
                <p className="text-xs text-muted-foreground">mm/s</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Name Place Section */}
      {sensorData.namePlaceEnabled && (
        <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Motor Power
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Specify the motor power for this sensor</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                placeholder="Enter motor power"
                value={sensorData.namePlace || ""}
                onChange={(e) => onFieldChange("namePlace", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Motor Type
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Select the motor type</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Select
                onValueChange={(value) => onFieldChange("motorType", value)}
                value={sensorData.motorType || ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select motor type" />
                </SelectTrigger>
                <SelectContent>
                  {motorTypeOptions.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Thresholds - Three Boxes (UI only) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 border rounded-lg bg-white">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Warning Threshold</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={sensorData.namePlaceWarningThreshold || ""}
                  onChange={(e) =>
                    onFieldChange("namePlaceWarningThreshold", e.target.value)
                  }
                />
                <p className="text-xs text-muted-foreground">mm/s</p>
              </div>
            </div>

            <div className="p-3 border rounded-lg bg-white">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Concern Threshold</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={sensorData.namePlaceConcernThreshold || ""}
                  onChange={(e) =>
                    onFieldChange("namePlaceConcernThreshold", e.target.value)
                  }
                />
                <p className="text-xs text-muted-foreground">mm/s</p>
              </div>
            </div>

            <div className="p-3 border rounded-lg bg-white">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Damage Threshold</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={sensorData.namePlaceDamageThreshold || ""}
                  onChange={(e) =>
                    onFieldChange("namePlaceDamageThreshold", e.target.value)
                  }
                />
                <p className="text-xs text-muted-foreground">mm/s</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Additional Settings */}
      {/* Row 1: Two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            High Pass Filter (Hz)
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>High pass filter value in Hz</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Input
            type="number"
            step="0.1"
            placeholder="10"
            value={sensorData.highPass || ""}
            onChange={(e) => onFieldChange("highPass", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            Time Interval (min.)
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Time interval between readings in minutes</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Input
            type="number"
            placeholder="60"
            min="1"
            value={sensorData.timeInterval || ""}
            onChange={(e) => onFieldChange("timeInterval", e.target.value)}
          />
        </div>
      </div>

      {/* Row 2: Three columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            G-Scale
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    Acceleration range in G units. Determines the maximum
                    measurable acceleration.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Select
            onValueChange={(value) => onFieldChange("gScale", value)}
            value={sensorData.gScale || ""}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select G-scale" />
            </SelectTrigger>
            <SelectContent>
              {gScaleOptions.map((scale) => (
                <SelectItem key={scale} value={scale}>
                  {scale} G
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            LOR
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    Lines of Resolution - Determines frequency resolution in FFT
                    analysis
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Select
            onValueChange={(value) => onFieldChange("lor", value)}
            value={sensorData.lor || ""}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select LOR" />
            </SelectTrigger>
            <SelectContent>
              {lorOptions.map((lor) => (
                <SelectItem key={lor} value={lor}>
                  {lor}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            Frequency Max (Hz)
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Maximum frequency in Hz</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Select
            onValueChange={(value) => onFieldChange("frequencyMax", value)}
            value={sensorData.frequencyMax || ""}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              {frequencyMaxOptions.map((freq) => (
                <SelectItem key={freq} value={freq}>
                  {freq} Hz
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 3: Two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            Temperature Threshold (min)
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Minimum temperature threshold</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Input
            type="number"
            step="0.1"
            placeholder="0.0"
            value={sensorData.temperatureThresholdMin || ""}
            onChange={(e) =>
              onFieldChange("temperatureThresholdMin", e.target.value)
            }
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            Temperature Threshold (max)
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Maximum temperature threshold</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Input
            type="number"
            step="0.1"
            placeholder="0.0"
            value={sensorData.temperatureThresholdMax || ""}
            onChange={(e) =>
              onFieldChange("temperatureThresholdMax", e.target.value)
            }
          />
        </div>
      </div>

      {/* Note Section */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          Note
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Add any additional notes or comments</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <Textarea
          placeholder="Enter any additional notes..."
          value={sensorData.notes || ""}
          onChange={(e) => onFieldChange("notes", e.target.value)}
          rows={4}
        />
      </div>

      {/* Image Upload */}
      <div className="space-y-2">
        <Label>Sensor Image (Optional)</Label>
        <div className="flex items-center gap-4">
          <label
            htmlFor="sensor-image"
            className="flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-gray-50"
          >
            <Plus className="h-4 w-4" />
            <span>Image</span>
          </label>
          <input
            id="sensor-image"
            type="file"
            accept="image/*"
            onChange={onImageChange}
            className="hidden"
          />
          {imagePreview && (
            <div className="relative w-20 h-20 border rounded-md overflow-hidden">
              <Image
                src={imagePreview}
                alt="Sensor preview"
                fill
                className="object-cover"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
