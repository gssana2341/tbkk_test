export type SensorStatus =
  | "ok"
  | "warning"
  | "critical"
  | "concern"
  | "standby"
  | "lost";

export interface SensorReading {
  timestamp: number;
  temperature: number;
  vibrationX: number;
  vibrationY: number;
  vibrationZ: number;
  // Optional fields for displaying sensor metadata
  temperatureStatusClass?: string;
  temperatureStatusLabel?: string;
  temperatureBarClass?: string;
  temperatureBarWidth?: string;
  vibrationStatusClass?: string;
  vibrationStatusLabel?: string;
  vibrationXBarClass?: string;
  vibrationXBarWidth?: string;
  vibrationYBarClass?: string;
  vibrationYBarWidth?: string;
  vibrationZBarClass?: string;
  vibrationZBarWidth?: string;
}

// Authentication types
export interface User {
  id: string;
  name: string;
  email: string;
  org_code: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  status?: string;
  role?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  message?: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  org_code: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthError {
  message: string;
  field?: string;
}

// New interface for the updated API structure
export interface SensorApiData {
  id: string;
  name: string;
  sensor_name: string | null;
  sensor_type: string | null;
  unit: string | null;
  fmax?: number;
  lor?: number;
  g_scale?: number;
  alarm_ths?: number;
  time_interval?: number;
  created_at: string;
  updated_at: string;
  machine_id: string | null;
  machine_no?: string | null;
  machine_class?: string | null;
  threshold_min?: number;
  threshold_medium?: number;
  threshold_max?: number;
  installed_point?: string | null;
  area?: string | null;
  machine?: string | null;
  motor_start_time?: string | null;
  note?: string | null;
  temperature_threshold_min?: number;
  temperature_threshold_max?: number;
  last_data: {
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
    temperature: number;
    battery: number;
    rssi: number;
    level_vibration?: number;
    level_temperature?: number;
    last_32_h?: number[][];
    last_32_v?: number[][];
    last_32_a?: number[][];
  };
}

export interface Sensor {
  id: string;
  serialNumber: string;
  machineName: string;
  sensor_type: string; // Master/Satellite
  location: string;
  installationDate: number;
  lastUpdated: number;
  readings: SensorReading[];
  status: SensorStatus;
  maintenanceHistory: {
    date: number;
    description: string;
    technician?: string;
    type?: string;
    partsReplaced?: string;
  }[];
  // Optional fields for displaying sensor metadata
  latestReading?: SensorReading;
  lastUpdatedString?: string;
  installationDateString?: string;
  // New fields for card display
  name: string;
  model: string;
  operationalStatus: "running" | "standby" | "alarm";
  batteryLevel: number;
  connectivity: "online" | "offline";
  signalStrength: number;
  vibrationH: "normal" | "warning" | "critical";
  vibrationV: "normal" | "warning" | "critical";
  vibrationA: "normal" | "warning" | "critical";
  area?: string | null;
  machine?: string | null;
  motor_start_time?: string | null;
  // Store raw API data
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
    h?: number[];
    v?: number[];
    a?: number[];
    last_32_h?: number[][];
    last_32_v?: number[][];
    last_32_a?: number[][];
    [key: string]: unknown;
  };
  // Store calculated H, V, A statistics
  h_stats?: {
    accelTopPeak: string;
    velocityTopPeak: string;
    dominantFreq: string;
  };
  v_stats?: {
    accelTopPeak: string;
    velocityTopPeak: string;
    dominantFreq: string;
  };
  a_stats?: {
    accelTopPeak: string;
    velocityTopPeak: string;
    dominantFreq: string;
  };
  // New API configuration fields
  fmax?: number;
  lor?: number;
  g_scale?: number;
  alarm_ths?: number;
  time_interval?: number;
  // Threshold configuration fields
  threshold_min?: number;
  threshold_medium?: number;
  threshold_max?: number;
  machine_class?: string | null;
  machine_number?: string | null;
  installation_point?: string | null;
  sensor_name?: string | null;
  image_url?: string | null;
  temperature_threshold_min?: number;
  temperature_threshold_max?: number;
}

export interface Machine {
  id: string;
  name: string;
  type: string;
  location: string;
  installationDate: number;
  sensors: string[];
  status: "operational" | "maintenance" | "offline" | "warning";
  lastMaintenance?: number;
  nextMaintenance?: number;
  model?: string;
  manufacturer?: string;
}

export interface Alert {
  id: string;
  sensorId: string;
  type: "temperature" | "vibration" | "connectivity" | "battery";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  timestamp: number;
  acknowledged: boolean;
  resolvedAt?: number;
}

export interface SensorFilters {
  status?: "all" | "ok" | "warning" | "critical";
  search?: string;
  page?: number;
  limit?: number;
}

export interface SensorSummary {
  totalSensors: number;
  activeSensors: number;
  criticalAlerts: number;
  criticalAlertsChange: number;
  warningAlerts: number;
  warningAlertsChange: number;
  avgTemperature: number;
  minTemperature: number;
  maxTemperature: number;
  avgVibration: {
    x: number;
    y: number;
    z: number;
  };
  temperatureData: Array<{
    name: string;
    min: number;
    avg: number;
    max: number;
  }>;
  vibrationData: Array<{
    name: string;
    x: number;
    y: number;
    z: number;
  }>;
}

// Settings types
export interface SystemSettings {
  id?: string;
  system_name: string;
  timezone: string;
  date_format: string;
  temperature_unit: "celsius" | "fahrenheit";
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  organization_id?: string;
}

export interface DisplaySettings {
  id?: string;
  auto_refresh: boolean;
  refresh_interval: number; // in seconds
  show_grid_lines: boolean;
  show_tooltips: boolean;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  organization_id?: string;
}

export interface Settings {
  system: SystemSettings;
  display: DisplaySettings;
}

export interface SettingsResponse {
  settings: Settings;
  message?: string;
}

// Notification Settings types
export interface EmailNotificationSettings {
  id?: string;
  enabled: boolean;
  recipients: string; // comma-separated email addresses
  sender_email: string;
  critical_alerts: boolean;
  warning_alerts: boolean;
  info_alerts: boolean;
  daily_reports: boolean;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  organization_id?: string;
}

export interface SmsNotificationSettings {
  id?: string;
  enabled: boolean;
  phone_numbers: string; // comma-separated phone numbers
  provider: "twilio" | "aws-sns" | "custom";
  critical_alerts: boolean;
  warning_alerts: boolean;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  organization_id?: string;
}

export interface WebhookNotificationSettings {
  id?: string;
  enabled: boolean;
  webhook_url: string;
  webhook_secret?: string;
  payload_format: "json" | "xml" | "form";
  custom_template?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  organization_id?: string;
}

export interface NotificationSettings {
  email: EmailNotificationSettings;
  sms: SmsNotificationSettings;
  webhook: WebhookNotificationSettings;
}

export interface NotificationSettingsResponse {
  settings: NotificationSettings;
  message?: string;
}

// Threshold Settings types
export interface TemperatureThresholds {
  warning: number; // in Celsius
  critical: number; // in Celsius
}

export interface VibrationThresholds {
  warning: number;
  critical: number;
  x_axis_warning?: number;
  y_axis_warning?: number;
  z_axis_warning?: number;
}

export interface MachineThresholdOverride {
  id?: string;
  machine_id?: string;
  machine_name?: string;
  machine_class?: string;
  temperature_warning?: number;
  temperature_critical?: number;
  vibration_warning?: number;
  vibration_critical?: number;
  created_at?: string;
  updated_at?: string;
  organization_id?: string;
}

export interface ThresholdSettings {
  temperature: TemperatureThresholds;
  vibration: VibrationThresholds;
  machine_overrides: MachineThresholdOverride[];
}

export interface ThresholdSettingsResponse {
  settings: ThresholdSettings;
  message?: string;
}

// User Profile types
export interface UserProfile {
  id?: string;
  user_id?: string;
  avatar_url?: string;
  job_title?: string;
  department?: string;
  phone_number?: string;
  bio?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserSecuritySettings {
  id?: string;
  user_id?: string;
  two_factor_enabled: boolean;
  two_factor_secret?: string;
  two_factor_backup_codes?: string[];
  session_timeout_minutes: number | null; // null = never
  last_password_change?: string;
  password_reset_token?: string;
  password_reset_expires?: string;
  failed_login_attempts?: number;
  account_locked_until?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfileResponse {
  user: {
    id: string;
    name: string;
    email: string;
    organization_id?: string;
    org_code?: string;
    role?: string;
    avatar_url?: string;
    job_title?: string;
    department?: string;
    phone_number?: string;
    bio?: string;
    two_factor_enabled?: boolean;
    session_timeout_minutes?: number | null;
    created_at?: string;
    updated_at?: string;
  };
  message?: string;
}

export interface UserProfileUpdateRequest {
  name?: string;
  avatar_url?: string;
  job_title?: string;
  department?: string;
  phone_number?: string;
  bio?: string;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface SecuritySettingsUpdateRequest {
  two_factor_enabled?: boolean;
  session_timeout_minutes?: number | null;
}

export interface TwoFactorEnableResponse {
  secret: string;
  qr_code_url: string;
  backup_codes: string[];
  message?: string;
}

export interface TwoFactorDisableRequest {
  password: string;
}

// System Settings types
export interface SystemInfo {
  id?: string;
  system_name: string;
  system_version: string;
  organization_id?: string;
  organization_name?: string;
  last_updated?: string;
  database_status?: string;
  api_status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SystemResources {
  id?: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  cpu_cores?: number;
  total_memory_gb?: number;
  total_disk_gb?: number;
  free_memory_gb?: number;
  free_disk_gb?: number;
  recorded_at?: string;
  created_at?: string;
  organization_id?: string;
}

export interface SystemDataManagementSettings {
  id?: string;
  organization_id?: string;
  user_id?: string;
  sensor_data_retention_days: number | null; // null = forever
  alert_history_retention_days: number | null; // null = forever
  automated_backups_enabled: boolean;
  backup_frequency: "hourly" | "daily" | "weekly" | "monthly";
  backup_retention_count: number;
  last_backup_time?: string;
  last_backup_status?: string;
  last_backup_size_mb?: number;
  next_backup_time?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BackupHistory {
  id: string;
  organization_id?: string;
  backup_type: "full" | "incremental" | "differential";
  backup_status: "success" | "failed" | "in_progress" | "cancelled";
  backup_size_mb?: number;
  backup_location?: string;
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  error_message?: string;
  created_at?: string;
}

export interface SystemInfoResponse {
  system: SystemInfo;
  message?: string;
}

export interface SystemResourcesResponse {
  resources: SystemResources;
  message?: string;
}

export interface SystemDataManagementResponse {
  settings: SystemDataManagementSettings;
  message?: string;
}

export interface BackupRunRequest {
  backup_type?: "full" | "incremental" | "differential";
}

export interface BackupRunResponse {
  backup: BackupHistory;
  message?: string;
}

export interface BackupHistoryResponse {
  backups: BackupHistory[];
  total: number;
  limit: number;
  offset: number;
}

export interface BackupSummaryResponse {
  summary: {
    organization_id?: string;
    total_backups: number;
    successful_backups: number;
    failed_backups: number;
    last_backup_time?: string;
    avg_backup_size_mb?: number;
    avg_duration_seconds?: number;
  };
}

export interface UserAdminResponse {
  id: string;
  name: string;
  email: string;
  organization_id: string;
  org_code: string;
  role: string;
  status: string;
  created_at?: string;
  updated_at?: string;
  last_login?: string; // Added to match UI requirements
}

// Notification Logs types
export interface NotificationLog {
  id: string;
  sensor_id: string;
  organization_id: string | null;
  status: string;
  alert_type: string;
  sensor_name: string;
  area: string;
  machine: string;
  datetime: string;
  h_vrms: number;
  v_vrms: number;
  a_vrms: number;
  temperature: number;
  battery: number;
  threshold_min: number | null;
  threshold_medium: number | null;
  threshold_max: number | null;
  h_vrms_color: number;
  v_vrms_color: number;
  a_vrms_color: number;
  is_read: boolean;
  read_at: string | null;
  read_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationLogsResponse {
  data: NotificationLog[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
