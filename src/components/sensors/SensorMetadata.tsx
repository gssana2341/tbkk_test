import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Machine, Sensor } from "@/lib/types";
import StatusBadge from "./StatusBadge";

interface SensorMetadataProps {
  sensor: Sensor;
  machine?: Machine | null;
}

export default function SensorMetadata({
  sensor,
  machine,
}: SensorMetadataProps) {
  const latestReading = sensor.latestReading || null;
  // operationalDays, isTemperatureNormal, isVibrationNormal ควรรับมาจาก backend

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-white">Status</h3>
        <StatusBadge status={sensor.status} />
      </div>

      <div className="space-y-2">
        {/* ข้อมูล metadata ที่ไม่ต้องคำนวณฝั่ง frontend */}
        <div className="grid grid-cols-2 gap-2">
          <div className="text-sm font-medium text-gray-400">Serial Number</div>
          <div className="text-sm text-gray-200">{sensor.serialNumber}</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="text-sm font-medium text-gray-400">Machine</div>
          <div className="text-sm text-gray-200">{sensor.machineName}</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="text-sm font-medium text-gray-400">Location</div>
          <div className="text-sm text-gray-200">
            {sensor.location || "Unknown"}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="text-sm font-medium text-gray-400">Last Updated</div>
          <div className="text-sm text-gray-200">
            {sensor.lastUpdatedString}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="text-sm font-medium text-gray-400">
            Installation Date
          </div>
          <div className="text-sm text-gray-200">
            {sensor.installationDateString}
          </div>
        </div>
      </div>

      {latestReading && (
        <div className="pt-4 border-t border-gray-700">
          <h3 className="text-lg font-medium mb-4 text-white">
            Latest Readings
          </h3>

          <div className="grid grid-cols-1 gap-4">
            {/* ข้อมูล readings ที่ควรรับมาจาก backend โดยไม่คำนวณฝั่ง frontend */}
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium text-gray-400">
                      Temperature
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {latestReading.temperature}°C
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={latestReading.temperatureStatusClass}
                  >
                    {latestReading.temperatureStatusLabel}
                  </Badge>
                </div>
                <div className="mt-2">
                  <div className="text-xs text-gray-500">
                    Normal range: 15°C - 30°C
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                    <div
                      className={latestReading.temperatureBarClass}
                      style={{ width: latestReading.temperatureBarWidth }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium text-gray-400">
                      Vibration
                    </div>
                    <div className="text-lg text-gray-200">
                      X:{" "}
                      <span className="font-bold">
                        {latestReading.vibrationX}
                      </span>{" "}
                      • Y:{" "}
                      <span className="font-bold">
                        {latestReading.vibrationY}
                      </span>{" "}
                      • Z:{" "}
                      <span className="font-bold">
                        {latestReading.vibrationZ}
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={latestReading.vibrationStatusClass}
                  >
                    {latestReading.vibrationStatusLabel}
                  </Badge>
                </div>
                <div className="mt-2">
                  <div className="text-xs text-gray-500">
                    Normal range: 0.0 - 0.8
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <div className="space-y-1">
                      <div className="text-xs text-gray-400">X-axis</div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className={latestReading.vibrationXBarClass}
                          style={{ width: latestReading.vibrationXBarWidth }}
                        ></div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-gray-400">Y-axis</div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className={latestReading.vibrationYBarClass}
                          style={{ width: latestReading.vibrationYBarWidth }}
                        ></div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-gray-400">Z-axis</div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className={latestReading.vibrationZBarClass}
                          style={{ width: latestReading.vibrationZBarWidth }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {machine && (
        <div className="pt-4 border-t border-gray-700">
          <h3 className="text-lg font-medium mb-2 text-white">
            Machine Details
          </h3>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm font-medium text-gray-400">Type</div>
              <div className="text-sm capitalize text-gray-200">
                {machine.type}
              </div>
            </div>
            {machine.manufacturer && (
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm font-medium text-gray-400">
                  Manufacturer
                </div>
                <div className="text-sm text-gray-200">
                  {machine.manufacturer}
                </div>
              </div>
            )}
            {machine.model && (
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm font-medium text-gray-400">Model</div>
                <div className="text-sm text-gray-200">{machine.model}</div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm font-medium text-gray-400">
                Next Maintenance
              </div>
              <div className="text-sm text-gray-200">
                {machine.nextMaintenance
                  ? new Date(machine.nextMaintenance).toLocaleDateString()
                  : "Not scheduled"}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm font-medium text-gray-400">
                Sensors Attached
              </div>
              <div className="text-sm text-gray-200">
                {machine.sensors.length}
              </div>
            </div>
          </div>
        </div>
      )}

      {sensor.maintenanceHistory && sensor.maintenanceHistory.length > 0 && (
        <div className="pt-4 border-t border-gray-700">
          <h3 className="text-lg font-medium mb-2 text-white">
            Last Maintenance
          </h3>
          <div className="space-y-2">
            <div className="text-sm">
              <div className="font-medium text-gray-200">
                {new Date(
                  sensor.maintenanceHistory[0].date
                ).toLocaleDateString()}
              </div>
              <div className="text-gray-400">
                {sensor.maintenanceHistory[0].description}
              </div>
              {sensor.maintenanceHistory[0].technician && (
                <div className="text-gray-400">
                  Technician: {sensor.maintenanceHistory[0].technician}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
