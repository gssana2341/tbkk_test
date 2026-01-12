"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getStoredAreas,
  getStoredMachineNames,
  storeArea,
  storeMachineName,
} from "@/lib/registerStorage";
import { getMachineClassCode } from "@/lib/iso10816-3";
import { uploadSensorImage } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SensorFormContent } from "./SensorFormContent";
import { ImageCropper } from "@/components/ui/ImageCropper";

// Single sensor schema
const singleSensorSchema = z
  .object({
    serialNumber: z.string().optional(),
    area: z.string().optional(),
    motorStartTime: z.date().optional(),
    sensorType: z.string().optional(),
    machine: z.string().optional(),
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
    id: z.string().optional(), // Store ID for updates
  })
  .superRefine((data, ctx) => {
    // If serial number is present (meaning the user wants to register this sensor)
    if (data.serialNumber && data.serialNumber.length > 0) {
      if (data.serialNumber.length !== 12) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Serial number (MAC) must be exactly 12 characters",
          path: ["serialNumber"],
        });
      } else if (!/^[0-9a-fA-F]{12}$/.test(data.serialNumber)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Serial number must contain only hexadecimal characters (0-9, A-F)",
          path: ["serialNumber"],
        });
      }

      // Required fields validation
      if (!data.area) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Area is required",
          path: ["area"],
        });
      }
      if (!data.machine) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Machine is required",
          path: ["machine"],
        });
      }
      if (!data.sensorType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Sensor Type is required",
          path: ["sensorType"],
        });
      }
      if (!data.motorStartTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Motor Start Time is required",
          path: ["motorStartTime"],
        });
      }

      // Machine Class validation
      if (data.machineClassEnabled) {
        if (!data.machineClass) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Machine Class is required",
            path: ["machineClass"],
          });
        }
        // Thresholds required if machine class enabled?
        if (!data.warningThreshold) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Warning Threshold is required",
            path: ["warningThreshold"],
          });
        }
        if (!data.concernThreshold) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Concern Threshold is required",
            path: ["concernThreshold"],
          });
        }
        if (!data.damageThreshold) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Damage Threshold is required",
            path: ["damageThreshold"],
          });
        }
      }

      // Name Place validation
      if (data.namePlaceEnabled) {
        if (!data.namePlace) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Name Place (Motor Power) is required",
            path: ["namePlace"],
          });
        }
        if (!data.motorType) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Motor Type is required",
            path: ["motorType"],
          });
        }
      }

      // Other common required fields
      if (!data.timeInterval) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Time Interval is required",
          path: ["timeInterval"],
        });
      }
      if (!data.highPass) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "High Pass is required",
          path: ["highPass"],
        });
      }
      if (!data.gScale) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "G-Scale is required",
          path: ["gScale"],
        });
      }
      if (!data.lor) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "LOR is required",
          path: ["lor"],
        });
      }
      if (!data.frequencyMax) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Frequency Max is required",
          path: ["frequencyMax"],
        });
      }
    }
  });

// Main form schema
const formSchema = z.object({
  sensors: z.array(singleSensorSchema),
});

// Helper to parse the custom date format: "18-Dec-2025,09:30:00"
const parseCustomDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  try {
    const [datePart, timePart] = dateStr.split(",");
    if (!datePart || !timePart) return new Date(dateStr);

    const [day, monthStr, year] = datePart.split("-");
    const [hours, minutes, seconds] = timePart.split(":");

    const months: Record<string, number> = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    };

    const month = months[monthStr] ?? 0;

    return new Date(
      parseInt(year),
      month,
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      parseInt(seconds)
    );
  } catch (e) {
    console.warn("Failed to parse custom date:", dateStr, e);
    return new Date();
  }
};

export default function RegisterSensorForm() {
  const [activeTab, setActiveTab] = useState("master");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<Record<number, string>>(
    {}
  );
  const [selectedImages, setSelectedImages] = useState<Record<number, File>>(
    {}
  );
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropIndex, setCropIndex] = useState<number | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<z.infer<
    typeof formSchema
  > | null>(null);

  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get("id");
  const [isEditMode, setIsEditMode] = useState(false);

  const [areaSuggestions, setAreaSuggestions] = useState<string[]>([]);
  const [machineNameSuggestions, setMachineNameSuggestions] = useState<
    string[]
  >([]);

  useEffect(() => {
    setAreaSuggestions(getStoredAreas());
    setMachineNameSuggestions(getStoredMachineNames());
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  const defaultMotorStartTime = new Date();

  const defaultSensorValues = {
    serialNumber: "",
    area: "",
    motorStartTime: defaultMotorStartTime,
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
    highPass: "",
    motorType: "",
    namePlaceWarningThreshold: "",
    namePlaceConcernThreshold: "",
    namePlaceDamageThreshold: "",
    id: "",
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sensors: [
        {
          ...defaultSensorValues,
          sensorType: "Master",
          notes: "Master Sensor",
        },
        {
          ...defaultSensorValues,
          sensorType: "Satellite",
          notes: "Satellite 1",
        },
        {
          ...defaultSensorValues,
          sensorType: "Satellite",
          notes: "Satellite 2",
        },
        {
          ...defaultSensorValues,
          sensorType: "Satellite",
          notes: "Satellite 3",
        },
      ],
    },
  });

  useEffect(() => {
    const fetchSensorData = async () => {
      if (!editId) return;
      setIsEditMode(true);
      try {
        const response = await fetch(`${"/api"}/sensors/${editId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const mappedSensor = {
            id: data.id,
            serialNumber: data.mac_address || data.name || "",
            area: data.area || data.installed_point || "",
            motorStartTime: data.motor_start_time
              ? parseCustomDate(data.motor_start_time)
              : new Date(),
            machine: data.machine || data.machine_no || "",
            machineClassEnabled: true,
            namePlaceEnabled: false,
            machineClass: data.machine_class || "mediumFlexible",
            namePlace: "",
            warningThreshold: data.threshold_min?.toString() || "",
            concernThreshold: data.threshold_medium?.toString() || "",
            damageThreshold: data.threshold_max?.toString() || "",
            alarmThreshold: data.alarm_ths?.toString() || "",
            gScale: data.g_scale?.toString() || "16",
            temperatureThresholdMin:
              data.temperature_threshold_min?.toString() || "",
            timeInterval: data.time_interval?.toString() || "60",
            lor: data.lor?.toString() || "5600",
            frequencyMax: data.fmax?.toString() || "9000",
            temperatureThresholdMax:
              data.temperature_threshold_max?.toString() || "",
            highPass: data.high_pass?.toString() || "8",
            motorType: "",
            notes: data.note || "",
            sensorType: data.sensor_type || "Master",
          };

          const newSensors = [
            { ...defaultSensorValues, ...mappedSensor },
            {
              ...defaultSensorValues,
              sensorType: "Satellite",
              notes: "Satellite 1",
            },
            {
              ...defaultSensorValues,
              sensorType: "Satellite",
              notes: "Satellite 2",
            },
            {
              ...defaultSensorValues,
              sensorType: "Satellite",
              notes: "Satellite 3",
            },
          ];

          if (!data.sensor_type || data.sensor_type === "Master") {
            try {
              const allSensorsResponse = await fetch(
                `${"/api"}/sensors/with-last-data`,
                {
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
                  },
                }
              );
              if (allSensorsResponse.ok) {
                const allSensors = await allSensorsResponse.json();
                const satellites = allSensors.filter(
                  (s: any) =>
                    s.machine_no === data.machine_no &&
                    s.sensor_type === "Satellite" &&
                    s.id !== data.id
                );
                satellites.sort((a: any, b: any) =>
                  (a.sensor_name || "").localeCompare(b.sensor_name || "")
                );
                satellites.forEach((sat: any, index: number) => {
                  if (index < 3) {
                    newSensors[index + 1] = {
                      ...defaultSensorValues,
                      id: sat.id,
                      serialNumber: sat.mac_address || sat.name || "",
                      area: sat.area || sat.installed_point || "",
                      motorStartTime: sat.motor_start_time
                        ? parseCustomDate(sat.motor_start_time)
                        : new Date(),
                      machine: sat.machine || sat.machine_no || "",
                      machineClassEnabled: true,
                      namePlaceEnabled: false,
                      machineClass: sat.machine_class || "mediumFlexible",
                      namePlace: "",
                      warningThreshold: sat.threshold_min?.toString() || "",
                      concernThreshold: sat.threshold_medium?.toString() || "",
                      damageThreshold: sat.threshold_max?.toString() || "",
                      alarmThreshold: sat.alarm_ths?.toString() || "",
                      gScale: sat.g_scale?.toString() || "16",
                      temperatureThresholdMin:
                        sat.temperature_threshold_min?.toString() || "",
                      timeInterval: sat.time_interval?.toString() || "60",
                      lor: sat.lor?.toString() || "5600",
                      frequencyMax: sat.fmax?.toString() || "9000",
                      temperatureThresholdMax:
                        sat.temperature_threshold_max?.toString() || "",
                      highPass: sat.high_pass?.toString() || "8",
                      motorType: "",
                      notes: sat.note || `Satellite ${index + 1}`,
                      sensorType: "Satellite",
                    };
                  }
                });
              }
            } catch (err) {
              console.error("Failed to fetch satellites:", err);
            }
          }
          form.reset({ sensors: newSensors });
          toast({
            title: "Edit Mode",
            description: "Loaded sensor data for editing.",
          });
        }
      } catch (error) {
        console.error("Error fetching sensor data:", error);
      }
    };
    fetchSensorData();
  }, [editId, toast]);

  const handleImageChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setCropImageSrc(e.target.result as string);
          setCropIndex(index);
          setShowCropper(true);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    if (cropIndex !== null) {
      const file = new File([croppedBlob], "sensor-image.jpg", {
        type: "image/jpeg",
      });
      setSelectedImages((prev) => ({ ...prev, [cropIndex]: file }));
      setImagePreviews((prev) => ({
        ...prev,
        [cropIndex]: URL.createObjectURL(croppedBlob),
      }));
    }
    setShowCropper(false);
    setCropImageSrc(null);
    setCropIndex(null);
  };

  const handleNext = () => {
    if (activeTab === "master") setActiveTab("sat1");
    else if (activeTab === "sat1") setActiveTab("sat2");
    else if (activeTab === "sat2") setActiveTab("sat3");
  };

  const handleBack = () => {
    if (activeTab === "sat1") setActiveTab("master");
    else if (activeTab === "sat2") setActiveTab("sat1");
    else if (activeTab === "sat3") setActiveTab("sat2");
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setPendingValues(values);
    setIsConfirmOpen(true);
  };

  const handleRealSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    if (isEditMode || !!editId) {
      try {
        const updates = values.sensors
          .filter((s) => s.serialNumber && s.serialNumber.trim() !== "")
          .map(async (sensorData, index) => {
            const targetId = sensorData.id || (index === 0 ? editId : null);
            if (!targetId)
              return {
                success: false,
                name: sensorData.serialNumber,
                error: "Missing ID",
              };

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

            const payload = {
              area: sensorData.area?.toUpperCase(),
              machine_class:
                sensorData.machineClassEnabled && sensorData.machineClass
                  ? (getMachineClassCode(sensorData.machineClass) ?? null)
                  : null,
              machine: sensorData.machine?.toUpperCase(),
              sensor_type: sensorData.sensorType,
              fmax: parseInt(sensorData.frequencyMax || "0"),
              lor: parseInt(sensorData.lor || "0"),
              g_scale: parseInt(sensorData.gScale || "0"),
              time_interval: parseInt(sensorData.timeInterval || "0"),
              threshold_min: parseFloat(sensorData.warningThreshold || "0"),
              threshold_medium: parseFloat(sensorData.concernThreshold || "0"),
              threshold_max: parseFloat(sensorData.damageThreshold || "0"),
              alarm_ths: parseFloat(sensorData.alarmThreshold || "0"),
              temperature_threshold_min: parseFloat(
                sensorData.temperatureThresholdMin || "0"
              ),
              temperature_threshold_max: parseFloat(
                sensorData.temperatureThresholdMax || "0"
              ),
              high_pass: parseFloat(sensorData.highPass || "0"),
              note: sensorData.notes,
              motor_start_time: sensorData.motorStartTime
                ? formatMotorStartTime(sensorData.motorStartTime)
                : null,
            };

            const response = await fetch(
              `${"/api"}/sensors/${targetId}/config`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
                },
                body: JSON.stringify(payload),
              }
            );
            if (!response.ok) throw new Error(response.statusText);

            if (selectedImages[index]) {
              try {
                await uploadSensorImage(targetId, selectedImages[index]);
              } catch (imgErr) {
                console.error(
                  `Failed to upload image for sensor ${targetId}`,
                  imgErr
                );
              }
            }
            return { success: true, name: sensorData.serialNumber };
          });

        const results = await Promise.allSettled(updates);
        const failures = results.filter(
          (r) =>
            r.status === "rejected" ||
            (r.status === "fulfilled" && !r.value.success)
        );
        if (failures.length > 0) {
          toast({
            title: "Update Completed with Errors",
            description: `Updated ${results.length - failures.length} sensors. Failed: ${failures.length}`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Update Successful",
            description: `All ${results.length} sensors updated successfully.`,
          });
          router.push(`/sensors/${editId}`);
        }
      } catch (error) {
        console.error("Error updating sensor:", error);
        toast({
          title: "Update Failed",
          description: "Failed to update sensors.",
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    try {
      const validSensors = values.sensors
        .map((sensor, index) => ({ ...sensor, originalIndex: index }))
        .filter(
          (sensor) => sensor.serialNumber && sensor.serialNumber.length > 0
        );
      if (validSensors.length === 0) {
        toast({
          title: "No Sensors to Register",
          description:
            "Please fill in at least one sensor (Master is recommended).",
          variant: "destructive",
        });
        return;
      }

      const payload = validSensors.map((sensorData) => {
        if (sensorData.area) storeArea(sensorData.area);
        if (sensorData.machine) storeMachineName(sensorData.machine);
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
        return {
          mac_address: sensorData.serialNumber?.toUpperCase(),
          area: sensorData.area?.toUpperCase(),
          machine_class:
            sensorData.machineClassEnabled && sensorData.machineClass
              ? (getMachineClassCode(sensorData.machineClass) ?? null)
              : null,
          machine: sensorData.machine?.toUpperCase(),
          sensor_type: sensorData.sensorType,
          motor_start_time: sensorData.motorStartTime
            ? formatMotorStartTime(sensorData.motorStartTime)
            : null,
          time_interval: sensorData.timeInterval
            ? Number(sensorData.timeInterval)
            : null,
          high_pass: sensorData.highPass ? Number(sensorData.highPass) : null,
          g_scale: sensorData.gScale ? Number(sensorData.gScale) : null,
          lor: sensorData.lor ? Number(sensorData.lor) : null,
          max_frequency: sensorData.frequencyMax
            ? Number(sensorData.frequencyMax)
            : null,
          note: sensorData.notes || "",
          threshold_min: sensorData.warningThreshold
            ? Number(sensorData.warningThreshold)
            : null,
          threshold_medium: sensorData.concernThreshold
            ? Number(sensorData.concernThreshold)
            : null,
          threshold_max: sensorData.damageThreshold
            ? Number(sensorData.damageThreshold)
            : null,
          temperature_threshold_min: sensorData.temperatureThresholdMin
            ? Number(sensorData.temperatureThresholdMin)
            : null,
          temperature_threshold_max: sensorData.temperatureThresholdMax
            ? Number(sensorData.temperatureThresholdMax)
            : null,
          alarm_ths: sensorData.alarmThreshold
            ? Number(sensorData.alarmThreshold)
            : null,
        };
      });

      const response = await fetch(`${"/api"}/sensors/web-register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to register sensors");
      const result = await response.json();
      const createdSensors = Array.isArray(result) ? result : [result];

      for (const sensorData of validSensors) {
        const imageFile = selectedImages[sensorData.originalIndex];
        if (imageFile) {
          const mac = sensorData.serialNumber?.toUpperCase();
          const createdSensor = createdSensors.find(
            (s: any) => s.mac_address === mac || s.sensor?.mac_address === mac
          );
          const sensorId = createdSensor?.id || createdSensor?.sensor?.id;
          if (sensorId) {
            try {
              await uploadSensorImage(sensorId, imageFile);
            } catch (e) {
              console.error("Image upload failed", e);
            }
          }
        }
      }
      toast({
        title: "Registration Complete",
        description: `Successfully registered ${validSensors.length} sensors.`,
      });
      router.push("/");
    } catch (error) {
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="w-full flex-1 flex flex-col"
    >
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-white">
          {editId
            ? `Edit Sensor : ${form.watch("sensors.0.serialNumber") || "Loading..."}`
            : "Register New Device"}
        </h1>
        <Card className="flex-1 flex flex-col border-[1px] border-[#4B5563] bg-[#111827] text-white">
          <CardHeader className="p-0">
            {(!editId || form.watch("sensors.0.sensorType") === "Master") && (
              <TabsList className="flex w-full justify-start bg-transparent p-0">
                <TabsTrigger
                  value="master"
                  className="rounded-none border-b-2 border-transparent px-6 py-3 text-xl font-bold data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Master
                </TabsTrigger>
                <TabsTrigger
                  value="sat1"
                  className="rounded-none border-b-2 border-transparent px-6 py-3 text-xl font-bold data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Satellite 1
                </TabsTrigger>
                <TabsTrigger
                  value="sat2"
                  className="rounded-none border-b-2 border-transparent px-6 py-3 text-xl font-bold data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Satellite 2
                </TabsTrigger>
                <TabsTrigger
                  value="sat3"
                  className="rounded-none border-b-2 border-transparent px-6 py-3 text-xl font-bold data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Satellite 3
                </TabsTrigger>
              </TabsList>
            )}
          </CardHeader>
          <CardContent className="pt-6">
            <div className="mb-6 space-y-1">
              <h2 className="text-3xl font-semibold text-white">
                Register New {activeTab === "master" ? "Master" : activeTab === "sat1" ? "Satellite 1" : activeTab === "sat2" ? "Satellite 2" : "Satellite 3"} Sensor
              </h2>
              <p className="text-lg text-muted-foreground">
                Add new sensors to the monitoring system.
              </p>
            </div>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit, (errors) => {
                  console.error(
                    "Form validation errors:",
                    JSON.stringify(errors, null, 2)
                  );
                  toast({
                    title: "Validation Error",
                    description:
                      "Please check the form for missing or invalid fields.",
                    variant: "destructive",
                  });
                })}
                className="space-y-6"
              >
                <TabsContent value="master" className="mt-0">
                  <SensorFormContent
                    form={form}
                    index={0}
                    areaSuggestions={areaSuggestions}
                    machineNameSuggestions={machineNameSuggestions}
                    imagePreview={imagePreviews[0]}
                    onImageChange={(e) => handleImageChange(0, e)}
                  />
                </TabsContent>
                <TabsContent value="sat1" className="mt-0">
                  <SensorFormContent
                    form={form}
                    index={1}
                    areaSuggestions={areaSuggestions}
                    machineNameSuggestions={machineNameSuggestions}
                    imagePreview={imagePreviews[1]}
                    onImageChange={(e) => handleImageChange(1, e)}
                  />
                </TabsContent>
                <TabsContent value="sat2" className="mt-0">
                  <SensorFormContent
                    form={form}
                    index={2}
                    areaSuggestions={areaSuggestions}
                    machineNameSuggestions={machineNameSuggestions}
                    imagePreview={imagePreviews[2]}
                    onImageChange={(e) => handleImageChange(2, e)}
                  />
                </TabsContent>
                <TabsContent value="sat3" className="mt-0">
                  <SensorFormContent
                    form={form}
                    index={3}
                    areaSuggestions={areaSuggestions}
                    machineNameSuggestions={machineNameSuggestions}
                    imagePreview={imagePreviews[3]}
                    onImageChange={(e) => handleImageChange(3, e)}
                  />
                </TabsContent>

                <div className="grid grid-cols-3 items-center pt-4 w-full">
                  <div className="justify-self-start">
                    {!editId && (
                      <Button
                        type="button"
                        onClick={() => {
                          form.reset({
                            sensors: [
                              {
                                ...defaultSensorValues,
                                sensorType: "Master",
                                notes: "Master Sensor",
                              },
                              {
                                ...defaultSensorValues,
                                sensorType: "Satellite",
                                notes: "Satellite 1",
                              },
                              {
                                ...defaultSensorValues,
                                sensorType: "Satellite",
                                notes: "Satellite 2",
                              },
                              {
                                ...defaultSensorValues,
                                sensorType: "Satellite",
                                notes: "Satellite 3",
                              },
                            ],
                          });
                          setActiveTab("master");
                          setImagePreviews({});
                          setSelectedImages({});
                          toast({
                            title: "Form Reset",
                            description:
                              "All fields have been reset to default values.",
                          });
                        }}
                        className="bg-[#E35D5D] text-white hover:bg-red-600 w-32 h-12 text-xl font-bold"
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                  <div className="justify-self-center flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (editId) window.history.back();
                        else
                          activeTab === "master"
                            ? router.push("/")
                            : handleBack();
                      }}
                      disabled={isSubmitting}
                      className="bg-[#FFFEFF] text-black hover:bg-gray-100 w-32 h-12 text-xl font-bold"
                    >
                      {editId || activeTab === "master" ? "Cancel" : "Back"}
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-[#2186F3] text-white hover:bg-blue-600 w-32 h-12 text-xl font-bold"
                    >
                      {isSubmitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {isEditMode || !!editId ? "Update" : "Save"}
                    </Button>
                  </div>
                  <div className="justify-self-end">
                    {!editId && activeTab !== "sat3" && (
                      <Button
                        type="button"
                        onClick={handleNext}
                        disabled={isSubmitting}
                        className="bg-[#2186F3] text-white hover:bg-blue-600 w-32 h-12 text-xl font-bold"
                      >
                        Next
                      </Button>
                    )}
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      <ImageCropper
        isOpen={showCropper}
        imageSrc={cropImageSrc}
        onClose={() => {
          setShowCropper(false);
          setCropImageSrc(null);
          setCropIndex(null);
        }}
        onCropComplete={handleCropComplete}
      />
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent className="bg-[#030616] border-[1.35px] border-[#374151] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">
              Confirm {editId ? "Update" : "Registration"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to {editId ? "update" : "register"} these
              sensors? This action will save the configuration to the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-[1.35px] border-[#374151] text-white hover:bg-[#374151]/50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#2186F3] text-white hover:bg-blue-600"
              onClick={() => {
                if (pendingValues) handleRealSubmit(pendingValues);
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  );
}
