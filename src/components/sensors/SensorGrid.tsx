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

  if (sensorGroupsData.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-400">
        <p>No sensors available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sensorGroupsData.map((group, idx) => (
        <div
          key={idx}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2"
        >
          {group.map((sensor) => (
            <SensorCard
              key={sensor.id}
              sensor={sensor}
              onClick={() => handleSensorClick(sensor.id)}
            />
          ))}
        </div>
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
