import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type NotificationStatus =
  | "Normal"
  | "Warning"
  | "Concern"
  | "Critical"
  | "Standby"
  | "Lost";

export interface NotificationEntry {
  id: string;
  sensorName: string;
  area?: string | number;
  machine?: string | number;
  status: NotificationStatus;
  datetime: string;
  hVrms?: number | null;
  vVrms?: number | null;
  aVrms?: number | null;
  temperature?: string | null;
  battery?: string | null;
}

import React, { useMemo, useState } from "react";
import SensorPagination from "../sensors/SensorPagination";

interface NotificationHistoryTableProps {
  entries: NotificationEntry[];
}

const statusStyles: Record<
  NotificationStatus,
  { label: string; color: string; dot: string }
> = {
  Normal: {
    label: "Normal",
    color: "text-green-600",
    dot: "bg-green-500",
  },
  Warning: {
    label: "Warning",
    color: "text-yellow-400",
    dot: "bg-yellow-400",
  },
  Concern: {
    label: "Concern",
    color: "text-orange-400",
    dot: "bg-orange-400",
  },
  Critical: {
    label: "Critical",
    color: "text-red-600",
    dot: "bg-red-500",
  },
  Standby: {
    label: "Standby",
    color: "text-gray-400",
    dot: "bg-gray-300",
  },
  Lost: {
    label: "Lost",
    color: "text-gray-500",
    dot: "bg-gray-400",
  },
};

const axisColors = {
  low: "bg-green-500",
  medium: "bg-yellow-400",
  high: "bg-red-500",
};

function getAxisColor(value?: number | null) {
  if (value == null) return "bg-gray-400";
  if (value < 2) return axisColors.low;
  if (value < 3) return axisColors.medium;
  return axisColors.high;
}

export function NotificationHistoryTable({
  entries,
}: NotificationHistoryTableProps) {
  const [search, setSearch] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [activePage, setActivePage] = useState(1);
  const [data, setData] = useState(entries);

  // Filtered rows
  const rows = useMemo(() => {
    let filtered = data;
    if (search) {
      filtered = filtered.filter(
        (e) =>
          e.sensorName.toLowerCase().includes(search.toLowerCase()) ||
          (e.machine && String(e.machine).includes(search))
      );
    }
    // Date filter (assume datetime is ISO string)
    if (dateStart) {
      filtered = filtered.filter(
        (e) => new Date(e.datetime) >= new Date(dateStart)
      );
    }
    if (dateEnd) {
      filtered = filtered.filter(
        (e) => new Date(e.datetime) <= new Date(dateEnd)
      );
    }
    return filtered;
  }, [search, dateStart, dateEnd, data]);

  const hasEntries = rows.length > 0;
  const totalPages = Math.max(1, Math.ceil(rows.length / 5));
  const pagedRows = rows.slice((activePage - 1) * 5, activePage * 5);

  return (
    <Card className="border border-[#374151] shadow-sm rounded-xl bg-[#1F2937] w-[98%] mx-auto pb-10">
      <CardContent className="p-0">
        {/* Header & Legend with Clear All button */}
        <div className="flex px-8 pt-6 pb-2 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <h2 className="text-2xl font-semibold text-white">
              Notification History
            </h2>
            <div className="flex flex-wrap gap-6 items-center">
              {Object.entries(statusStyles).map(([key, val]) => (
                <div key={key} className="flex items-center gap-2 text-base">
                  <span
                    className={`inline-block w-4 h-4 rounded-full border border-gray-300 ${val.dot}`}
                  />
                  <span className={val.color}>{val.label}</span>
                </div>
              ))}
            </div>
          </div>
          <Button
            variant="outline"
            className="text-sm px-6 h-10 bg-[#374151] text-white border border-gray-600 hover:bg-gray-700 rounded-md font-semibold"
            onClick={() => setData([])}
            disabled={data.length === 0}
          >
            Clear All
          </Button>
        </div>

        {/* Search & Date Filter */}
        <div className="flex flex-wrap gap-2 items-center px-8 pb-4">
          <input
            type="text"
            placeholder="Search by serial number or machine name..."
            className="border border-gray-600 rounded-md px-3 py-2 text-sm w-[700px] bg-[#11171F] text-white placeholder:text-gray-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="ml-2 text-sm text-gray-300">Date:</span>
          <input
            type="date"
            className="border border-gray-600 rounded-md px-2 py-2 text-sm bg-[#11171F] text-white [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
          />
          <span className="mx-1">-</span>
          <input
            type="date"
            className="border border-gray-600 rounded-md px-2 py-2 text-sm bg-[#11171F] text-white [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-[#374151] text-center text-gray-200">
                <th className="py-3 px-4 font-medium">Sensor Name</th>
                <th className="py-3 px-4 font-medium">Area</th>
                <th className="py-3 px-4 font-medium">Machine</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">Date&Time</th>
                <th className="py-3 px-4 font-medium">H(Vrms)</th>
                <th className="py-3 px-4 font-medium">V(Vrms)</th>
                <th className="py-3 px-4 font-medium">A(Vrms)</th>
                <th className="py-3 px-4 font-medium">Temp (°C)</th>
                <th className="py-3 px-4 font-medium">Battery (%)</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((entry) => {
                const statusStyle = statusStyles[entry.status];
                return (
                  <tr
                    key={entry.id}
                    className="border-t border-gray-700 hover:bg-[#374151]/50 transition-colors text-center"
                  >
                    <td className="py-4 px-4 font-semibold text-white">
                      {entry.sensorName}
                    </td>
                    <td className="py-4 px-4 text-gray-300">
                      {entry.area ?? "-"}
                    </td>
                    <td className="py-4 px-4 text-gray-300">
                      {entry.machine ?? "-"}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <span
                          className={`inline-block w-3 h-3 rounded-full ${statusStyle.dot}`}
                        />
                        <span className={`font-medium ${statusStyle.color}`}>
                          {statusStyle.label}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-400">
                      {entry.datetime}
                    </td>
                    {(["hVrms", "vVrms", "aVrms"] as const).map((axis) => (
                      <td key={axis} className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <span
                            className={`inline-block w-3 h-3 rounded-full ${getAxisColor(
                              entry[axis]
                            )}`}
                          />
                          <span className="font-medium text-gray-300">
                            {entry[axis] ?? "-"}
                          </span>
                        </div>
                      </td>
                    ))}
                    <td className="py-4 px-4 text-gray-300">
                      {entry.temperature ?? "-"}
                    </td>
                    <td className="py-4 px-4 text-gray-300">
                      {entry.battery ?? "-"}
                    </td>
                  </tr>
                );
              })}

              {!hasEntries && (
                <tr>
                  <td
                    colSpan={10}
                    className="py-12 text-center text-gray-500 text-sm"
                  >
                    No notifications yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination (SensorPagination style) */}
        <SensorPagination
          currentPage={activePage}
          totalPages={totalPages}
          onPageChange={setActivePage}
        />
      </CardContent>
    </Card>
  );
}
