"use client";

import type React from "react";

import { useRouter } from "next/navigation";
import type { Sensor } from "@/lib/types";
import SensorCard from "./SensorCard";

interface SensorGridProps {
  sensorGroups?: Sensor[][];
}

export default function SensorGrid({ sensorGroups }: SensorGridProps) {
  const router = useRouter();

  // Use sensorGroups from props, or empty array if not provided
  const sensorGroupsData: Sensor[][] =
    sensorGroups && sensorGroups.length > 0 ? sensorGroups : [];

  const handleSensorClick = (sensorId: string) => {
    router.push(`/sensors/${sensorId}`);
  };

  // Flatten all groups into a single array to avoid gaps between groups
  const allSensors = sensorGroupsData.flat();

  if (allSensors.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-400">
        <p>No sensors available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 min-[1800px]:grid-cols-8 min-[2200px]:grid-cols-10 gap-4">
      {allSensors.map((sensor) => (
        <SensorCard
          key={sensor.id}
          sensor={sensor}
          onClick={() => handleSensorClick(sensor.id)}
        />
      ))}
    </div>
  );
}

// Extend window interface for TypeScript
declare global {
  interface Window {
    refreshSensorData?: () => void;
  }
}
