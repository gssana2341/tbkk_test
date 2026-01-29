"use client";

import { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import {
  getAllMachineClasses,
  getThresholdsForMachineClass,
} from "@/lib/iso10816-3";
import Image from "next/image";
import { useEffect } from "react";
import {
  storeArea,
  storeInstallationPoint,
  storeMachineName,
  storeMachineNo,
  storeSensorName,
} from "@/lib/registerStorage";

interface SensorFormContentProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  index: number;
  areaSuggestions: string[];
  machineNameSuggestions: string[];
  machineNoSuggestions: string[];
  installationPointSuggestions: string[];
  sensorNameSuggestions: string[];
  imagePreview: string | null;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function SensorFormContent({
  form,
  index,
  areaSuggestions,
  machineNameSuggestions,
  machineNoSuggestions,
  installationPointSuggestions,
  sensorNameSuggestions,
  imagePreview,
  onImageChange,
}: SensorFormContentProps) {
  const machineClassOptions = getAllMachineClasses();

  // Sensor type options
  const sensorTypes = ["Master", "Satellite"];

  // Frequency Max options
  const frequencyMaxOptions = ["1000", "2500", "5000", "10000"];

  // LOR options
  const lorOptions = ["200", "400", "800", "1600", "3200", "6400"];

  // G-Scale options
  const gScaleOptions = ["2", "4", "8", "16"];

  // Motor Type options
  const motorTypeOptions = [
    "Motor Ligid Installed",
    "Motor Flexible Installed",
    "External driver Motor pump Ligid Installed",
    "External driver Motor pump Flexible Installed",
    "Integrated driver Motor pump Ligid Installed",
    "Integrated driver Motor pump Flexible Installed",
  ];

  // Time Interval options (5 to 60, step 5)
  const timeIntervalOptions = Array.from({ length: 12 }, (_, i) =>
    ((i + 1) * 5).toString()
  );

  // Watch machine class to auto-update thresholds
  const watchedMachineClass = form.watch(`sensors.${index}.machineClass`);
  const watchedMachineClassEnabled = form.watch(
    `sensors.${index}.machineClassEnabled`
  );
  const watchedNamePlaceEnabled = form.watch(
    `sensors.${index}.namePlaceEnabled`
  );

  // Auto-update thresholds when machine class changes
  useEffect(() => {
    if (watchedMachineClass && watchedMachineClassEnabled) {
      const thresholds = getThresholdsForMachineClass(watchedMachineClass);

      if (thresholds) {
        form.setValue(
          `sensors.${index}.warningThreshold`,
          thresholds.warning.toString()
        );
        form.setValue(
          `sensors.${index}.concernThreshold`,
          thresholds.concern.toString()
        );
        form.setValue(
          `sensors.${index}.damageThreshold`,
          thresholds.critical.toString()
        );
      }
    }
  }, [watchedMachineClass, watchedMachineClassEnabled, form, index]);

  // Watch temperature threshold max to update min
  const watchedTempMax = form.watch(`sensors.${index}.temperatureThresholdMax`);

  useEffect(() => {
    if (watchedTempMax) {
      const maxVal = parseFloat(watchedTempMax);
      if (!isNaN(maxVal)) {
        form.setValue(
          `sensors.${index}.temperatureThresholdMin`,
          (maxVal - 2).toString()
        );
      }
    } else {
      form.setValue(`sensors.${index}.temperatureThresholdMin`, "");
    }
  }, [watchedTempMax, form, index]);

  return (
    <div className="space-y-6 py-4">
      {/* Sensor Information - Two Columns */}
      {/* Row 1: Area, Serial Number, Sensor Name - Always 3 columns */}
      <div className="grid grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name={`sensors.${index}.area`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 text-lg 2xl:text-xl font-bold">
                Area
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#3B82F6] text-white border-none">
                      <p>Enter the area where the sensor is installed</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </FormLabel>
              <FormControl>
                <AutocompleteInput
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                    if (value) {
                      storeArea(value);
                    }
                  }}
                  suggestions={areaSuggestions}
                  placeholder="Enter area"
                  onStoreValue={storeArea}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`sensors.${index}.name`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 text-lg 2xl:text-xl font-bold">
                Sensor Name
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#3B82F6] text-white border-none">
                      <p>Enter the sensor name</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </FormLabel>
              <FormControl>
                <AutocompleteInput
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                    if (value) {
                      storeSensorName(value);
                    }
                  }}
                  suggestions={sensorNameSuggestions}
                  placeholder="Enter sensor name"
                  onStoreValue={storeSensorName}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`sensors.${index}.serialNumber`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 text-lg 2xl:text-xl font-bold">
                Serial Number
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#3B82F6] text-white border-none">
                      <p>Enter the serial number of the sensor</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter serial number"
                  className="bg-[#080808] border-[1px] border-[#4B5563] text-white"
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    if (
                      form.getFieldState(`sensors.${index}.serialNumber`)
                        .invalid
                    ) {
                      form.clearErrors(`sensors.${index}.serialNumber`);
                    }
                  }}
                  onBlur={async (e) => {
                    field.onBlur();
                    const value = e.target.value;
                    if (!value) return;

                    try {
                      const { getSensors } = await import("@/lib/data/sensors");
                      const { sensors } = await getSensors({ search: value });
                      const exists = sensors.some(
                        (s) =>
                          s.serialNumber.toLowerCase() === value.toLowerCase()
                      );
                      if (exists) {
                        form.setError(`sensors.${index}.serialNumber`, {
                          type: "manual",
                          message: "Serial Number นี้มีอยู่ในฐานข้อมูลอยู่แล้ว",
                        });
                      }
                    } catch (err) {
                      console.error("Error validating serial number:", err);
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Remaining Information - Responsive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name={`sensors.${index}.machine`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 text-lg 2xl:text-xl font-bold">
                Machine
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#3B82F6] text-white border-none">
                      <p>Enter the machine name</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </FormLabel>
              <FormControl>
                <AutocompleteInput
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                    if (value) {
                      storeMachineName(value);
                    }
                  }}
                  suggestions={machineNameSuggestions}
                  placeholder="Enter machine name"
                  onStoreValue={storeMachineName}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`sensors.${index}.machineNo`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 text-lg 2xl:text-xl font-bold">
                Machine Number
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#3B82F6] text-white border-none">
                      <p>Enter the machine number</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </FormLabel>
              <FormControl>
                <AutocompleteInput
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                    if (value) {
                      storeMachineNo(value);
                    }
                  }}
                  suggestions={machineNoSuggestions}
                  placeholder="Enter machine number"
                  onStoreValue={storeMachineNo}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`sensors.${index}.motorStartTime`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 text-lg 2xl:text-xl font-bold">
                Motor Start Time
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#3B82F6] text-white border-none">
                      <p>Select the motor start date and time</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </FormLabel>
              <FormControl>
                <MUIDateTimePicker
                  value={field.value}
                  onChange={(date) => {
                    field.onChange(date);
                  }}
                  label=""
                  className="bg-[#080808] border-[1px] border-[#4B5563] text-white"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Installation Point */}
        <FormField
          control={form.control}
          name={`sensors.${index}.installationPoint`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 text-lg 2xl:text-xl font-bold">
                Installation Point
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#3B82F6] text-white border-none">
                      <p>Enter the installation point</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </FormLabel>
              <FormControl>
                <AutocompleteInput
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                    if (value) {
                      storeInstallationPoint(value);
                    }
                  }}
                  suggestions={installationPointSuggestions}
                  placeholder="Enter installation point"
                  onStoreValue={storeInstallationPoint}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Options - Machine Class and Name Place */}
      <div className="flex items-center gap-6">
        <FormField
          control={form.control}
          name={`sensors.${index}.machineClassEnabled`}
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 border-[#374151] bg-transparent"
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    if (checked) {
                      form.setValue(`sensors.${index}.namePlaceEnabled`, false);
                    }
                  }}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-lg 2xl:text-xl font-bold">
                  Machine Class
                </FormLabel>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`sensors.${index}.namePlaceEnabled`}
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 border-[#374151] bg-transparent"
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    if (checked) {
                      form.setValue(
                        `sensors.${index}.machineClassEnabled`,
                        false
                      );
                    }
                  }}
                />
              </FormControl>
              <div className="space-y-1 leading-none flex items-center gap-2">
                <FormLabel className="text-lg 2xl:text-xl font-bold">
                  Name Place
                </FormLabel>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#3B82F6] text-white border-none p-4 max-w-sm">
                      <div className="space-y-2">
                        <p className="font-semibold text-lg">
                          You can choose between:
                        </p>
                        <ul className="list-disc pl-4 space-y-1 text-sm">
                          <li>
                            <span className="font-semibold">
                              Machine Class (ISO10816-3)
                            </span>{" "}
                            | Use standard values based on machine type
                          </li>
                          <li>
                            <span className="font-semibold">Name Plate</span> |
                            Enter values according to the motor&apos;s
                            specification
                          </li>
                        </ul>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </FormItem>
          )}
        />
      </div>

      {/* Machine Class Section */}
      {watchedMachineClassEnabled && (
        <div className="p-4 border-[1.35px] border-[#374151] rounded-lg bg-[#0B1121] space-y-4">
          <FormField
            control={form.control}
            name={`sensors.${index}.machineClass`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-lg 2xl:text-xl font-bold">
                  Machine Class
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-[#3B82F6] text-white border-none">
                        <p>Select machine class to auto-fill thresholds</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="bg-[#080808] border-[1px] border-[#4B5563] text-white">
                      <SelectValue placeholder="Select machine class" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {machineClassOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Thresholds - Three Boxes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4 md:px-12">
            <div className="p-4 border border-[#374151] rounded-lg bg-[#0B1121]">
              <FormField
                control={form.control}
                name={`sensors.${index}.warningThreshold`}
                render={({ field }) => (
                  <FormItem className="flex flex-col items-center space-y-4">
                    <FormLabel className="text-lg 2xl:text-xl font-bold text-center flex items-center justify-center gap-1">
                      Warning Threshold
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-[#3B82F6] text-white border-none">
                            <p>Warning threshold level</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder=""
                        className="bg-[#080808] border-[1px] border-[#4B5563] text-white w-32 text-center h-10 text-xl"
                        {...field}
                      />
                    </FormControl>
                    <div className="text-sm text-muted-foreground">mm/s</div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="p-4 border border-[#374151] rounded-lg bg-[#0B1121]">
              <FormField
                control={form.control}
                name={`sensors.${index}.concernThreshold`}
                render={({ field }) => (
                  <FormItem className="flex flex-col items-center space-y-4">
                    <FormLabel className="text-lg 2xl:text-xl font-bold text-center flex items-center justify-center gap-1">
                      Concern Threshold
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-[#3B82F6] text-white border-none">
                            <p>Concern threshold level</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder=""
                        className="bg-[#080808] border-[1px] border-[#4B5563] text-white w-32 text-center h-10 text-xl"
                        {...field}
                      />
                    </FormControl>
                    <div className="text-sm text-muted-foreground">mm/s</div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="p-4 border border-[#374151] rounded-lg bg-[#0B1121]">
              <FormField
                control={form.control}
                name={`sensors.${index}.damageThreshold`}
                render={({ field }) => (
                  <FormItem className="flex flex-col items-center space-y-4">
                    <FormLabel className="text-lg 2xl:text-xl font-bold text-center flex items-center justify-center gap-1">
                      Damage Threshold
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-[#3B82F6] text-white border-none">
                            <p>Damage threshold level</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder=""
                        className="bg-[#080808] border-[1px] border-[#4B5563] text-white w-32 text-center h-10 text-xl"
                        {...field}
                      />
                    </FormControl>
                    <div className="text-sm text-muted-foreground">mm/s</div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
      )}

      {watchedNamePlaceEnabled && (
        <div className="p-6 border-[1.35px] border-[#374151] rounded-xl bg-[#0B1121] space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name={`sensors.${index}.namePlace`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-lg 2xl:text-xl font-bold">
                    Motor Power (kW)
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#3B82F6] text-white border-none">
                          <p>Specify the motor power for this sensor</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter motor power"
                      className="bg-[#080808] border-[1px] border-[#4B5563] text-white"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`sensors.${index}.motorType`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-lg 2xl:text-xl font-bold">
                    Motor Type
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#3B82F6] text-white border-none">
                          <p>Select the motor type</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-[#080808] border-[1px] border-[#4B5563] text-white">
                        <SelectValue placeholder="Select motor type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {motorTypeOptions.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Thresholds - Three Boxes (UI only) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4 md:px-12">
            <div className="p-6 border border-[#374151] rounded-lg bg-[#0B1121]">
              <FormField
                control={form.control}
                name={`sensors.${index}.namePlaceWarningThreshold`}
                render={({ field }) => (
                  <FormItem className="flex flex-col items-center space-y-4">
                    <FormLabel className="text-lg 2xl:text-xl font-bold text-center flex items-center justify-center gap-2">
                      Warning Threshold
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-[#3B82F6] text-white border-none">
                            <p>Warning threshold level</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder=""
                        className="bg-[#080808] border-[1px] border-[#4B5563] text-white w-32 text-center h-10 text-xl"
                        {...field}
                      />
                    </FormControl>
                    <div className="text-sm text-muted-foreground">mm/s</div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="p-6 border border-[#374151] rounded-lg bg-[#0B1121]">
              <FormField
                control={form.control}
                name={`sensors.${index}.namePlaceConcernThreshold`}
                render={({ field }) => (
                  <FormItem className="flex flex-col items-center space-y-4">
                    <FormLabel className="text-lg 2xl:text-xl font-bold text-center flex items-center justify-center gap-2">
                      Concern Threshold
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-[#3B82F6] text-white border-none">
                            <p>Concern threshold level</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder=""
                        className="bg-[#080808] border-[1px] border-[#4B5563] text-white w-32 text-center h-10 text-xl"
                        {...field}
                      />
                    </FormControl>
                    <div className="text-sm text-muted-foreground">mm/s</div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="p-6 border border-[#374151] rounded-lg bg-[#0B1121]">
              <FormField
                control={form.control}
                name={`sensors.${index}.namePlaceDamageThreshold`}
                render={({ field }) => (
                  <FormItem className="flex flex-col items-center space-y-4">
                    <FormLabel className="text-lg 2xl:text-xl font-bold text-center flex items-center justify-center gap-2">
                      Damage Threshold
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-[#3B82F6] text-white border-none">
                            <p>Damage threshold level</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder=""
                        className="bg-[#080808] border-[1px] border-[#4B5563] text-white w-32 text-center h-10 text-xl"
                        {...field}
                      />
                    </FormControl>
                    <div className="text-sm text-muted-foreground">mm/s</div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
      )}

      {/* Additional Settings */}
      {/* Row 1: Columns depend on Name Place being enabled */}
      <div
        className={`grid grid-cols-1 gap-4 ${
          watchedNamePlaceEnabled
            ? "md:grid-cols-2 2xl:grid-cols-2"
            : "md:grid-cols-3 2xl:grid-cols-3"
        }`}
      >
        <FormField
          control={form.control}
          name={`sensors.${index}.highPass`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 text-lg 2xl:text-xl font-bold">
                High Pass Filter (Hz)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#3B82F6] text-white border-none">
                      <p>High pass filter value in Hz</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="10"
                  className="bg-[#080808] border-[1px] border-[#4B5563] text-white"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!watchedNamePlaceEnabled && (
          <FormField
            control={form.control}
            name={`sensors.${index}.alarmThreshold`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-lg 2xl:text-xl font-bold">
                  Alarm Threshold
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-[#3B82F6] text-white border-none">
                        <p>Minimum G-force that activates the sensor.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    className="bg-[#080808] border-[1px] border-[#4B5563] text-white"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name={`sensors.${index}.timeInterval`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 text-lg 2xl:text-xl font-bold">
                Time Interval (min.)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#3B82F6] text-white border-none">
                      <p>Time interval between readings in minutes</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-[#080808] border-[1px] border-[#4B5563] text-white">
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {timeIntervalOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option} min.
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Row 2: Three columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 2xl:grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name={`sensors.${index}.gScale`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 text-lg 2xl:text-xl font-bold">
                G-Scale
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#3B82F6] text-white border-none">
                      <p>
                        Acceleration range in G units. Determines the maximum
                        measurable acceleration.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-[#080808] border-[1px] border-[#4B5563] text-white h-12 text-lg 2xl:text-xl">
                    <SelectValue placeholder="Select G-scale" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {gScaleOptions.map((scale) => (
                    <SelectItem key={scale} value={scale}>
                      {scale} G
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`sensors.${index}.lor`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 text-lg 2xl:text-xl font-bold">
                LOR
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#3B82F6] text-white border-none">
                      <p>
                        Lines of Resolution - Determines frequency resolution in
                        FFT analysis
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-[#080808] border-[1px] border-[#4B5563] text-white h-12 text-lg 2xl:text-xl">
                    <SelectValue placeholder="Select LOR" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {lorOptions.map((lor) => (
                    <SelectItem key={lor} value={lor}>
                      {lor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`sensors.${index}.frequencyMax`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 text-lg 2xl:text-xl font-bold">
                Frequency Max (Hz)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#3B82F6] text-white border-none">
                      <p>Maximum frequency in Hz</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-[#080808] border-[1px] border-[#4B5563] text-white h-12 text-lg 2xl:text-xl">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {frequencyMaxOptions.map((freq) => (
                    <SelectItem key={freq} value={freq}>
                      {freq} Hz
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Row 3: Two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name={`sensors.${index}.temperatureThresholdMin`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 text-lg 2xl:text-xl font-bold">
                Temperature Threshold (min)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#3B82F6] text-white border-none">
                      <p>Minimum temperature threshold</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  className="bg-[#080808] border-[1px] border-[#4B5563] text-white opacity-70 h-12 text-lg 2xl:text-xl"
                  readOnly
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`sensors.${index}.temperatureThresholdMax`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 text-lg 2xl:text-xl font-bold">
                Temperature Threshold (max)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#3B82F6] text-white border-none">
                      <p>Maximum temperature threshold</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  className="bg-[#080808] border-[1px] border-[#4B5563] text-white h-12 text-lg 2xl:text-xl"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Note Section */}
      <FormField
        control={form.control}
        name={`sensors.${index}.notes`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2 text-lg 2xl:text-xl font-bold">
              Note
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#3B82F6] text-white border-none">
                    <p>Add any additional notes or comments</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </FormLabel>
            <FormControl>
              <Textarea
                placeholder="Enter any additional notes..."
                className="bg-[#080808] border-[1px] border-[#4B5563] text-white text-lg 2xl:text-xl"
                {...field}
                rows={4}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Image Upload */}
      <div className="space-y-2">
        <FormLabel className="text-lg 2xl:text-xl font-bold">
          Sensor Image (Optional)
        </FormLabel>
        <div className="flex items-center gap-4">
          <label
            htmlFor={`sensor-image-${index}`}
            className="flex items-center gap-2 px-6 py-3 border rounded-md cursor-pointer bg-white text-black hover:bg-gray-100 text-lg font-bold"
          >
            <Plus className="h-5 w-5" />
            <span>Image</span>
          </label>
          <input
            id={`sensor-image-${index}`}
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
