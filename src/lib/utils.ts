import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { compressImage } from "./utils/imageUtils";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string, includeTime = false): string {
  if (!dateString) return "N/A";

  try {
    const timestamp = parseThailandTime(dateString);
    const date = new Date(timestamp);

    if (isNaN(date.getTime())) {
      return "Invalid date";
    }

    if (includeTime) {
      return formatToThailandTime(timestamp, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        second: undefined
      });
    }

    return formatToThailandTime(timestamp, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: undefined,
      minute: undefined,
      second: undefined
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Error";
  }
}

export function formatThaiDate(dateString: string | undefined | null): string {
  if (!dateString) return "N/A";
  try {
    const timestamp = parseThailandTime(dateString);
    return formatToThailandTime(timestamp, { second: undefined });
  } catch {
    return "N/A";
  }
}

export function formatRawTime(dateString: string): string {
  if (!dateString) return "N/A";
  try {
    const timestamp = parseThailandTime(dateString);
    return formatToThailandTime(timestamp, { second: undefined });
  } catch (error) {
    console.error("Error formatting raw time:", error);
    return "Error";
  }
}

export function parseThailandTime(dateInput: string | number | undefined | null): number {
  if (!dateInput) return Date.now();
  if (typeof dateInput === "number") return dateInput;
  
  const cleanStr = dateInput.replace("Z", "").trim();
  if (cleanStr.includes("+") || /-\d{2}:\d{2}$/.test(cleanStr)) {
    const parsed = new Date(cleanStr).getTime();
    return isNaN(parsed) ? Date.now() : parsed;
  }
  
  const isoStr = cleanStr.replace(" ", "T");
  const parsed = new Date(`${isoStr}+07:00`).getTime();
  return isNaN(parsed) ? Date.now() : parsed;
}

export function formatToThailandTime(
  dateInput: Date | number | string | undefined | null,
  options: Intl.DateTimeFormatOptions = {}
): string {
  if (!dateInput) return "-";
  let date: Date;
  if (dateInput instanceof Date) {
    date = dateInput;
  } else if (typeof dateInput === "number") {
    date = new Date(dateInput);
  } else {
    date = new Date(parseThailandTime(dateInput));
  }

  if (isNaN(date.getTime())) return "-";

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    ...options
  };

  try {
    return date.toLocaleString("en-GB", defaultOptions);
  } catch (error) {
    return date.toLocaleString("en-GB", { ...defaultOptions, timeZone: undefined });
  }
}

// Generate a random ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Convert RSSI to signal strength level (0-4)
// This function handles both raw dBm values (negative) and pre-calculated levels (0-4)
export function getSignalStrength(rssiInput: number): number {
  const rssi = Number(rssiInput);

  // If rssi is negative, it's likely dBm (dBm values are typically -30 to -100)
  if (rssi < 0) {
    if (rssi >= -70) return 4; // Excellent
    if (rssi >= -80) return 3; // Good
    if (rssi >= -90) return 2; // Fair
    if (rssi >= -100) return 1; // Poor
    return 0; // No Signal
  }

  // If rssi is positive or 0, it's likely already a level (0-4)
  if (rssi === 0) return 0;
  if (rssi <= 1) return 1;
  if (rssi <= 2) return 2;
  if (rssi <= 3) return 3;
  return 4;
}

// Get signal strength label in English
export function getSignalStrengthLabel(rssi: number): string {
  const level = getSignalStrength(rssi);
  switch (level) {
    case 0:
      return "No Signal";
    case 1:
      return "Poor";
    case 2:
      return "Fair";
    case 3:
      return "Good";
    case 4:
      return "Excellent";
    default:
      return "N/A";
  }
}

// Upload sensor image to API
export async function uploadSensorImage(
  sensorId: string,
  imageFile: File
): Promise<{ image_url: string; message: string; status: string }> {
  // Compress image before upload
  const compressedFile = await compressImage(imageFile, 1200, 1200, 0.85);

  const base64Image = await toBase64(compressedFile);
  const contentType = imageFile.type || "image/jpeg";
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  const url = `${"/api"}/sensors/${sensorId}/image`;
  console.log("Uploading image to URL:", url);

  const payload = {
    image_base64: base64Image,
    content_type: contentType,
  };

  // Log payload (truncate base64 for readability)
  console.log("Sending Payload:", {
    ...payload,
    image_base64:
      payload.image_base64.substring(0, 50) +
      "..." +
      payload.image_base64.substring(payload.image_base64.length - 20),
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.headers.get("content-type")?.includes("application/json")) {
      const errorData = await response.json();
      throw new Error(
        `HTTP error! status: ${response.status} - ${JSON.stringify(errorData)}`
      );
    }
    throw new Error(
      `HTTP error! status: ${response.status} ${response.statusText}`
    );
  }

  const responseData = await response.json();
  console.log("Upload Response Status:", response.status);
  console.log("Upload Response Body:", responseData);

  return responseData;
}

export async function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result.split(",")[1] || result);
      } else {
        reject(new Error("Failed to convert file to base64"));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Generates a distinct color based on an index using golden angle approximation.
 * Shared between charts and tables to ensure color consistency.
 */
export const getDistinctColor = (index: number) => {
  if (index < 0) return "transparent";
  
  // Curated premium, vibrant, harmonized colors (slightly darker/richer for dark mode contrast)
  const premiumColors = [
    "hsl(142, 72%, 40%)", // 0: Emerald Green
    "hsl(217, 91%, 48%)", // 1: Sleek Blue
    "hsl(262, 83%, 52%)", // 2: Modern Violet
    "hsl(32, 95%, 44%)",  // 3: Warm Amber
    "hsl(190, 90%, 40%)", // 4: Premium Cyan
    "hsl(340, 85%, 46%)", // 5: Rose Pink
  ];

  if (index < premiumColors.length) {
    return premiumColors[index];
  }

  // Golden angle fallback for higher indices
  const hue = ((index - premiumColors.length) * 137.508 + 60) % 360;
  const lightness = 45 + (index % 3) * 5;
  return `hsl(${hue}, 85%, ${lightness}%)`;
};
