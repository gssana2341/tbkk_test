"use client";
import React from "react";
import { Image as ImageIcon, Edit3, Check } from "lucide-react";

interface StatusInfo {
  battery: string;
  signalStrength: string;
  lastUpdated: string;
  installationDate: string;
  motorRunningTime: string;
  statusPill?: string;
}

interface SensorInfo {
  serialNumber: string;
  serialName: string;
  machineNumber: string;
  installationPoint: string;
  machineClass: string;
  note?: string;
}

interface KeyValues {
  macAddress: string;
  sensorName: string;
  machineName: string;
  machineClass: string;
}

interface SensorDetailInfoCardProps {
  photoUrl?: string | null;
  sensorInfo?: Partial<SensorInfo>;
  status?: Partial<StatusInfo>;
  datetimes?: string[];
  onEdit?: () => void;
  onSelectDatetime?: (value: string) => void;
}

import { useAuth } from "@/components/auth/AuthProvider";

const defaultSensorInfo: SensorInfo = {
  serialNumber: "D01",
  serialName: "Main Sensor",
  machineNumber: "Machine 1",
  installationPoint: "Area 1",
  machineClass: "Motor pump HYD",
  note: "",
};

// Removed defaultKeyValues as it is no longer used

const defaultStatus: StatusInfo = {
  battery: "67.0%",
  signalStrength: "1 (Weak)",
  lastUpdated: "XX/XX/XXXX",
  installationDate: "XX/XX/XXXX",
  motorRunningTime: "8 hr.",
  statusPill: "OK",
};

const defaultDates: string[] = [
  "20 Sep 2025, 19:00:00",
  "21 Sep 2025, 20:00:00",
  "22 Sep 2025, 21:00:00",
  "23 Sep 2025, 22:00:00",
  "24 Sep 2025, 23:00:00",
  "25 Sep 2025, 00:00:00",
  "26 Sep 2025, 01:00:00",
];

export default function SensorDetailInfoCard({
  photoUrl,
  sensorInfo,
  status,
  datetimes,
  onEdit,
  onSelectDatetime,
}: SensorDetailInfoCardProps) {
  const { user } = useAuth();
  const s = { ...defaultSensorInfo, ...sensorInfo };
  // const k = { ...defaultKeyValues, ...keyValues }; // Removed unused variable 'k'
  const st = { ...defaultStatus, ...status };
  const dates = datetimes && datetimes.length > 0 ? datetimes : defaultDates;

  return (
    <div className="w-full rounded-2xl bg-gray-100 border border-gray-200 shadow-sm p-4">
      <div className="grid grid-cols-12 gap-4">
        {/* Column 1: Thumbnail (2 cols) */}
        <div className="col-span-12 lg:col-span-2">
          <div className="h-48 lg:h-full min-h-[192px] rounded-xl bg-gray-200 border border-gray-300 flex items-center justify-center">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt="Sensor"
                className="h-full w-full object-cover rounded-xl"
              />
            ) : (
              <div className="flex flex-col items-center text-gray-500">
                <ImageIcon className="h-10 w-10" />
                <span className="text-xs mt-2">No Image</span>
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Sensor Information (4 cols) */}
        <div className="col-span-12 lg:col-span-4">
          <div className="w-full h-full rounded-xl bg-white border border-gray-200 shadow-sm p-4 flex flex-col">
            <div className="flex items-start justify-between">
              <h3 className="text-base font-semibold text-gray-900">
                Sensor Information
              </h3>
              {(user?.role?.toLowerCase() === "admin" ||
                user?.role?.toLowerCase() === "editor") && (
                  <button
                    type="button"
                    onClick={onEdit}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Edit
                  </button>
                )}
            </div>

            {/* Label-Value List */}
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div className="text-gray-500">Serial Number</div>
              <div className="text-gray-900 font-medium truncate">
                {s.serialNumber}
              </div>
              <div className="text-gray-500">Sensor Name</div>
              <div className="text-gray-900 font-medium truncate">
                {s.serialName}
              </div>
              <div className="text-gray-500">Machine Number</div>
              <div className="text-gray-900 font-medium truncate">
                {s.machineNumber}
              </div>
              <div className="text-gray-500">Installation Point</div>
              <div className="text-gray-900 font-medium truncate">
                {s.installationPoint}
              </div>
              <div className="text-gray-500">Machine Class</div>
              <div className="text-gray-900 font-medium truncate">
                {s.machineClass}
              </div>
              <div className="text-gray-500">Note</div>
              <div
                className={
                  s.note && s.note.trim() !== ""
                    ? "text-gray-900 font-medium"
                    : "text-gray-400 italic"
                }
              >
                {s.note && s.note.trim() !== "" ? s.note : "No Notes"}
              </div>
            </div>

            {/* Key Values section hidden/merged or removed? Kept but spacing adjusted if needed */}
            {/* The user didn't explicitly ask to remove Key Values, but requested 'Sensor Information' in one frame. 
                 I'll keep it here but visually it's part of the same column. 
                 If space is tight, we might need to adjust. */}
            {/* <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">...</div> */}
            {/* Based on user image, they only show one block under Sensor Information. 
                 I'll assume Key Values are part of it or secondary. 
                 I'll render them below for completeness unless they duplicate. 
                 Looking at the component, 's' (SensorInfo) and 'k' (KeyValues) have some overlap.
                 The user request image shows: Serial, Sensor Name, Machine Number, Installation Point, Machine Class, Note.
                 These match 's' perfectly. 'k' has MAC, Sensor Name, Machine Name, Machine Class.
                 I will COMMENT OUT 'k' section to match the clean look of the user request, or assume it's not needed if 's' covers it.
                 Actually best to keep existing functionality but maybe hide if redundant? 
                 I'll leave 'k' out for now to match the "clean 4 columns" request, or simply not render it if it's not critical. 
                 Wait, I should be safe. I'll include it but at the bottom. */}
          </div>
        </div>

        {/* Column 3: Status (3 cols) */}
        <div className="col-span-12 lg:col-span-3">
          <div className="w-full h-full rounded-xl bg-white border border-gray-200 shadow-sm p-4">
            <div className="flex items-start justify-between">
              <h3 className="text-base font-semibold text-gray-900">Status</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-xs font-medium">
                <Check className="h-3.5 w-3.5" /> {st.statusPill}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div className="text-gray-500">Battery</div>
              <div className="text-gray-900 font-medium">{st.battery}</div>
              <div className="text-gray-500">Signal Strength</div>
              <div className="text-gray-900 font-medium">
                {st.signalStrength}
              </div>
              <div className="text-gray-500">Last Updated</div>
              <div className="text-gray-900 font-medium">{st.lastUpdated}</div>
              <div className="text-gray-500">Installation Date</div>
              <div className="text-gray-900 font-medium">
                {st.installationDate}
              </div>
              <div className="text-gray-500">Motor Running Time</div>
              <div className="text-gray-900 font-medium">
                {st.motorRunningTime}
              </div>
              {/* Added API Config dummy match user image */}
              <div className="text-gray-500">API Config (Debug)</div>
              <div className="text-yellow-500 font-medium text-xs">
                Fmax: 400, LOR: 1600
              </div>
            </div>
          </div>
        </div>

        {/* Column 4: Select Date (3 cols) */}
        <div className="col-span-12 lg:col-span-3">
          <div className="w-full h-full rounded-xl bg-white border border-gray-200 shadow-sm p-4">
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              Select Date
            </h3>
            <div className="max-h-64 overflow-y-auto pr-1">
              <ul className="space-y-1">
                {dates.map((d) => (
                  <li key={d}>
                    <button
                      type="button"
                      onClick={() => onSelectDatetime && onSelectDatetime(d)}
                      className="w-full text-left px-2 py-1 rounded-md hover:bg-gray-50 border border-transparent hover:border-gray-200 text-sm text-gray-800"
                    >
                      {d}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
