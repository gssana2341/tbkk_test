"use client";

import type React from "react";

import { useRouter } from "next/navigation";
import type { Sensor } from "@/lib/types";
import SensorCard from "./SensorCard";

interface SensorGridProps {
  sensors?: Sensor[];
  sensorGroups?: Sensor[][];
}

export default function SensorGrid({ sensors, sensorGroups }: SensorGridProps) {
  const router = useRouter();

  // Prefer flat sensors array, fallback to flattening sensorGroups
  const allSensors = sensors || sensorGroups?.flat() || [];

  const handleSensorClick = (sensorId: string) => {
    router.push(`/sensors/${sensorId}`);
  };

  if (allSensors.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-400">
        <p>No sensors available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[1600px]:grid-cols-6 min-[1850px]:grid-cols-7 min-[2100px]:grid-cols-8 gap-4">
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
