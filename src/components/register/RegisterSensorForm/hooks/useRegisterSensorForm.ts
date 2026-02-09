import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import {
  getStoredAreas,
  getStoredInstallationPoints,
  getStoredMachineNames,
  getStoredMachineNos,
  getStoredSensorNames,
  storeArea,
  storeInstallationPoint,
  storeMachineName,
  storeMachineNo,
  storeSensorName,
} from "@/lib/registerStorage";
import { getMachineClassCode } from "@/lib/iso10816-3";
import { uploadSensorImage } from "@/lib/utils";
import { formSchema, FormValues, SingleSensorValues } from "../schema";
import { parseCustomDate, formatMotorStartTime } from "../utils";

const DEFAULT_SENSOR_VALUES: SingleSensorValues = {
  serialNumber: "",
  area: "",
  motorStartTime: new Date(),
  machine: "",
  machineNo: "",
  installationPoint: "",
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
  lor: "6400",
  frequencyMax: "10000",
  temperatureThresholdMax: "",
  highPass: "",
  motorType: "",
  namePlaceWarningThreshold: "",
  namePlaceConcernThreshold: "",
  namePlaceDamageThreshold: "",
  name: "",
  id: "",
};

export function useRegisterSensorForm() {
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
  const [pendingValues, setPendingValues] = useState<FormValues | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [areaSuggestions, setAreaSuggestions] = useState<string[]>([]);
  const [machineNameSuggestions, setMachineNameSuggestions] = useState<
    string[]
  >([]);
  const [machineNoSuggestions, setMachineNoSuggestions] = useState<string[]>(
    []
  );
  const [installationPointSuggestions, setInstallationPointSuggestions] =
    useState<string[]>([]);
  const [sensorNameSuggestions, setSensorNameSuggestions] = useState<string[]>(
    []
  );

  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get("id");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sensors: [
        {
          ...DEFAULT_SENSOR_VALUES,
          sensorType: "Master",
          notes: "Master Sensor",
        },
        {
          ...DEFAULT_SENSOR_VALUES,
          sensorType: "Satellite",
          notes: "Satellite 1",
        },
        {
          ...DEFAULT_SENSOR_VALUES,
          sensorType: "Satellite",
          notes: "Satellite 2",
        },
        {
          ...DEFAULT_SENSOR_VALUES,
          sensorType: "Satellite",
          notes: "Satellite 3",
        },
      ],
    },
  });

  useEffect(() => {
    setAreaSuggestions(getStoredAreas());
    setMachineNameSuggestions(getStoredMachineNames());
    setMachineNoSuggestions(getStoredMachineNos());
    setInstallationPointSuggestions(getStoredInstallationPoints());
    setSensorNameSuggestions(getStoredSensorNames());
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  const fetchSensorData = useCallback(async () => {
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
          machineNo: data.machine_no || "",
          installationPoint: data.installation_point || "",
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
          lor: data.lor?.toString() || "6400",
          frequencyMax: data.fmax?.toString() || "10000",
          temperatureThresholdMax:
            data.temperature_threshold_max?.toString() || "",
          highPass: data.high_pass?.toString() || "8",
          motorType: "",
          notes: data.note || "",
          name: data.sensor_name || data.name || "",
          sensorType: data.sensor_type || "Master",
        };

        form.reset({
          sensors: [
            { ...DEFAULT_SENSOR_VALUES, ...mappedSensor },
            {
              ...DEFAULT_SENSOR_VALUES,
              sensorType: "Satellite",
              notes: "Satellite 1",
            },
            {
              ...DEFAULT_SENSOR_VALUES,
              sensorType: "Satellite",
              notes: "Satellite 2",
            },
            {
              ...DEFAULT_SENSOR_VALUES,
              sensorType: "Satellite",
              notes: "Satellite 3",
            },
          ],
        });
      }
    } catch (error) {
      console.error("Error fetching sensor data:", error);
    }
  }, [editId, form]);

  useEffect(() => {
    fetchSensorData();
  }, [fetchSensorData]);

  const handleImageChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCropImageSrc(e.target?.result as string);
        setCropIndex(index);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    if (cropIndex === null) return;
    const croppedFile = new File([croppedBlob], `sensor_${cropIndex}.jpg`, {
      type: "image/jpeg",
    });
    setSelectedImages((prev) => ({ ...prev, [cropIndex]: croppedFile }));
    setImagePreviews((prev) => ({
      ...prev,
      [cropIndex]: URL.createObjectURL(croppedBlob),
    }));
    setShowCropper(false);
    setCropImageSrc(null);
    setCropIndex(null);
  };

  const handleNext = () => {
    const tabs = ["master", "sat1", "sat2", "sat3"];
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    if (editId) {
      window.history.back();
      return;
    }

    if (activeTab === "master") {
      router.push("/");
      return;
    }

    const tabs = ["master", "sat1", "sat2", "sat3"];
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1]);
    }
  };

  const onSubmit = (values: FormValues) => {
    setPendingValues(values);
    setIsConfirmOpen(true);
  };

  const handleRealSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    if (isEditMode || !!editId) {
      try {
        const updates = values.sensors
          .filter((s) => s.serialNumber && s.serialNumber.trim() !== "")
          .map(async (sensorData, index) => {
            if (sensorData.area) storeArea(sensorData.area);
            if (sensorData.machine) storeMachineName(sensorData.machine);
            if (sensorData.machineNo) storeMachineNo(sensorData.machineNo);
            if (sensorData.installationPoint)
              storeInstallationPoint(sensorData.installationPoint);
            if (sensorData.name) storeSensorName(sensorData.name);
            const targetId = sensorData.id || (index === 0 ? editId : null);
            if (!targetId)
              return {
                success: false,
                name: sensorData.serialNumber,
                error: "Missing ID",
              };

            const payload = {
              area: sensorData.area?.toUpperCase(),
              machine_class:
                sensorData.machineClassEnabled && sensorData.machineClass
                  ? (getMachineClassCode(sensorData.machineClass) ?? null)
                  : null,
              machine: sensorData.machine?.toUpperCase(),
              machine_no: sensorData.machineNo?.toUpperCase(),
              installation_point: sensorData.installationPoint?.toUpperCase(),
              sensor_name: sensorData.name?.toUpperCase(),
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
        if (sensorData.machineNo) storeMachineNo(sensorData.machineNo);
        if (sensorData.installationPoint)
          storeInstallationPoint(sensorData.installationPoint);
        if (sensorData.name) storeSensorName(sensorData.name);

        return {
          mac_address: sensorData.serialNumber?.toUpperCase(),
          area: sensorData.area?.toUpperCase(),
          machine_class:
            sensorData.machineClassEnabled && sensorData.machineClass
              ? (getMachineClassCode(sensorData.machineClass) ?? null)
              : null,
          machine: sensorData.machine?.toUpperCase(),
          machine_no: sensorData.machineNo?.toUpperCase(),
          installation_point: sensorData.installationPoint?.toUpperCase(),
          sensor_name: sensorData.name?.toUpperCase(),
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

  const handleReset = () => {
    form.reset({
      sensors: [
        {
          ...DEFAULT_SENSOR_VALUES,
          sensorType: "Master",
          notes: "Master Sensor",
        },
        {
          ...DEFAULT_SENSOR_VALUES,
          sensorType: "Satellite",
          notes: "Satellite 1",
        },
        {
          ...DEFAULT_SENSOR_VALUES,
          sensorType: "Satellite",
          notes: "Satellite 2",
        },
        {
          ...DEFAULT_SENSOR_VALUES,
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
      description: "All fields have been reset to default values.",
    });
  };

  return {
    form,
    activeTab,
    setActiveTab,
    isSubmitting,
    imagePreviews,
    areaSuggestions,
    machineNameSuggestions,
    machineNoSuggestions,
    installationPointSuggestions,
    sensorNameSuggestions,
    showCropper,
    setShowCropper,
    cropImageSrc,
    setCropImageSrc,
    setCropIndex,
    isConfirmOpen,
    setIsConfirmOpen,
    pendingValues,
    isEditMode,
    editId,
    handleImageChange,
    handleCropComplete,
    handleNext,
    handleBack,
    handleReset,
    onSubmit,
    handleRealSubmit,
  };
}
