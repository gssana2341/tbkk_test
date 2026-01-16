import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Sensor,
  SensorLastData,
  SensorPageConfig,
  WithLastDataSensor,
  ChartConfigData,
  ChartTimeData,
  ChartFreqData,
} from "@/lib/types/sensor-data";
import {
  prepareCombinedSortedData,
  prepareChartData,
} from "@/lib/utils/sensor-charts";
import {
  accelerationGToMmPerSecSquared,
  calculateVelocityFromFrequency,
} from "@/lib/utils/sensorCalculations";

interface UseSensorDetailsProps {
  sensorId: string;
}

export function useSensorDetails({ sensorId }: UseSensorDetailsProps) {
  const [sensor, setSensor] = useState<Sensor | null>(null);
  const [sensorLastData, setSensorLastData] = useState<SensorLastData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sensorImage, setSensorImage] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [datetimes, setDatetimes] = useState<string[]>([]);
  const [selectedDatetime, setSelectedDatetime] = useState<string | null>(null);

  const [configData, setConfigData] = useState<SensorPageConfig>({
    serialNumber: "",
    sensorName: "",
    machineNumber: "",
    installationPoint: "",
    machineClass: "",
    fmax: 10000,
    lor: 6400,
    g_scale: 16,
    time_interval: 3,
    alarm_ths: 5.0,
    thresholdMin: "2.0",
    thresholdMedium: "4.5",
    thresholdMax: "9.0",
    notes: "",
    image_url: "",
    hAxisEnabled: true,
    vAxisEnabled: true,
    aAxisEnabled: true,
  });

  const sortedDatetimes = useMemo(
    () =>
      [...datetimes].sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
      ),
    [datetimes]
  );

  const fetchSensorHistory = useCallback(async (id: string) => {
    try {
      const token = localStorage.getItem("auth_token");
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/sensors/${id}/history?limit=10`;
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        const data = await response.json();
        let historyData = [];
        if (Array.isArray(data)) {
          historyData = data;
        } else if (data && Array.isArray(data.history)) {
          historyData = data.history;
        } else if (data && data.data) {
          if (Array.isArray(data.data)) {
            historyData = data.data;
          } else if (Array.isArray(data.data.history)) {
            historyData = data.data.history;
          }
        }
        setHistory(historyData);
      }
    } catch (error) {
      console.error("Failed to fetch sensor history:", error);
    }
  }, []);

  const fetchSensorDetails = useCallback(async (id: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/sensors/${id}`,
        {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSensor(data);
        setConfigData((prev) => ({
          ...prev,
          sensorName: data.name || prev.sensorName,
          machineNumber: data.machine_no || prev.machineNumber,
          installationPoint: data.installed_point || prev.installationPoint,
          machineClass: data.machine_class || prev.machineClass,
          fmax: data.fmax || 10000,
          lor: data.lor || 6400,
          g_scale: data.g_scale || 16,
          time_interval: data.time_interval || 3,
          alarm_ths: data.alarm_ths || 5.0,
          thresholdMin: data.threshold_min || prev.thresholdMin,
          thresholdMedium: data.threshold_medium || prev.thresholdMedium,
          thresholdMax: data.threshold_max || prev.thresholdMax,
          notes: data.note || prev.notes,
          image_url: data.image_url || prev.image_url,
        }));
        return data;
      }
    } catch (error) {
      console.error("Error fetching sensor details:", error);
    }
  }, []);

  const fetchSensorLastData = useCallback(
    async (id: string, datetime?: string) => {
      try {
        const url = datetime
          ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/sensors/${id}/last-data?datetime=${encodeURIComponent(datetime)}`
          : `${process.env.NEXT_PUBLIC_API_BASE_URL}/sensors/${id}/last-data`;

        const token = localStorage.getItem("auth_token");
        const response = await fetch(url, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        console.log(`Fetch last-data status:`, response.status);

        if (response.ok) {
          const data = await response.json();
          console.log("Last data received:", data);
          const transformedData: SensorLastData = {
            id: data.id,
            name: data.name,
            sensor_name: data.sensor_name,
            sensor_type: data.sensor_type,
            unit: data.unit,
            fmax: data.fmax,
            lor: data.lor,
            g_scale: data.g_scale,
            high_pass: data.high_pass || 0,
            time_interval: data.time_interval,
            machine_no: data.machine_no,
            machine_class: data.machine_class,
            installed_point: data.installed_point,
            note: data.note,
            threshold_min: data.threshold_min,
            threshold_medium: data.threshold_medium,
            threshold_max: data.threshold_max,
            alarm_ths: data.alarm_ths,
            image_url: data.image_url,
            data: {
              datetime: data.datetime || data.data?.datetime || "",
              acc_h: data.acc_h || data.data?.acc_h || [],
              freq_h: data.freq_h || data.data?.freq_h || [],
              acc_v: data.acc_v || data.data?.acc_v || [],
              freq_v: data.freq_v || data.data?.freq_v || [],
              acc_a: data.acc_a || data.data?.acc_a || [],
              freq_a: data.freq_a || data.data?.freq_a || [],
              velo_rms_h: data.velo_rms_h || data.data?.velo_rms_h || 0,
              velo_rms_v: data.velo_rms_v || data.data?.velo_rms_v || 0,
              velo_rms_a: data.velo_rms_a || data.data?.velo_rms_a || 0,
              temperature: data.temperature || data.data?.temperature || 0,
              battery: data.battery || data.data?.battery || 0,
              rssi: data.rssi || data.data?.rssi || 0,
              level_vibration:
                data.level_vibration || data.data?.level_vibration,
              level_temperature:
                data.level_temperature || data.data?.level_temperature,
              last_32_h: data.last_32_h || data.data?.last_32_h,
              last_32_v: data.last_32_v || data.data?.last_32_v,
              last_32_a: data.last_32_a || data.data?.last_32_a,
              f_point_h: data.f_point_h || data.data?.f_point_h || [],
              f_point_v: data.f_point_v || data.data?.f_point_v || [],
              f_point_a: data.f_point_a || data.data?.f_point_a || [],
              g_rms_h: data.g_rms_h || data.data?.g_rms_h,
              g_rms_v: data.g_rms_v || data.data?.g_rms_v,
              g_rms_a: data.g_rms_a || data.data?.g_rms_a,
              a_rms_h: data.a_rms_h || data.data?.a_rms_h,
              a_rms_v: data.a_rms_v || data.data?.a_rms_v,
              a_rms_a: data.a_rms_a || data.data?.a_rms_a,
              a_h_data: data.a_h_data || data.data?.a_h_data,
              a_v_data: data.a_v_data || data.data?.a_v_data,
              a_a_data: data.a_a_data || data.data?.a_a_data,
              v_h_data: data.v_h_data || data.data?.v_h_data,
              v_v_data: data.v_v_data || data.data?.v_v_data,
              v_a_data: data.v_a_data || data.data?.v_a_data,
            },
          };
          return transformedData;
        }

        // Fallback
        const tokenFallback = localStorage.getItem("auth_token");
        const withDataResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/sensors/with-last-data`,
          {
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache",
              ...(tokenFallback
                ? { Authorization: `Bearer ${tokenFallback}` }
                : {}),
            },
          }
        );

        if (withDataResponse.ok) {
          const allSensors =
            (await withDataResponse.json()) as WithLastDataSensor[];
          const sensorData = allSensors.find((s) => s.id === id);
          if (sensorData) {
            const transformedData: SensorLastData = {
              id: sensorData.id,
              name:
                sensorData.name ||
                sensorData.sensor_name ||
                sensorData.id ||
                "Unknown Sensor",
              sensor_name: sensorData.sensor_name ?? null,
              sensor_type: sensorData.sensor_type ?? null,
              unit: sensorData.unit ?? null,
              fmax: sensorData.fmax ?? 0,
              lor: sensorData.lor ?? 0,
              g_scale: sensorData.g_scale ?? 16,
              high_pass: sensorData.high_pass || 0,
              time_interval: sensorData.time_interval ?? 0,
              machine_no: sensorData.machine_no,
              machine_class: sensorData.machine_class,
              installed_point: sensorData.installed_point,
              note: sensorData.note,
              threshold_min: sensorData.threshold_min,
              threshold_medium: sensorData.threshold_medium,
              threshold_max: sensorData.threshold_max,
              alarm_ths: sensorData.alarm_ths,
              image_url: sensorData.image_url,
              data: {
                datetime: sensorData.last_data?.datetime || "",
                acc_h: sensorData.last_data?.acc_h,
                freq_h: sensorData.last_data?.freq_h,
                acc_v: sensorData.last_data?.acc_v,
                freq_v: sensorData.last_data?.freq_v,
                acc_a: sensorData.last_data?.acc_a,
                freq_a: sensorData.last_data?.freq_a,
                velo_rms_h: sensorData.last_data?.velo_rms_h,
                velo_rms_v: sensorData.last_data?.velo_rms_v,
                velo_rms_a: sensorData.last_data?.velo_rms_a,
                temperature: sensorData.last_data?.temperature,
                battery: sensorData.last_data?.battery,
                rssi: sensorData.last_data?.rssi,
                level_vibration: sensorData.last_data?.level_vibration,
                level_temperature: sensorData.last_data?.level_temperature,
                last_32_h: sensorData.last_data?.last_32_h,
                last_32_v: sensorData.last_data?.last_32_v,
                last_32_a: sensorData.last_data?.last_32_a,
                f_point_h: sensorData.last_data?.f_point_h,
                f_point_v: sensorData.last_data?.f_point_v,
                f_point_a: sensorData.last_data?.f_point_a,
                g_rms_h: sensorData.last_data?.g_rms_h,
                g_rms_v: sensorData.last_data?.g_rms_v,
                g_rms_a: sensorData.last_data?.g_rms_a,
                a_rms_h: sensorData.last_data?.a_rms_h,
                a_rms_v: sensorData.last_data?.a_rms_v,
                a_rms_a: sensorData.last_data?.a_rms_a,
                a_h_data: sensorData.last_data?.a_h_data,
                a_v_data: sensorData.last_data?.a_v_data,
                a_a_data: sensorData.last_data?.a_a_data,
                v_h_data: sensorData.last_data?.v_h_data,
                v_v_data: sensorData.last_data?.v_v_data,
                v_a_data: sensorData.last_data?.v_a_data,
              },
            };
            return transformedData;
          }
        }
        setError("Sensor not found in API");
        return null;
      } catch (error) {
        console.error("Error fetching sensor last data:", error);
        setError("Failed to fetch sensor data from API");
        return null;
      }
    },
    []
  );

  const fetchSensorConfig = useCallback(async (id: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/sensors/${id}/config`,
        {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        }
      );
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setConfigData((prev) => ({
        ...prev,
        serialNumber: data.serial_number || data.name || prev.serialNumber,
        sensorName: data.sensor_name || data.name || prev.sensorName,
        machineNumber: data.machine_no || prev.machineNumber,
        installationPoint: data.installed_point || prev.installationPoint,
        machineClass: data.machine_class || prev.machineClass,
        fmax: data.fmax || prev.fmax,
        lor: data.lor || prev.lor,
        g_scale: data.g_scale || prev.g_scale || 16,
        time_interval: data.time_interval || prev.time_interval,
        alarm_ths: data.alarm_ths || prev.alarm_ths,
        thresholdMin: data.threshold_min?.toString() || prev.thresholdMin,
        thresholdMedium:
          data.threshold_medium?.toString() || prev.thresholdMedium,
        thresholdMax: data.threshold_max?.toString() || prev.thresholdMax,
        notes: data.note || prev.notes,
        hAxisEnabled: data.h_axis_enabled !== false,
        vAxisEnabled: data.v_axis_enabled !== false,
        aAxisEnabled: data.a_axis_enabled !== false,
        image_url: data.image_url || prev.image_url,
      }));
      return data;
    } catch (error) {
      console.log("Failed to fetch sensor config from API:", error);
      return null;
    }
  }, []);

  const fetchSensorData = useCallback(async () => {
    setLoading(true);
    console.log("fetchSensorData starting for ID:", sensorId);
    try {
      const lastData = await fetchSensorLastData(sensorId);
      if (lastData) {
        setSensorLastData(lastData);
        let config = await fetchSensorConfig(sensorId);

        if (!config || !config.machine_no) {
          try {
            const tokenFallback = localStorage.getItem("auth_token");
            const withDataResponse = await fetch(
              `${process.env.NEXT_PUBLIC_API_BASE_URL}/sensors/with-last-data`,
              {
                cache: "no-store",
                headers: {
                  "Cache-Control": "no-cache",
                  ...(tokenFallback
                    ? { Authorization: `Bearer ${tokenFallback}` }
                    : {}),
                },
              }
            );
            if (withDataResponse.ok) {
              const allSensors =
                (await withDataResponse.json()) as WithLastDataSensor[];
              const sensorData = allSensors.find((s) => s.id === sensorId);
              if (sensorData) {
                config = {
                  machine_no: sensorData.machine_no,
                  installed_point: sensorData.installed_point,
                  machine_class: sensorData.machine_class,
                  note: sensorData.note,
                  sensor_name: sensorData.sensor_name,
                  threshold_min: sensorData.threshold_min,
                  threshold_medium: sensorData.threshold_medium,
                  threshold_max: sensorData.threshold_max,
                  alarm_ths: sensorData.alarm_ths,
                  fmax: sensorData.fmax,
                  lor: sensorData.lor,
                  g_scale: sensorData.g_scale,
                  time_interval: sensorData.time_interval,
                  image_url: sensorData.image_url,
                };
              }
            }
          } catch (err) {
            console.error("Failed to fetch from /sensors/with-last-data:", err);
          }
        }
      }

      await fetchSensorDetails(sensorId);
      await fetchSensorHistory(sensorId);

      const historyUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/sensors/${sensorId}/history?limit=100`;
      const token = localStorage.getItem("auth_token");
      const histResponse = await fetch(historyUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (histResponse.ok) {
        const histData = await histResponse.json();
        console.log("History timestamps fetched:", histData);
        const items = Array.isArray(histData)
          ? histData
          : histData.history || histData.data || [];
        const dts = items.map((item: any) => item.datetime).filter(Boolean);
        setDatetimes(Array.from(new Set(dts)));
      }
    } catch (err) {
      console.error("Error in fetchSensorData:", err);
    } finally {
      setLoading(false);
    }
  }, [
    sensorId,
    fetchSensorLastData,
    fetchSensorConfig,
    fetchSensorDetails,
    fetchSensorHistory,
  ]);

  useEffect(() => {
    let objectUrl: string | null = null;
    const fetchImage = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/sensors/${sensorId}/image`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );
        if (response.ok) {
          const blob = await response.blob();
          if (blob.size > 0) {
            objectUrl = URL.createObjectURL(blob);
            setSensorImage(objectUrl);
          }
        }
      } catch (error) {
        console.error("Failed to fetch sensor image:", error);
      }
    };
    if (sensorId) fetchImage();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sensorId]);

  useEffect(() => {
    if (sensorId) fetchSensorData();
  }, [sensorId, fetchSensorData]);

  // Derived State: Chart calculations
  const allChartData = useMemo(() => {
    if (!sensorLastData?.data) {
      console.log("allChartData: No sensorLastData.data found");
      return { hasData: false, h: {}, v: {}, a: {} };
    }

    const data = sensorLastData.data;
    const hasAccData = Array.isArray(data.acc_h) && data.acc_h.length > 0;
    const hasLast32Data =
      Array.isArray(data.last_32_h) && data.last_32_h.length > 0;
    const hasAHData = Array.isArray(data.a_h_data) && data.a_h_data.length > 0;

    if (!hasAccData && !hasLast32Data && !hasAHData) {
      return { hasData: false, h: {}, v: {}, a: {} };
    }

    // PRIMARY RAW DATA (for Time Domain and Full FFT)
    // We prioritize acc_h/v/a (Raw) or last_32 (Raw segments)
    // If those are missing, we fallback to a_h/v/a_data (which might be raw or condensed spectrum)
    let accHData = hasAccData
      ? data.acc_h || []
      : hasLast32Data
        ? data.last_32_h?.flat() || []
        : data.a_h_data || [];
    let accVData = hasAccData
      ? data.acc_v || []
      : hasLast32Data
        ? data.last_32_v?.flat() || []
        : data.a_v_data || [];
    let accAData = hasAccData
      ? data.acc_a || []
      : hasLast32Data
        ? data.last_32_a?.flat() || []
        : data.a_a_data || [];

    // PRIMARY SPECTRUM DATA (if the API provides a pre-calculated spectrum)
    // We ONLY use this if it's actually frequency magnitude data, not raw signal.
    let freqHData = hasAccData
      ? data.freq_h || []
      : hasAHData
        ? data.f_point_h || []
        : [];
    let freqVData = hasAccData
      ? data.freq_v || []
      : Array.isArray(data.a_v_data) && data.a_v_data.length > 0
        ? data.f_point_v || []
        : [];
    let freqAData = hasAccData
      ? data.freq_a || []
      : Array.isArray(data.a_a_data) && data.a_a_data.length > 0
        ? data.f_point_a || []
        : [];

    // Final fallback if still empty but we have some magnitude data
    if (freqHData.length === 0 && (hasAccData || hasLast32Data || hasAHData)) {
      const magLen = hasAccData
        ? data.acc_h?.length
        : hasLast32Data
          ? data.last_32_h?.flat().length
          : data.a_h_data?.length;
      freqHData = Array.from({ length: magLen || 0 }, (_, i) => i + 1);
    }
    if (
      freqVData.length === 0 &&
      (hasAccData ||
        hasLast32Data ||
        (Array.isArray(data.a_v_data) && data.a_v_data.length > 0))
    ) {
      const magLen = hasAccData
        ? data.acc_v?.length
        : hasLast32Data
          ? data.last_32_v?.flat().length
          : data.a_v_data?.length;
      freqVData = Array.from({ length: magLen || 0 }, (_, i) => i + 1);
    }
    if (
      freqAData.length === 0 &&
      (hasAccData ||
        hasLast32Data ||
        (Array.isArray(data.a_a_data) && data.a_a_data.length > 0))
    ) {
      const magLen = hasAccData
        ? data.acc_a?.length
        : hasLast32Data
          ? data.last_32_a?.flat().length
          : data.a_a_data?.length;
      freqAData = Array.from({ length: magLen || 0 }, (_, i) => i + 1);
    }

    const totalTime = configData.lor / configData.fmax;
    const timeInterval =
      accHData.length > 1 ? totalTime / (accHData.length - 1) : 0;

    const processAxis = (
      accG: number[],
      accMm: number[],
      velMm: number[],
      freqs: number[]
    ) => {
      let finalAccMm = [...accMm];
      let finalVelMm = [...velMm];
      if (finalAccMm.length === 0 && accG.length > 0) {
        finalAccMm = accG.map((g) => accelerationGToMmPerSecSquared(g));
      }
      if (
        finalVelMm.length === 0 &&
        finalAccMm.length > 0 &&
        freqs.length === finalAccMm.length
      ) {
        finalVelMm = finalAccMm.map((a, i) =>
          calculateVelocityFromFrequency(a, freqs[i])
        );
      }
      return { accMm: finalAccMm, velMm: finalVelMm };
    };

    const hResult = processAxis(
      accHData,
      data.a_h_data || [],
      data.v_h_data || [],
      freqHData
    );
    const vResult = processAxis(
      accVData,
      data.a_v_data || [],
      data.v_v_data || [],
      freqVData
    );
    const aResult = processAxis(
      accAData,
      data.a_a_data || [],
      data.v_a_data || [],
      freqAData
    );

    const axes = {
      h: {
        acc_g: accHData,
        acc_mms2: hResult.accMm,
        vel_mms: hResult.velMm,
        freq: freqHData,
        fPoints: data.f_point_h,
        g_rms: data.g_rms_h,
        a_rms: data.a_rms_h,
        velo_rms: data.velo_rms_h,
      },
      v: {
        acc_g: accVData,
        acc_mms2: vResult.accMm,
        vel_mms: vResult.velMm,
        freq: freqVData,
        fPoints: data.f_point_v,
        g_rms: data.g_rms_v,
        a_rms: data.a_rms_v,
        velo_rms: data.velo_rms_v,
      },
      a: {
        acc_g: accAData,
        acc_mms2: aResult.accMm,
        vel_mms: aResult.velMm,
        freq: freqAData,
        fPoints: data.f_point_a,
        g_rms: data.g_rms_a,
        a_rms: data.a_rms_a,
        velo_rms: data.velo_rms_a,
      },
    };

    const units = [
      "Acceleration (G)",
      "Acceleration (mm/s²)",
      "Velocity (mm/s)",
    ];
    const chartConfig: ChartConfigData = {
      lor: configData.lor || sensorLastData.lor || 6400,
      fmax: configData.fmax || sensorLastData.fmax || 10000,
      g_scale: sensorLastData.g_scale || configData.g_scale || 16,
    };

    const result: any = { hasData: true, h: {}, v: {}, a: {} };

    Object.entries(axes).forEach(([axisKey, axisData]) => {
      units.forEach((unit) => {
        let unitMag: number[] = [];
        let rmsOverride: number | undefined;

        if (unit === "Acceleration (G)") {
          unitMag = axisData.acc_g;
          rmsOverride = axisData.g_rms;
        } else if (unit === "Acceleration (mm/s²)") {
          unitMag = axisData.acc_mms2;
          rmsOverride = axisData.a_rms;
        } else if (unit === "Velocity (mm/s)") {
          unitMag = axisData.vel_mms;
          rmsOverride = axisData.velo_rms;
        }

        const freqSrc =
          axisData.fPoints && axisData.fPoints.length > 0
            ? axisData.fPoints
            : axisData.freq;

        // CRITICAL CHANGE:
        // Determine if unitMag is already a spectrum (Frequency Domain) or Time Domain Signal.
        // If it's short (like 10 points), it's definitely a pre-calculated spectrum (Frequency Domain).
        // If it's long (like 6400 points), it's a raw signal (Time Domain) and needs full FFT.
        const isSpectrumData =
          unitMag.length > 0 && unitMag.length <= chartConfig.lor * 0.5;

        let accInput = isSpectrumData ? [] : unitMag;
        let freqInput = isSpectrumData ? unitMag : [];

        result[axisKey][unit] = prepareChartData(
          accInput,
          freqInput,
          unit,
          timeInterval,
          chartConfig,
          freqSrc,
          rmsOverride
        );
      });
    });

    // Ensure root result has hasData if any axis has data
    let anyAxisHasData = false;
    Object.keys(result).forEach((k) => {
      if (k !== "hasData" && result[k]) {
        Object.values(result[k]).forEach((u: any) => {
          if (u?.hasData) anyAxisHasData = true;
        });
      }
    });
    result.hasData = anyAxisHasData;

    // Populate top level properties for the selected one (legacy support for some sub-components)
    // Note: page.tsx currently does: vibrationData = allChartData[selectedAxisKey][selectedUnit]
    // So we don't strictly need these on the root result, but let's keep it safe.

    return result;
  }, [sensorLastData, configData]);

  const xStats = useMemo(() => {
    if (loading || !sensorLastData?.data)
      return {
        accelTopPeak: "0.00",
        velocityTopPeak: "0.00",
        dominantFreq: "0.00",
        topPeaks: { G: [], mmPerS2: [], mmPerS: [] },
      };
    const hData = allChartData.h;
    const data = sensorLastData.data;
    return {
      accelTopPeak: data.g_rms_h?.toFixed(2) || "0.00",
      accelMmPerS2: data.a_rms_h?.toFixed(2) || "0.00",
      velocityTopPeak: data.velo_rms_h?.toFixed(2) || "0.00",
      dominantFreq:
        hData["Velocity (mm/s)"]?.topPeaks?.[0]?.frequency || "0.00",
      topPeaks: {
        G: hData["Acceleration (G)"]?.topPeaks || [],
        mmPerS2: hData["Acceleration (mm/s²)"]?.topPeaks || [],
        mmPerS: hData["Velocity (mm/s)"]?.topPeaks || [],
      },
    };
  }, [allChartData, loading, sensorLastData]);

  const yStats = useMemo(() => {
    if (loading || !sensorLastData?.data)
      return {
        accelTopPeak: "0.00",
        velocityTopPeak: "0.00",
        dominantFreq: "0.00",
        topPeaks: { G: [], mmPerS2: [], mmPerS: [] },
      };
    const vData = allChartData.v;
    const data = sensorLastData.data;
    return {
      accelTopPeak: data.g_rms_v?.toFixed(2) || "0.00",
      accelMmPerS2: data.a_rms_v?.toFixed(2) || "0.00",
      velocityTopPeak: data.velo_rms_v?.toFixed(2) || "0.00",
      dominantFreq:
        vData["Velocity (mm/s)"]?.topPeaks?.[0]?.frequency || "0.00",
      topPeaks: {
        G: vData["Acceleration (G)"]?.topPeaks || [],
        mmPerS2: vData["Acceleration (mm/s²)"]?.topPeaks || [],
        mmPerS: vData["Velocity (mm/s)"]?.topPeaks || [],
      },
    };
  }, [allChartData, loading, sensorLastData]);

  const zStats = useMemo(() => {
    if (loading || !sensorLastData?.data)
      return {
        accelTopPeak: "0.00",
        velocityTopPeak: "0.00",
        dominantFreq: "0.00",
        topPeaks: { G: [], mmPerS2: [], mmPerS: [] },
      };
    const aData = allChartData.a;
    const data = sensorLastData.data;
    return {
      accelTopPeak: data.g_rms_a?.toFixed(2) || "0.00",
      accelMmPerS2: data.a_rms_a?.toFixed(2) || "0.00",
      velocityTopPeak: data.velo_rms_a?.toFixed(2) || "0.00",
      dominantFreq:
        aData["Velocity (mm/s)"]?.topPeaks?.[0]?.frequency || "0.00",
      topPeaks: {
        G: aData["Acceleration (G)"]?.topPeaks || [],
        mmPerS2: aData["Acceleration (mm/s²)"]?.topPeaks || [],
        mmPerS: aData["Velocity (mm/s)"]?.topPeaks || [],
      },
    };
  }, [allChartData, loading, sensorLastData]);

  return {
    sensor,
    sensorLastData,
    loading,
    error,
    setError,
    sensorImage,
    history,
    datetimes,
    sortedDatetimes,
    selectedDatetime,
    setSelectedDatetime,
    configData,
    setConfigData,
    allChartData,
    xStats,
    yStats,
    zStats,
    fetchSensorLastData,
    setSensorLastData,
    fetchSensorData,
  };
}
