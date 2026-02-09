import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown, Calendar } from "lucide-react";

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
  timestamp: number;
  hVrms?: number | null;
  vVrms?: number | null;
  aVrms?: number | null;
  hColor?: number;
  vColor?: number;
  aColor?: number;
  temperature?: string | null;
  battery?: string | null;
  config?: {
    thresholdMin: number;
    thresholdMedium: number;
    thresholdMax: number;
  };
}

import React, { useMemo, useState } from "react";
import SensorPagination from "../sensors/SensorPagination";

interface NotificationHistoryTableProps {
  entries: NotificationEntry[];
  totalServerItems?: number; // Total items on server, for calculating total pages
  currentPage?: number; // Controlled current page
  onPageChange?: (page: number) => void; // Callback for page change
}

const statusStyles: Record<
  NotificationStatus,
  { label: string; color: string; dot: string }
> = {
  Normal: {
    label: "Normal",
    color: "text-[#72ff82]",
    dot: "bg-[#72ff82]",
  },
  Warning: {
    label: "Warning",
    color: "text-[#ffd84d]",
    dot: "bg-[#ffd84d]",
  },
  Concern: {
    label: "Concern",
    color: "text-[#ff8c1a]",
    dot: "bg-[#ff8c1a]",
  },
  Critical: {
    label: "Critical",
    color: "text-[#ff4d4d]",
    dot: "bg-[#ff4d4d]",
  },
  Standby: {
    label: "Standby",
    color: "text-[#c8c8c8]",
    dot: "bg-[#c8c8c8]",
  },
  Lost: {
    label: "Lost",
    color: "text-[#626262]",
    dot: "bg-[#626262]",
  },
};

const axisColors = {
  normal: "bg-[#72ff82]",
  warning: "bg-[#ffd84d]",
  concern: "bg-[#ff8c1a]",
  critical: "bg-[#ff4d4d]",
};

function getAxisColorCode(code: number | undefined) {
  if (code === 1) return axisColors.normal;
  if (code === 2) return axisColors.warning;
  if (code === 3) return axisColors.concern;
  if (code === 4) return axisColors.critical;
  return "bg-gray-400";
}

export function NotificationHistoryTable({
  entries,
  totalServerItems,
  currentPage,
  onPageChange,
}: NotificationHistoryTableProps) {
  const [search, setSearch] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [internalPage, setInternalPage] = useState(1);
  const [data, setData] = useState(entries);

  // Use controlled page if provided, else internal
  const activePage = currentPage ?? internalPage;

  const [selectedStatuses, setSelectedStatuses] = useState<
    NotificationStatus[]
  >([]);

  const toggleStatus = (status: NotificationStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  // Sync data when entries prop changes
  React.useEffect(() => {
    setData(entries);
  }, [entries]);

  const [sortConfig, setSortConfig] = useState<{
    key: keyof NotificationEntry;
    direction: "asc" | "desc";
  } | null>(null);

  const requestSort = (key: keyof NotificationEntry) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Filtered and Sorted rows
  const rows = useMemo(() => {
    let filtered = [...data];
    if (search) {
      filtered = filtered.filter(
        (e) =>
          e.sensorName.toLowerCase().includes(search.toLowerCase()) ||
          (e.machine && String(e.machine).includes(search))
      );
    }
    // Date filter (assume datetime is ISO string or compare timestamp if available)
    if (dateStart) {
      const start = new Date(dateStart).setHours(0, 0, 0, 0);
      filtered = filtered.filter((e) => e.timestamp >= start);
    }
    if (dateEnd) {
      const end = new Date(dateEnd).setHours(23, 59, 59, 999);
      filtered = filtered.filter((e) => e.timestamp <= end);
    }

    // Status Filter
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((e) => selectedStatuses.includes(e.status));
    }

    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Specific handling for 'datetime' column -> use 'timestamp'
        if (sortConfig.key === "datetime") {
          aValue = a.timestamp;
          bValue = b.timestamp;
        }

        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [search, dateStart, dateEnd, data, sortConfig, selectedStatuses]);

  const hasEntries = rows.length > 0;

  // Calculate total pages: Use server total if provided, otherwise client-side filtered length
  const totalPages = totalServerItems
    ? Math.max(1, Math.ceil(totalServerItems / 20))
    : Math.max(1, Math.ceil(rows.length / 20));

  // If using server items, we assume the parent manages the data slice for the current page OR we have accumulated data
  // But standard logic: slice the rows for the current page
  const pagedRows = rows.slice((activePage - 1) * 20, activePage * 20);

  const handlePageChange = (page: number) => {
    if (onPageChange) {
      onPageChange(page);
    } else {
      setInternalPage(page);
    }
  };

  const getClassNamesFor = (name: keyof NotificationEntry) => {
    if (!sortConfig) return "";
    return sortConfig.key === name ? sortConfig.direction : "";
  };

  const getSortIcon = (key: keyof NotificationEntry) => {
    if (sortConfig?.key === key) {
      return sortConfig.direction === "asc" ? (
        <ArrowUp className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
      ) : (
        <ArrowDown className="ml-1 h-3 w-3 sm:h-4 sm:w-4" />
      );
    }
    return (
      <ArrowUpDown className="ml-1 h-3 w-3 sm:h-4 sm:w-4 text-gray-500 opacity-50" />
    );
  };

  return (
    <Card className="border-[1.35px] border-[#374151] shadow-sm rounded-xl bg-[#0B1121] w-[98%] mx-auto pb-10">
      <CardContent className="p-0">
        {/* Header & Legend with Clear All button */}
        <div className="flex px-8 pt-6 pb-2 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <h2 className="text-2xl 2xl:text-4xl font-semibold text-white">
              Notification History
            </h2>
            <div className="flex flex-wrap gap-6 items-center">
              {Object.entries(statusStyles)
                .filter(([key]) => key !== "Normal" && key !== "Standby")
                .map(([key, val]) => {
                  const isSelected = selectedStatuses.includes(
                    key as NotificationStatus
                  );
                  return (
                    <button
                      key={key}
                      onClick={() => toggleStatus(key as NotificationStatus)}
                      className={`flex items-center gap-2 text-base 2xl:text-xl transition-all duration-200 ${
                        selectedStatuses.length > 0 && !isSelected
                          ? "opacity-40 grayscale"
                          : "opacity-100"
                      }`}
                    >
                      <span
                        className={`inline-block w-4 h-4 2xl:w-6 2xl:h-6 rounded-full border border-gray-300 ${val.dot}`}
                      />
                      <span className={val.color}>{val.label}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Search & Date Filter */}
        <div className="flex flex-wrap gap-2 items-center px-8 pb-4">
          <input
            type="text"
            placeholder="Search by serial number or machine name..."
            className="border border-gray-600 rounded-md px-3 py-2 text-base 2xl:text-xl w-[700px] 2xl:w-[900px] bg-[#11171F] text-white placeholder:text-gray-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="ml-2 text-base 2xl:text-xl text-gray-300">
            Date:
          </span>
          {/* Start Date Custom Input */}
          <div
            className="relative bg-[#11171F] border border-gray-600 rounded-md px-3 py-2 flex items-center gap-2 cursor-pointer hover:border-blue-500 transition-colors w-[200px] 2xl:w-[250px]"
            onClick={(e) => {
              const input = e.currentTarget.querySelector(
                'input[type="date"]'
              ) as HTMLInputElement;
              if (input) input.showPicker();
            }}
          >
            <span className="text-white text-base 2xl:text-xl flex-1">
              {dateStart
                ? dateStart.split("-").reverse().join("/")
                : "dd/mm/yyyy"}
            </span>
            <Calendar className="h-5 w-5 text-gray-400" />
            <input
              type="date"
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
            />
          </div>

          <span className="mx-1 text-lg 2xl:text-2xl text-gray-400">-</span>

          {/* End Date Custom Input */}
          <div
            className="relative bg-[#11171F] border border-gray-600 rounded-md px-3 py-2 flex items-center gap-2 cursor-pointer hover:border-blue-500 transition-colors w-[200px] 2xl:w-[250px]"
            onClick={(e) => {
              const input = e.currentTarget.querySelector(
                'input[type="date"]'
              ) as HTMLInputElement;
              if (input) input.showPicker();
            }}
          >
            <span className="text-white text-base 2xl:text-xl flex-1">
              {dateEnd ? dateEnd.split("-").reverse().join("/") : "dd/mm/yyyy"}
            </span>
            <Calendar className="h-5 w-5 text-gray-400" />
            <input
              type="date"
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-base 2xl:text-xl">
            <thead>
              <tr className="bg-[#0B1121] border-b-[1.35px] border-[#374151] text-center text-gray-200 text-lg 2xl:text-2xl">
                <th
                  className="py-3 px-4 font-medium cursor-pointer hover:text-white transition-colors"
                  onClick={() => requestSort("sensorName")}
                >
                  <div className="flex items-center justify-center gap-1">
                    Sensor Name {getSortIcon("sensorName")}
                  </div>
                </th>
                <th
                  className="py-3 px-4 font-medium cursor-pointer hover:text-white transition-colors"
                  onClick={() => requestSort("area")}
                >
                  <div className="flex items-center justify-center gap-1">
                    Area {getSortIcon("area")}
                  </div>
                </th>
                <th
                  className="py-3 px-4 font-medium cursor-pointer hover:text-white transition-colors"
                  onClick={() => requestSort("machine")}
                >
                  <div className="flex items-center justify-center gap-1">
                    Machine {getSortIcon("machine")}
                  </div>
                </th>
                <th
                  className="py-3 px-4 font-medium cursor-pointer hover:text-white transition-colors"
                  onClick={() => requestSort("status")}
                >
                  <div className="flex items-center justify-center gap-1">
                    Status {getSortIcon("status")}
                  </div>
                </th>
                <th
                  className="py-3 px-4 font-medium cursor-pointer hover:text-white transition-colors"
                  onClick={() => requestSort("datetime")} // Uses timestamp logic
                >
                  <div className="flex items-center justify-center gap-1">
                    Date&Time {getSortIcon("datetime")}
                  </div>
                </th>
                <th
                  className="py-3 px-4 font-medium cursor-pointer hover:text-white transition-colors"
                  onClick={() => requestSort("hVrms")}
                >
                  <div className="flex items-center justify-center gap-1">
                    H(Vrms) {getSortIcon("hVrms")}
                  </div>
                </th>
                <th
                  className="py-3 px-4 font-medium cursor-pointer hover:text-white transition-colors"
                  onClick={() => requestSort("vVrms")}
                >
                  <div className="flex items-center justify-center gap-1">
                    V(Vrms) {getSortIcon("vVrms")}
                  </div>
                </th>
                <th
                  className="py-3 px-4 font-medium cursor-pointer hover:text-white transition-colors"
                  onClick={() => requestSort("aVrms")}
                >
                  <div className="flex items-center justify-center gap-1">
                    A(Vrms) {getSortIcon("aVrms")}
                  </div>
                </th>
                <th
                  className="py-3 px-4 font-medium cursor-pointer hover:text-white transition-colors"
                  onClick={() => requestSort("temperature")}
                >
                  <div className="flex items-center justify-center gap-1">
                    Temp (°C) {getSortIcon("temperature")}
                  </div>
                </th>
                <th
                  className="py-3 px-4 font-medium cursor-pointer hover:text-white transition-colors"
                  onClick={() => requestSort("battery")}
                >
                  <div className="flex items-center justify-center gap-1">
                    Battery (%) {getSortIcon("battery")}
                  </div>
                </th>
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
                          className={`inline-block w-3 h-3 2xl:w-5 2xl:h-5 rounded-full ${statusStyle.dot}`}
                        />
                        <span className={`font-medium ${statusStyle.color}`}>
                          {statusStyle.label}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-400">
                      {entry.datetime}
                    </td>
                    {(["hVrms", "vVrms", "aVrms"] as const).map((axis) => {
                      const colorField = (axis.charAt(0) +
                        "Color") as keyof NotificationEntry;
                      const colorCode = entry[colorField] as number | undefined;

                      return (
                        <td key={axis} className="py-4 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <span
                              className={`inline-block w-3 h-3 2xl:w-5 2xl:h-5 rounded-full ${
                                colorCode !== undefined
                                  ? getAxisColorCode(colorCode)
                                  : "bg-gray-400"
                              }`}
                            />
                            <span className="font-medium text-gray-300">
                              {entry[axis] != null
                                ? entry[axis].toFixed(2)
                                : "-"}
                            </span>
                          </div>
                        </td>
                      );
                    })}
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
                    className="py-12 text-center text-gray-500 text-sm 2xl:text-xl"
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
          onPageChange={handlePageChange}
        />
      </CardContent>
    </Card>
  );
}
