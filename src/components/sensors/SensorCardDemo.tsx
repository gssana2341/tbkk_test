"use client";
import React from "react";
import SensorCard from "./SensorCard";
import type { Sensor } from "@/lib/types";

const mockSensor: Sensor = {
  id: "sensor-123456",
  serialNumber: "D01",
  sensor_name: "Main Conveyor Sensor",
  model: "SZX-2000",
  machine_number: "Machine 1",
  installation_point: "Area 1",
  connectivity: "online",
  batteryLevel: 78,
  last_data: {
    temperature: 40.0,
    battery: 78,
    datetime: new Date().toISOString(),
  },
} as Sensor;

export default function SensorCardDemo() {
  return (
    <div className="max-w-xl mx-auto p-4">
      <SensorCard sensor={mockSensor} onClick={() => alert("Card clicked")} />
    </div>
  );
}
