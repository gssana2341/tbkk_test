"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Loader2, Info, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MUIDateTimePicker } from "@/components/ui/mui-date-time-picker";
import { AutocompleteInput } from "./AutocompleteInput";
import {
  getStoredAreas,
  getStoredMachineNames,
  storeArea,
  storeMachineName,
} from "@/lib/registerStorage";
import {
  getAllMachineClasses,
  getMachineClassCode,
  getThresholdsForMachineClass,
} from "@/lib/iso10816-3";
import { uploadSensorImage } from "@/lib/utils";

// Extended form schema with new fields
const formSchema = z
  .object({
    serialNumber: z
      .string()
      .min(4, { message: "Serial number must be at least 4 characters" })
      .max(20, { message: "Serial number must be less than 20 characters" })
      .regex(/^[0-9a-fA-F]+$/, {
        message:
          "Serial number must contain only hexadecimal characters (0-9, A-F)",
      }),
    area: z.string().min(1, { message: "Please enter Area" }),
    motorStartTime: z.date().optional(),
    sensorType: z.string().min(1, { message: "Please select sensor type" }),
    machine: z.string().min(1, { message: "Please enter Machine" }),
    machineClassEnabled: z.boolean(),
    namePlaceEnabled: z.boolean(),
    machineClass: z.string().optional(),
    namePlace: z.string().optional(),
    warningThreshold: z.string().optional(),
    concernThreshold: z.string().optional(),
    damageThreshold: z.string().optional(),
    alarmThreshold: z.string().optional(),
    gScale: z.string().optional(),
    temperatureThresholdMin: z.string().optional(),
    timeInterval: z.string().optional(),
    lor: z.string().optional(),
    frequencyMax: z.string().optional(),
    temperatureThresholdMax: z.string().optional(),
    notes: z.string().optional(),
    highPass: z.string().optional(),
    motorType: z.string().optional(),
    image: z.instanceof(File).optional(),
    // Name Place specific thresholds (UI only)
    namePlaceWarningThreshold: z.string().optional(),
    namePlaceConcernThreshold: z.string().optional(),
    namePlaceDamageThreshold: z.string().optional(),
  })
  .refine(
    (data) =>
      !data.namePlaceEnabled || (data.namePlace && data.namePlace.length > 0),
    {
      message: "Please enter name place",
      path: ["namePlace"],
    }
  )
  .refine(
    (data) =>
      !data.machineClassEnabled ||
      (data.machineClass && data.machineClass.length > 0),
    {
      message: "Please enter machine class",
      path: ["machineClass"],
    }
  );

export default function RegisterSensorForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // Get stored suggestions
  const [areaSuggestions, setAreaSuggestions] = useState<string[]>([]);
  const [machineNameSuggestions, setMachineNameSuggestions] = useState<
    string[]
  >([]);

  useEffect(() => {
    setAreaSuggestions(getStoredAreas());
    setMachineNameSuggestions(getStoredMachineNames());
  }, []);

  // Set default motor start time: 26 Sep 2025, 01:00:00
  // Use local date constructor to avoid timezone issues
  const defaultMotorStartTime = new Date(2025, 8, 26, 1, 0, 0); // Month is 0-indexed (8 = September)

  // Initialize form with react-hook-form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serialNumber: "",
      area: "",
      motorStartTime: defaultMotorStartTime,
      sensorType: "",
      machine: "",
      machineClassEnabled: true,
      namePlaceEnabled: false,
      machineClass: "",
      namePlace: "",
      warningThreshold: "",
      concernThreshold: "",
      damageThreshold: "",
      alarmThreshold: "",
      gScale: "",
      temperatureThresholdMin: "",
      timeInterval: "",
      lor: "",
      frequencyMax: "",
      temperatureThresholdMax: "",
      notes: "",
      highPass: "",
      motorType: "",
      // Name Place specific thresholds defaults (UI only)
      namePlaceWarningThreshold: "",
      namePlaceConcernThreshold: "",
      namePlaceDamageThreshold: "",
    },
  });

  const machineClassOptions = getAllMachineClasses();

  // Watch machine class to auto-update thresholds
  const watchedMachineClass = form.watch("machineClass");
  const watchedMachineClassEnabled = form.watch("machineClassEnabled");
  const watchedNamePlaceEnabled = form.watch("namePlaceEnabled");

  // Auto-update thresholds when machine class changes
  useEffect(() => {
    if (watchedMachineClass && watchedMachineClassEnabled) {
      const thresholds = getThresholdsForMachineClass(watchedMachineClass);

      if (thresholds) {
        form.setValue("warningThreshold", thresholds.warning.toString());
        form.setValue("concernThreshold", thresholds.concern.toString());
        form.setValue("damageThreshold", thresholds.critical.toString());
      }
    }
  }, [watchedMachineClass, watchedMachineClassEnabled, form]);

  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);

    try {
      const serialNumber = values.serialNumber.toUpperCase();
      // Store Area and Machine Name for suggestions
      if (values.area) {
        storeArea(values.area);
      }
      if (values.machine) {
        storeMachineName(values.machine);
      }

      // Upload image first if selected
      if (selectedImage) {
        try {
          setImageUploading(true);
          // Image will be uploaded after sensor creation
          toast({
            title: "Image Upload",
            description: "Image will be uploaded after sensor registration.",
          });
        } catch (error) {
          console.error("Error uploading image:", error);
          toast({
            title: "Image Upload Failed",
            description: "Sensor will be registered without image.",
            variant: "destructive",
          });
        } finally {
          setImageUploading(false);
        }
      }

      // Format motor start time to "26-Sep-2025,01:00:00" format
      const formatMotorStartTime = (date: Date): string => {
        const day = date.getDate();
        const months = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const seconds = String(date.getSeconds()).padStart(2, "0");
        return `${day}-${month}-${year},${hours}:${minutes}:${seconds}`;
      };

      // Map form values to API payload
      const payload = {
        mac_address: serialNumber, // Serial Number maps to mac_address
        area: values.area,
        machine_class:
          values.machineClassEnabled && values.machineClass
            ? (getMachineClassCode(values.machineClass) ?? null)
            : null,
        machine: values.machine,
        sensor_type: values.sensorType,
        motor_start_time: values.motorStartTime
          ? formatMotorStartTime(values.motorStartTime)
          : null,
        time_interval: values.timeInterval ? Number(values.timeInterval) : null,
        high_pass: values.highPass ? Number(values.highPass) : null,
        g_scale: values.gScale ? Number(values.gScale) : null,
        lor: values.lor ? Number(values.lor) : null,
        max_frequency: values.frequencyMax ? Number(values.frequencyMax) : null,
        note: values.notes || "",
        threshold_min: values.warningThreshold
          ? Number(values.warningThreshold)
          : null,
        threshold_medium: values.concernThreshold
          ? Number(values.concernThreshold)
          : null,
        threshold_max: values.damageThreshold
          ? Number(values.damageThreshold)
          : null,
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/sensors/web-register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const result = await response.json();
      const sensorId = result.id || result.sensor?.id;

      // Upload image after sensor creation if we have sensor ID
      if (selectedImage && sensorId) {
        try {
          setImageUploading(true);
          const uploadResult = await uploadSensorImage(sensorId, selectedImage);
          void uploadResult;
        } catch (error) {
          console.error("Error uploading image:", error);
        } finally {
          setImageUploading(false);
        }
      }

      toast({
        title: "Sensor Registered",
        description: `Sensor ${values.serialNumber} has been successfully registered.`,
      });

      // Redirect to dashboard immediately
      router.push("/");
    } catch (error) {
      console.error("Error registering sensor:", error);
      toast({
        title: "Registration Failed",
        description:
          error instanceof Error
            ? error.message
            : "There was an error registering the sensor. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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

  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle>Register New Sensor</CardTitle>
        <CardDescription>
          Add new sensors to the monitoring system.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Sensor Information - Two Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
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
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Enter serial number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="area"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Area
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                Enter the area where the sensor is installed
                              </p>
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
                  name="motorStartTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
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
                      </FormLabel>
                      <FormControl>
                        <MUIDateTimePicker
                          value={field.value}
                          onChange={(date) => {
                            field.onChange(date);
                          }}
                          label=""
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
                  name="sensorType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
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
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select sensor type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sensorTypes.map((type) => (
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

                <FormField
                  control={form.control}
                  name="machine"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
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
              </div>
            </div>

            {/* Options - Machine Class and Name Place */}
            <div className="flex items-center gap-6">
              <FormField
                control={form.control}
                name="machineClassEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
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
                name="namePlaceEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
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
              <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
                <FormField
                  control={form.control}
                  name="machineClass"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Machine Class
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                Select machine class to auto-fill thresholds
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
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
                  <div className="p-3 border rounded-lg bg-white">
                    <FormField
                      control={form.control}
                      name="warningThreshold"
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
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            mm/s
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="p-3 border rounded-lg bg-white">
                    <FormField
                      control={form.control}
                      name="concernThreshold"
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
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            mm/s
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="p-3 border rounded-lg bg-white">
                    <FormField
                      control={form.control}
                      name="damageThreshold"
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
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            mm/s
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            )}

            {watchedNamePlaceEnabled && (
              <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="namePlace"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
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
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Enter motor power" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="motorType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
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
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
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
                  <div className="p-3 border rounded-lg bg-white">
                    <FormField
                      control={form.control}
                      name="namePlaceWarningThreshold"
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
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            mm/s
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="p-3 border rounded-lg bg-white">
                    <FormField
                      control={form.control}
                      name="namePlaceConcernThreshold"
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
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            mm/s
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="p-3 border rounded-lg bg-white">
                    <FormField
                      control={form.control}
                      name="namePlaceDamageThreshold"
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
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            mm/s
                          </FormDescription>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="highPass"
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
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="timeInterval"
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
                        {...field}
                        min="1"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 2: Three columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="gScale"
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
                              Acceleration range in G units. Determines the
                              maximum measurable acceleration.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
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
                name="lor"
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
                              Lines of Resolution - Determines frequency
                              resolution in FFT analysis
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
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
                name="frequencyMax"
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
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
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
                name="temperatureThresholdMin"
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
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="temperatureThresholdMax"
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter additional notes"
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Image Upload */}
            <div className="space-y-4">
              {imagePreview && (
                <div className="relative w-full max-w-md">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    width={400}
                    height={192}
                    className="w-full h-48 object-cover rounded-md border"
                    unoptimized
                  />
                </div>
              )}

              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-muted"
                >
                  <Plus className="h-4 w-4" />
                  Image
                </label>
                {selectedImage && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreview(null);
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/sensors")}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset({
                    ...form.getValues(),
                    motorStartTime: defaultMotorStartTime,
                  });
                  setImagePreview(null);
                  setSelectedImage(null);
                }}
              >
                Reset Form
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || imageUploading}
                className="bg-gray-800 text-white hover:bg-gray-700"
              >
                {isSubmitting || imageUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {imageUploading ? "Uploading..." : "Saving..."}
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
