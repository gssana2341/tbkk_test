export interface Sensor {
  id: string;
  organizationId?: string;
  organizationName?: string;
  branchId?: string;
  branchName?: string;
  locationId?: string;
  location?: string;
  machineId?: string;
  machineName?: string;
  name: string;
  sensor_name?: string;
  sensor_type?: string;
  model?: string;
  serialNumber?: string;
  machine_no?: string;
  installed_point?: string;
  machine_class?: string;
  fmax?: number;
  lor?: number;
  g_scale?: number;
  time_interval?: number;
  alarm_ths?: number;
  threshold_min?: number;
  threshold_medium?: number;
  threshold_max?: number;
  installationDate?: string;
  connectivity?: "online" | "offline";
  operationalStatus?: "active" | "standby" | "maintenance";
  area?: string | null;
  machine?: string | null;
  motor_start_time?: string | null;
  lastSeen?: string;
  battery_level?: number;
  updated_at?: string;
  temperature_threshold_min?: number;
  temperature_threshold_max?: number;
}

export interface SensorLastData {
  id: string;
  name: string;
  sensor_name?: string | null;
  sensor_type: string | null;
  unit: string | null;
  fmax: number;
  lor: number;
  g_scale: number;
  high_pass: number;
  time_interval: number;
  // Config fields
  machine_no?: string | null;
  machine_class?: string | null;
  installed_point?: string | null;
  note?: string | null;
  area?: string | null;
  machine?: string | null;
  threshold_min?: number;
  threshold_medium?: number;
  threshold_max?: number;
  alarm_ths?: number;
  temperature_threshold_min?: number;
  temperature_threshold_max?: number;
  image_url?: string | null;
  data: {
    datetime: string;
    acc_h?: number[];
    freq_h?: number[];
    acc_v?: number[];
    freq_v?: number[];
    acc_a?: number[];
    freq_a?: number[];
    velo_rms_h?: number;
    velo_rms_v?: number;
    velo_rms_a?: number;
    temperature?: number;
    battery?: number;
    rssi?: number;
    level_vibration?: number;
    level_temperature?: number;
    // For /sensors/with-last-data response format
    last_32_h?: number[][];
    last_32_v?: number[][];
    last_32_a?: number[][];
    f_point_h?: number[];
    f_point_v?: number[];
    f_point_a?: number[];
    g_rms_h?: number;
    g_rms_v?: number;
    g_rms_a?: number;
    a_rms_h?: number;
    a_rms_v?: number;
    a_rms_a?: number;
    // New array fields
    a_h_data?: number[];
    a_v_data?: number[];
    a_a_data?: number[];
    v_h_data?: number[];
    v_v_data?: number[];
    v_a_data?: number[];
  };
}

export interface WithLastDataSensor {
  id: string;
  name?: string;
  sensor_name?: string | null;
  sensor_type?: string | null;
  unit?: string | null;
  fmax?: number;
  lor?: number;
  g_scale?: number;
  high_pass?: number;
  time_interval?: number;
  machine_no?: string | null;
  machine_class?: string | null;
  installed_point?: string | null;
  note?: string | null;
  area?: string | null;
  machine?: string | null;
  threshold_min?: number;
  threshold_medium?: number;
  threshold_max?: number;
  alarm_ths?: number;
  temperature_threshold_min?: number;
  temperature_threshold_max?: number;
  image_url?: string | null;
  last_data?: {
    datetime?: string;
    acc_h?: number[];
    freq_h?: number[];
    acc_v?: number[];
    freq_v?: number[];
    acc_a?: number[];
    freq_a?: number[];
    velo_rms_h?: number;
    velo_rms_v?: number;
    velo_rms_a?: number;
    temperature?: number;
    battery?: number;
    rssi?: number;
    level_vibration?: number;
    level_temperature?: number;
    last_32_h?: number[][];
    last_32_v?: number[][];
    last_32_a?: number[][];
    f_point_h?: number[];
    f_point_v?: number[];
    f_point_a?: number[];
    g_rms_h?: number;
    g_rms_v?: number;
    g_rms_a?: number;
    a_rms_h?: number;
    a_rms_v?: number;
    a_rms_a?: number;
    a_h_data?: number[];
    a_v_data?: number[];
    a_a_data?: number[];
    v_h_data?: number[];
    v_v_data?: number[];
    v_a_data?: number[];
  };
}

export interface ChartTimeData {
  labels: string[];
  rmsValue: string;
  peakValue: string;
  peakToPeakValue: string;
  datasets: Array<{
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    tension: number;
    pointRadius: number;
  }>;
}

export interface ChartFreqData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    tension: number;
    pointRadius: number | number[];
    pointBackgroundColor: string[];
  }>;
}

export interface ChartConfigData {
  lor: number;
  fmax: number;
  g_scale: number;
}

export interface SensorPageConfig {
  serialNumber: string;
  sensorName: string;
  machineNumber: string;
  installationPoint: string;
  machineClass: string;
  fmax: number;
  lor: number;
  g_scale: number;
  time_interval: number;
  alarm_ths: number;
  thresholdMin: string | number;
  thresholdMedium: string | number;
  thresholdMax: string | number;
  temperature_threshold_min?: number;
  temperature_threshold_max?: number;
  notes: string;
  image_url: string;
  hAxisEnabled: boolean;
  vAxisEnabled: boolean;
  aAxisEnabled: boolean;
}

export interface AxisStats {
  accelTopPeak: string;
  accelMmPerS2?: string;
  velocityTopPeak: string;
  dominantFreq: string;
  topPeaks?: {
    G: any[];
    mmPerS2: any[];
    mmPerS: any[];
  };
}
