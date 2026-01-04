/**
 * Storage utilities for register form suggestions
 * Stores Area and Machine Name in localStorage for autocomplete
 */

const AREA_STORAGE_KEY = "sensor_register_areas";
const MACHINE_NAME_STORAGE_KEY = "sensor_register_machine_names";
const MOTOR_TYPE_STORAGE_KEY = "sensor_register_motor_types";

/**
 * Get all stored areas
 */
export function getStoredAreas(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(AREA_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as string[];
  } catch {
    return [];
  }
}

/**
 * Get all stored motor types
 */
export function getStoredMotorTypes(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(MOTOR_TYPE_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as string[];
  } catch {
    return [];
  }
}

/**
 * Store motor type (case-insensitive, unique)
 */
export function storeMotorType(motorType: string): void {
  if (typeof window === "undefined" || !motorType.trim()) return;

  try {
    const motorTypes = getStoredMotorTypes();
    const normalized = motorType.trim().toUpperCase();

    const exists = motorTypes.some((m) => m.toUpperCase() === normalized);

    if (!exists) {
      motorTypes.unshift(normalized);
      const limited = motorTypes.slice(0, 50);
      localStorage.setItem(MOTOR_TYPE_STORAGE_KEY, JSON.stringify(limited));
    }
  } catch (error) {
    console.error("Error storing motor type:", error);
  }
}

/**
 * Get all stored machine names
 */
export function getStoredMachineNames(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(MACHINE_NAME_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as string[];
  } catch {
    return [];
  }
}

/**
 * Store area (case-insensitive, unique)
 */
export function storeArea(area: string): void {
  if (typeof window === "undefined" || !area.trim()) return;

  try {
    const areas = getStoredAreas();
    const normalizedArea = area.trim().toUpperCase();

    // Check if area already exists (case-insensitive)
    const exists = areas.some((a) => a.toUpperCase() === normalizedArea);

    if (!exists) {
      areas.unshift(normalizedArea); // Add to beginning
      // Keep only last 50 areas
      const limitedAreas = areas.slice(0, 50);
      localStorage.setItem(AREA_STORAGE_KEY, JSON.stringify(limitedAreas));
    }
  } catch (error) {
    console.error("Error storing area:", error);
  }
}

/**
 * Store machine name (case-insensitive, unique)
 */
export function storeMachineName(machineName: string): void {
  if (typeof window === "undefined" || !machineName.trim()) return;

  try {
    const machineNames = getStoredMachineNames();
    const normalizedName = machineName.trim().toUpperCase();

    // Check if machine name already exists (case-insensitive)
    const exists = machineNames.some((m) => m.toUpperCase() === normalizedName);

    if (!exists) {
      machineNames.unshift(normalizedName); // Add to beginning
      // Keep only last 50 machine names
      const limitedNames = machineNames.slice(0, 50);
      localStorage.setItem(
        MACHINE_NAME_STORAGE_KEY,
        JSON.stringify(limitedNames)
      );
    }
  } catch (error) {
    console.error("Error storing machine name:", error);
  }
}

/**
 * Filter suggestions based on input (case-insensitive)
 */
export function filterSuggestions(
  input: string,
  suggestions: string[]
): string[] {
  if (!input.trim()) return suggestions.slice(0, 10); // Return top 10 if no input

  const normalizedInput = input.toLowerCase();
  return suggestions
    .filter((s) => s.toLowerCase().includes(normalizedInput))
    .slice(0, 10); // Return top 10 matches
}
