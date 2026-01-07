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
import { storeArea, storeMachineName } from "@/lib/registerStorage";

interface SensorFormContentProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  index: number;
  areaSuggestions: string[];
  machineNameSuggestions: string[];
  imagePreview: string | null;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function SensorFormContent({
  form,
  index,
  areaSuggestions,
  machineNameSuggestions,
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

  return (
    <div className="space-y-6 py-4">
      {/* Sensor Information - Two Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
        {/* Left Column */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name={`sensors.${index}.area`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  Area
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-[#030616] border-[1.35px] border-[#374151] text-white">
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
            name={`sensors.${index}.serialNumber`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  Serial Number
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-[#030616] border-[1.35px] border-[#374151] text-white">
                        <p>Enter the serial number of the sensor</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter serial number"
                    className="bg-[#030616] border-[1.35px] border-[#374151] text-white"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />


        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name={`sensors.${index}.machine`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  Machine
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-[#030616] border-[1.35px] border-[#374151] text-white">
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
            name={`sensors.${index}.motorStartTime`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  Motor Start Time
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-[#030616] border-[1.35px] border-[#374151] text-white">
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
                    className="bg-[#030616] border-[1.35px] border-[#374151] text-white"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
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
                <FormLabel>Machine Class</FormLabel>
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
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    if (checked) {
                      form.setValue(`sensors.${index}.machineClassEnabled`, false);
                    }
                  }}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Name Place</FormLabel>
              </div>
            </FormItem>
          )}
        />
      </div>

      {/* Machine Class Section */}
      {watchedMachineClassEnabled && (
        <div className="p-4 border-[1.35px] border-[#374151] rounded-lg bg-[#030616] space-y-4">
          <FormField
            control={form.control}
            name={`sensors.${index}.machineClass`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  Machine Class
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-[#030616] border-[1.35px] border-[#374151] text-white">
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
                    <SelectTrigger className="bg-[#11171F] border-[#4B5563] text-white">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 border-[1.35px] border-[#374151] rounded-lg bg-[#030616]">
              <FormField
                control={form.control}
                name={`sensors.${index}.warningThreshold`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Warning Threshold
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="0.0"
                        className="bg-[#11171F] border-[#4B5563] text-white"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">mm/s</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="p-3 border-[1.35px] border-[#374151] rounded-lg bg-[#030616]">
              <FormField
                control={form.control}
                name={`sensors.${index}.concernThreshold`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Concern Threshold
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="0.0"
                        className="bg-[#11171F] border-[#4B5563] text-white"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">mm/s</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="p-3 border-[1.35px] border-[#374151] rounded-lg bg-[#030616]">
              <FormField
                control={form.control}
                name={`sensors.${index}.damageThreshold`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Damage Threshold
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="0.0"
                        className="bg-[#11171F] border-[#4B5563] text-white"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">mm/s</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
      )}

      {watchedNamePlaceEnabled && (
        <div className="p-4 border-[1.35px] border-[#374151] rounded-lg bg-[#030616] space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name={`sensors.${index}.namePlace`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Motor Power (kW)
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#030616] border-[1.35px] border-[#374151] text-white">
                          <p>Specify the motor power for this sensor</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter motor power"
                      className="bg-[#11171F] border-[#4B5563] text-white"
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
                  <FormLabel className="flex items-center gap-2">
                    Motor Type
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-[#030616] border-[1.35px] border-[#374151] text-white">
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
                      <SelectTrigger className="bg-[#11171F] border-[#4B5563] text-white">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 border-[1.35px] border-[#374151] rounded-lg bg-[#030616]">
              <FormField
                control={form.control}
                name={`sensors.${index}.namePlaceWarningThreshold`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Warning Threshold
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="0.0"
                        className="bg-[#11171F] border-[#4B5563] text-white"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">mm/s</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="p-3 border-[1.35px] border-[#374151] rounded-lg bg-[#030616]">
              <FormField
                control={form.control}
                name={`sensors.${index}.namePlaceConcernThreshold`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Concern Threshold
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="0.0"
                        className="bg-[#11171F] border-[#4B5563] text-white"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">mm/s</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="p-3 border-[1.35px] border-[#374151] rounded-lg bg-[#030616]">
              <FormField
                control={form.control}
                name={`sensors.${index}.namePlaceDamageThreshold`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Damage Threshold
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="0.0"
                        className="bg-[#11171F] border-[#4B5563] text-white"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">mm/s</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
      )}

      {/* Additional Settings */}
      {/* Row 1: Two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name={`sensors.${index}.highPass`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
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
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="10"
                  className="bg-[#030616] border-[1.35px] border-[#374151] text-white"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`sensors.${index}.timeInterval`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
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
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="60"
                  min="1"
                  className="bg-[#030616] border-[1.35px] border-[#374151] text-white"
                  {...field}
                />
              </FormControl>
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
              <FormLabel className="flex items-center gap-2">
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
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-[#030616] border-[1.35px] border-[#374151] text-white">
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
              <FormLabel className="flex items-center gap-2">
                LOR
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
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
                  <SelectTrigger className="bg-[#11171F] border-[#4B5563] text-white">
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
              <FormLabel className="flex items-center gap-2">
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
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-[#11171F] border-[#4B5563] text-white">
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
              <FormLabel className="flex items-center gap-2">
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
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  className="bg-[#030616] border-[1.35px] border-[#374151] text-white"
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
              <FormLabel className="flex items-center gap-2">
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
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  className="bg-[#030616] border-[1.35px] border-[#374151] text-white"
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
            <FormLabel className="flex items-center gap-2">
              Note
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#030616] border-[1.35px] border-[#374151] text-white">
                    <p>Add any additional notes or comments</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </FormLabel>
            <FormControl>
              <Textarea
                placeholder="Enter any additional notes..."
                className="bg-[#030616] border-[1.35px] border-[#374151] text-white"
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
        <FormLabel>Sensor Image (Optional)</FormLabel>
        <div className="flex items-center gap-4">
          <label
            htmlFor={`sensor-image-${index}`}
            className="flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer bg-white text-black hover:bg-gray-100"
          >
            <Plus className="h-4 w-4" />
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
