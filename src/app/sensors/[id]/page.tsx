"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, MoreVertical, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatThaiDate, formatDate } from "@/lib/utils";
import { exportToCSV, exportToExcel } from "@/lib/exportUtils";
import * as htmlToImage from "html-to-image";
import jsPDF from "jspdf";
import dynamic from "next/dynamic";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
// Import calculation functions from utility
import {
  accelerationGToMmPerSecSquared,
  calculateVelocityFromFrequency,
  findTopPeaks,
  reconstructTimeDomainFromAPI,
  TimeReconstructionRequest,
  calculateFFT,
} from "@/lib/utils/sensorCalculations";
import {
  SensorConfig,
  getVibrationLevelFromConfig,
  getCardBackgroundColor,
} from "@/lib/utils/vibrationUtils";
import { deleteSensor } from "@/lib/data/sensors";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  Sensor,
  SensorLastData,
  SensorPageConfig,
} from "@/lib/types/sensor-data";
import { SensorStatsCards } from "@/components/sensors/detail/SensorStatsCards";
import { SensorInfoSection } from "@/components/sensors/detail/SensorInfoSection";
import { VibrationAnalysisSection } from "@/components/sensors/detail/VibrationAnalysisSection";
import { useSensorDetails } from "@/hooks/useSensorDetails";

export default function SensorDetailPage() {
  const router = useRouter();
  const params = useParams() as { id: string };
  const { toast } = useToast();

  // Client-side only state to prevent SSR hydration issues
  const [mounted, setMounted] = useState(false);

  // Use custom hook for sensor details and data management
  const {
    sensor,
    sensorLastData,
    loading: dataLoading,
    error,
    sensorImage,
    history,
    datetimes,
    sortedDatetimes,
    selectedDatetime,
    setSelectedDatetime,
    configData,
    allChartData,
    xStats,
    yStats,
    zStats,
    fetchSensorLastData,
    setSensorLastData,
    setError,
    fetchSensorData,
  } = useSensorDetails({ sensorId: params.id });

  const [selectedAxis, setSelectedAxis] = useState("H-axis");
  const [selectedUnit, setSelectedUnit] = useState("Acceleration (G)");
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Set mounted state to prevent SSR hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  const vibrationData = useMemo(() => {
    if (dataLoading || !allChartData.hasData) {
      return { hasData: false, timeData: null, freqData: null };
    }
    const axisKey =
      selectedAxis === "H-axis" ? "h" : selectedAxis === "V-axis" ? "v" : "a";
    return allChartData[axisKey]?.[selectedUnit] || { hasData: false };
  }, [allChartData, selectedAxis, selectedUnit, dataLoading]);

  // Use real data if available, otherwise use sensor data or fallback
  const currentData = sensorLastData?.data || {
    temperature: 0,
    h: [0],
    v: [0],
    a: [0],
    battery: sensor?.battery_level || 0,
    datetime: sensor?.updated_at || new Date().toISOString(),
    rssi: 0,
    flag: "",
  };

  const safeTemp = Number(currentData.temperature) || 0;
  const safeBattery = Number(currentData.battery) || 0;

  // Summary log for all axes when data changes
  useEffect(() => {
    if (sensorLastData?.name && !dataLoading) {
      console.log("======================================");
      console.log("=== SENSOR DETAIL PAGE SUMMARY ===");
      console.log("======================================");
      console.log("Sensor Name:", sensorLastData.name);
      console.log("Sensor ID:", sensorLastData.id);
      console.log("--- Config Data ---");
      console.log("Machine Number:", configData.machineNumber);
      console.log("Installation Point:", configData.installationPoint);
      console.log("Machine Class:", configData.machineClass);
      console.log("--- Sensor Data ---");
      console.log("Temperature:", sensorLastData.data.temperature, "°C");
      console.log("Battery:", sensorLastData.data.battery);
      console.log("--- RMS Values (from API) ---");
      console.log("H-axis: velo_rms_h =", sensorLastData.data.velo_rms_h);
      console.log("V-axis: velo_rms_v =", sensorLastData.data.velo_rms_v);
      console.log("A-axis: velo_rms_a =", sensorLastData.data.velo_rms_a);
      console.log("======================================");
    }
  }, [sensorLastData, configData, dataLoading]);

  // Early returns after all hooks
  const handleShare = async () => {
    const shareData = {
      title: `Sensor ${configData.sensorName || configData.serialNumber}`,
      text: `Check out this sensor: ${configData.sensorName || configData.serialNumber}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link Copied",
          description: "Sensor link copied to clipboard.",
        });
      } catch (err) {
        console.error("Failed to copy:", err);
        toast({
          title: "Share Failed",
          description: "Could not copy link to clipboard.",
          variant: "destructive",
        });
      }
    }
  };

  const handleExportCSV = () => {
    const data = vibrationData;
    if (!data.hasData) return;

    const exportData = prepareSensorDetailExport();
    exportToCSV(
      exportData,
      `sensor_data_${params.id}_${new Date().toISOString().split("T")[0]}.csv`
    );
  };

  const handleExportExcel = () => {
    const data = vibrationData;
    if (!data.hasData) return;

    const exportData = prepareSensorDetailExport();
    exportToExcel(
      exportData,
      `sensor_data_${params.id}_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  const prepareSensorDetailExport = () => {
    const data = vibrationData;
    const exportData: any[] = [];

    // 1. Summary Header
    exportData.push({
      Section: "Summary Information",
      Field: "Sensor Name",
      Value: sensorLastData?.name || "",
    });
    exportData.push({
      Section: "",
      Field: "Datetime",
      Value: currentData.datetime,
    });
    exportData.push({
      Section: "",
      Field: "Selected Axis",
      Value: selectedAxis,
    });
    exportData.push({
      Section: "",
      Field: "Selected Unit",
      Value: selectedUnit,
    });
    exportData.push({
      Section: "",
      Field: "Temperature",
      Value: `${safeTemp.toFixed(0)}°C`,
    });
    exportData.push({
      Section: "",
      Field: "Battery",
      Value: `${safeBattery.toFixed(0)}%`,
    });
    exportData.push({
      Section: "",
      Field: "RMS Value",
      Value: data.rmsValue || "",
    });
    exportData.push({
      Section: "",
      Field: "Peak Value",
      Value: data.peakValue || "",
    });
    exportData.push({});

    // 2. Frequency Domain (Top Peaks)
    if (data.topPeaks && data.topPeaks.length > 0) {
      exportData.push({
        Section: "Top 5 Peaks",
        Field: "Frequency (Hz)",
        Value: "Magnitude",
      });
      data.topPeaks.forEach((p: any) => {
        exportData.push({ Section: "", Field: p.frequency, Value: p.rms });
      });
      exportData.push({});
    }

    // 3. Raw Data
    // We'll create a side-by-side export for Time and Frequency domains
    const timeLabels = data.timeData?.labels || [];
    const timeValues = data.timeData?.datasets[0].data || [];
    const freqLabels = data.freqData?.labels || [];
    const freqValues = data.freqData?.datasets[0].data || [];

    const maxLen = Math.max(timeLabels.length, freqLabels.length);

    exportData.push({
      Section: "RAW DATA",
      Field: "Time (s)",
      Value: `Magnitude (${selectedUnit})`,
      Frequency_Hz: "Frequency (Hz)",
      Magnitude: `Magnitude (${selectedUnit})`,
    });

    for (let i = 0; i < maxLen; i++) {
      exportData.push({
        Section: "",
        Field: timeLabels[i] || "",
        Value: timeValues[i] != null ? timeValues[i] : "",
        Frequency_Hz: freqLabels[i] || "",
        Magnitude: freqValues[i] != null ? freqValues[i] : "",
      });
    }

    return exportData;
  };

  const handlePrintReport = async () => {
    if (!printRef.current) return;
    setIsPrinting(true);
    toast({
      title: "Generating PDF",
      description: "Please wait while we prepare your report...",
    });

    try {
      // Small delay to ensure all charts are rendered
      await new Promise((resolve) => setTimeout(resolve, 800));

      const dataUrl = await htmlToImage.toPng(printRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: "#0B1121",
        style: {
          borderRadius: "0",
        },
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(
        `sensor_report_${params.id}_${new Date().toISOString().split("T")[0]}.pdf`
      );

      toast({
        title: "PDF Generated",
        description: "Your report has been downloaded.",
      });
    } catch (err) {
      console.error("PDF Generation failed:", err);
      toast({
        title: "Report Failed",
        description:
          "Could not generate PDF report. " +
          (err instanceof Error ? err.message : ""),
        variant: "destructive",
      });
    } finally {
      setIsPrinting(false);
    }
  };

  if (!mounted || dataLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0B1121]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!sensor) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#0B1121] text-white">
        <h2 className="text-2xl font-bold">Sensor not found</h2>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/")}
        >
          Back to Sensors
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1121] text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center">
          <Button
            variant="outline"
            size="sm"
            className="mr-4 bg-transparent border-[1.35px] border-[#374151] hover:bg-[#374151]/50"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sensor
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              Sensor:{" "}
              {sensorLastData?.name ||
                sensor.name ||
                configData.serialNumber ||
                "Unnamed Sensor"}
            </h1>
            <p className="text-sm text-gray-500">
              MAC:{" "}
              {sensorLastData?.mac_address || configData.mac_address || "-"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="bg-transparent border-[1.35px] border-[#374151] hover:bg-[#374151]/50"
            onClick={() => router.push(`/sensors/${sensor.id}/history`)}
          >
            View History
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="bg-transparent border-[1.35px] border-[#374151] hover:bg-[#374151]/50"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-[#0B1121] border-[1.35px] border-[#374151]"
            >
              {(user?.role?.toLowerCase() === "admin" ||
                user?.role?.toLowerCase() === "editor") && (
                  <DropdownMenuItem
                    className="text-white"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      router.push("/register");
                    }}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Configure Sensor
                  </DropdownMenuItem>
                )}
              <DropdownMenuItem
                className="text-white cursor-pointer"
                onClick={handleExportCSV}
              >
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-white cursor-pointer"
                onClick={handleExportExcel}
              >
                Export Excel
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-white cursor-pointer"
                onClick={handlePrintReport}
                disabled={isPrinting}
              >
                {isPrinting ? "Generating..." : "Print Report"}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-white cursor-pointer"
                onClick={handleShare}
              >
                Share
              </DropdownMenuItem>
              {(user?.role?.toLowerCase() === "admin" ||
                user?.role?.toLowerCase() === "editor") && (
                  <DropdownMenuItem
                    className="text-red-500 cursor-pointer"
                    onSelect={(e) => {
                      e.preventDefault();
                      console.log("Delete selected for sensor:", params.id);

                      setTimeout(async () => {
                        if (
                          confirm(
                            "Are you sure you want to delete this sensor? This action cannot be undone."
                          )
                        ) {
                          console.log("User confirmed delete");
                          const success = await deleteSensor(params.id);
                          console.log("Delete result:", success);
                          if (success) {
                            router.push("/");
                          } else {
                            alert("Failed to delete sensor");
                          }
                        } else {
                          console.log("User cancelled delete");
                        }
                      }, 0);
                    }}
                  >
                    Delete
                  </DropdownMenuItem>
                )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main content */}
      <div className="p-4 space-y-4" ref={printRef}>
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-2 rounded-md mb-4">
            {error}. Using fallback data.
          </div>
        )}
        {/* Statistics and Analysis */}
        <SensorStatsCards
          safeTemp={safeTemp}
          configData={configData}
          xStats={xStats}
          yStats={yStats}
          zStats={zStats}
        />

        <SensorInfoSection
          sensor={sensor}
          configData={configData}
          sensorImage={sensorImage}
          user={user}
          router={router}
          params={params}
          currentData={currentData}
          safeBattery={safeBattery}
          sensorLastData={sensorLastData}
          sortedDatetimes={sortedDatetimes}
          selectedDatetime={selectedDatetime}
          setSelectedDatetime={setSelectedDatetime}
          fetchSensorLastData={async (id, dt) => {
            const res = await fetchSensorLastData(id, dt);
            if (res) setSensorLastData(res);
            return res;
          }}
          setSensorLastData={setSensorLastData}
          setError={setError}
          history={history}
          selectedAxis={selectedAxis}
          selectedUnit={selectedUnit}
        />

        <VibrationAnalysisSection
          configData={configData}
          selectedAxis={selectedAxis}
          setSelectedAxis={setSelectedAxis}
          selectedUnit={selectedUnit}
          setSelectedUnit={setSelectedUnit}
          vibrationData={vibrationData}
          history={history}
          allChartData={allChartData}
        />
      </div>
    </div>
  );
}
