/**
 * ISO 10816-3 Vibration Standards
 * Machine classification and threshold values according to ISO 10816-3
 */

export interface MachineClassThresholds {
  warning: number; // mm/s - Warning threshold
  concern: number; // mm/s - Concern threshold
  critical: number; // mm/s - Critical threshold
}

export interface MachineClassInfo {
  id: string;
  code: number;
  name: string;
  description: string;
  thresholds: MachineClassThresholds;
  alarmThreshold?: number; // G - Default alarm threshold
}

/**
 * ISO 10816-3 Machine Class Thresholds (mm/s)
 * Based on ISO 10816-3 standard for vibration evaluation
 */
export const ISO_10816_3_THRESHOLDS: Record<string, MachineClassInfo> = {
  smallMachine: {
    id: "smallMachine",
    code: 1,
    name: "Small machine",
    description: "G < 0.71 mm/s < Y < 1.80 mm/s < O < 4.50 mm/s < R",
    thresholds: {
      warning: 0.71,
      concern: 1.8,
      critical: 4.5,
    },
  },
  mediumRigid: {
    id: "mediumRigid",
    code: 2,
    name: "Medium machine rigid",
    description: "G < 1.40 mm/s < Y < 2.80 mm/s < O < 4.50 mm/s < R",
    thresholds: {
      warning: 1.4,
      concern: 2.8,
      critical: 4.5,
    },
  },
  mediumFlexible: {
    id: "mediumFlexible",
    code: 3,
    name: "Medium machine flexible",
    description: "G < 2.30 mm/s < Y < 4.50 mm/s < O < 7.10 mm/s < R",
    thresholds: {
      warning: 2.3,
      concern: 4.5,
      critical: 7.1,
    },
  },
  largeRigid: {
    id: "largeRigid",
    code: 4,
    name: "Large machine rigid",
    description: "G < 2.30 mm/s < Y < 4.50 mm/s < O < 7.10 mm/s < R",
    thresholds: {
      warning: 2.3,
      concern: 4.5,
      critical: 7.1,
    },
  },
  largeFlexible: {
    id: "largeFlexible",
    code: 5,
    name: "Large machine flexible",
    description: "G < 3.50 mm/s < Y < 7.10 mm/s < O < 11.0 mm/s < R",
    thresholds: {
      warning: 3.5,
      concern: 7.1,
      critical: 11.0,
    },
  },
  integratedRigid: {
    id: "integratedRigid",
    code: 6,
    name: "Integrated driver motor pump rigid",
    description: "G < 1.40 mm/s < Y < 2.80 mm/s < O < 4.50 mm/s < R",
    thresholds: {
      warning: 1.4,
      concern: 2.8,
      critical: 4.5,
    },
  },
  integratedFlexible: {
    id: "integratedFlexible",
    code: 7,
    name: "Integrated driver motor pump flexible",
    description: "G < 2.30 mm/s < Y < 4.50 mm/s < O < 7.10 mm/s < R",
    thresholds: {
      warning: 2.3,
      concern: 4.5,
      critical: 7.1,
    },
  },
  externalRigid: {
    id: "externalRigid",
    code: 8,
    name: "External driver motor pump rigid",
    description: "G < 2.30 mm/s < Y < 4.50 mm/s < O < 7.10 mm/s < R",
    thresholds: {
      warning: 2.3,
      concern: 4.5,
      critical: 7.1,
    },
  },
  externalFlexible: {
    id: "externalFlexible",
    code: 9,
    name: "External driver motor pump flexible",
    description: "G < 3.50 mm/s < Y < 7.10 mm/s < O < 11.0 mm/s < R",
    thresholds: {
      warning: 3.5,
      concern: 7.1,
      critical: 11.0,
    },
  },
};

/**
 * Machine Class mapping based on Power and Foundation Type
 */
export interface PowerFoundationMapping {
  power: number; // kW
  foundationType: "flexible" | "rigid";
  machineClass: string;
}

/**
 * Get machine class based on power and foundation type
 */
export function getMachineClassFromPower(
  power: number,
  foundationType: "flexible" | "rigid"
): string {
  if (power < 15) {
    return "smallMachine";
  } else if (power >= 15 && power <= 75) {
    return foundationType === "rigid" ? "mediumRigid" : "mediumFlexible";
  } else if (power > 75) {
    return foundationType === "rigid" ? "largeRigid" : "largeFlexible";
  }
  return "mediumRigid"; // Default
}

/**
 * Get thresholds for a machine class
 */
export function getThresholdsForMachineClass(
  machineClass: string
): MachineClassThresholds | null {
  const info = ISO_10816_3_THRESHOLDS[machineClass];
  return info ? info.thresholds : null;
}

/**
 * Get alarm threshold for a machine class
 */
export function getAlarmThresholdForMachineClass(machineClass: string): number {
  const info = ISO_10816_3_THRESHOLDS[machineClass];
  return info?.alarmThreshold || 5.0; // Default 5.0 G
}

/**
 * Get all available machine classes
 */
export function getAllMachineClasses(): MachineClassInfo[] {
  return Object.values(ISO_10816_3_THRESHOLDS);
}

/**
 * Get machine class info by ID
 */
export function getMachineClassInfo(
  machineClassId: string
): MachineClassInfo | null {
  return ISO_10816_3_THRESHOLDS[machineClassId] || null;
}

export function getMachineClassCode(machineClassId: string): number | null {
  const info = ISO_10816_3_THRESHOLDS[machineClassId];
  return info ? info.code : null;
}
