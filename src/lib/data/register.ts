import { generateId } from "@/lib/utils";
import type { Machine, Sensor } from "@/lib/types";
import { getMachines } from "./machines";

// In-memory storage for registered machines and sensors
// Note: In production, this should be replaced with actual API calls
const registeredMachines: Machine[] = [];
const registeredSensors: Sensor[] = [];

// Register a new machine
export async function registerMachine(machineData: {
  name: string;
  type: string;
  location: string;
  manufacturer?: string;
  model?: string;
  installationDate?: string;
  description?: string;
}): Promise<Machine> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Create a new machine object
  const newMachine: Machine = {
    id: generateId(),
    name: machineData.name,
    type: machineData.type,
    location: machineData.location,
    manufacturer: machineData.manufacturer || "",
    model: machineData.model || "",
    installationDate: machineData.installationDate
      ? new Date(machineData.installationDate).getTime()
      : Date.now(),
    status: "operational",
    lastMaintenance: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
    nextMaintenance: Date.now() + 60 * 24 * 60 * 60 * 1000, // 60 days from now
    sensors: [],
  };

  // Add to the registered machines
  registeredMachines.push(newMachine);

  return newMachine;
}

// Register a new sensor
export async function registerSensor(sensorData: {
  serialNumber: string;
  machineId: string;
  location?: string;
  notes?: string;
}): Promise<Sensor> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Get the machine
  const machines = await getMachines();
  const machine = machines.find((m) => m.id === sensorData.machineId);

  if (!machine) {
    throw new Error("Machine not found");
  }

  // Create a new sensor object
  const newSensor: Sensor = {
    id: generateId(),
    serialNumber: sensorData.serialNumber,
    machineName: machine.name,
    sensor_type: "Master",
    location: sensorData.location || machine.location,
    installationDate: Date.now(),
    lastUpdated: Date.now(),
    status: "ok",
    readings: [],
    maintenanceHistory: [],
    name: "",
    model: "",
    operationalStatus: "running",
    batteryLevel: 100,
    connectivity: "online",
    signalStrength: 100,
    vibrationH: "normal",
    vibrationV: "normal",
    vibrationA: "normal",
  };

  // Readings will be populated from API when sensor starts sending data

  // Add to the registered sensors
  registeredSensors.push(newSensor);

  // Update the machine's sensors list
  machine.sensors.push(newSensor.id);

  return newSensor;
}

// Get all registered machines and sensors
export async function getRegisteredDevices() {
  // Simulate API delay for consistency
  await new Promise((resolve) => setTimeout(resolve, 300));

  return {
    machines: registeredMachines,
    sensors: registeredSensors,
  };
}
