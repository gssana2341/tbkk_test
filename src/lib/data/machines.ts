import type { Machine } from "@/lib/types";
import { getRegisteredDevices } from "./register";

// Get all machines
export async function getMachines(): Promise<Machine[]> {
  try {
    // Fetch machines from API only
    const { machines: registeredMachines } = await getRegisteredDevices();
    return registeredMachines || [];
  } catch (error) {
    console.error("Error fetching registered machines:", error);
    return [];
  }
}

// Get a single machine by ID
export async function getMachineById(id: string): Promise<Machine | null> {
  if (!id) {
    console.warn("getMachineById called with empty id");
    return null;
  }

  try {
    // Fetch machines from API only
    const { machines: registeredMachines } = await getRegisteredDevices();
    if (registeredMachines && Array.isArray(registeredMachines)) {
      const registeredMachine = registeredMachines.find(
        (machine) => machine.id === id
      );
      if (registeredMachine) return registeredMachine;

      // Check by name (for backward compatibility)
      const registeredMachineByName = registeredMachines.find(
        (machine) => machine.name === id
      );
      if (registeredMachineByName) return registeredMachineByName;
    }

    // If no machine is found, return null
    return null;
  } catch (error) {
    console.error(`Error finding machine with ID ${id}:`, error);
    return null;
  }
}

// Get sensors for a specific machine
export async function getMachineSensors(machineId: string): Promise<string[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  try {
    const machine = await getMachineById(machineId);
    return machine ? machine.sensors : [];
  } catch (error) {
    console.error(`Error getting sensors for machine ${machineId}:`, error);
    return [];
  }
}
