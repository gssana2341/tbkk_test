"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

export type SensorStatusType =
  | "normal"
  | "warning"
  | "concern"
  | "critical"
  | "standby"
  | "lost";

interface SensorStatusSummaryProps {
  data: {
    total: number;
    lastUpdate: string;
    status: {
      normal: number;
      warning: number;
      concern: number;
      critical: number;
      standby: number;
      lost: number;
    };
  };
  selectedStatuses?: SensorStatusType[];
  onStatusFilterChange?: (selectedStatuses: SensorStatusType[]) => void;
  hideStatusGrid?: boolean;
}

const statusConfig: Record<
  SensorStatusType,
  {
    textColor: string;
    bgColor: string;
    selectedBgColor: string;
  }
> = {
  normal: {
    textColor: "text-black",
    bgColor: "bg-[#72ff82]",
    selectedBgColor: "bg-[#72ff82]",
  },
  warning: {
    textColor: "text-black",
    bgColor: "bg-[#ffd84d]",
    selectedBgColor: "bg-[#ffd84d]",
  },
  concern: {
    textColor: "text-black",
    bgColor: "bg-[#ff8c1a]",
    selectedBgColor: "bg-[#ff8c1a]",
  },
  critical: {
    textColor: "text-black",
    bgColor: "bg-[#ff4d4d]",
    selectedBgColor: "bg-[#ff4d4d]",
  },
  standby: {
    textColor: "text-black",
    bgColor: "bg-[#c8c8c8]",
    selectedBgColor: "bg-[#c8c8c8]",
  },
  lost: {
    textColor: "text-black",
    bgColor: "bg-[#626262]",
    selectedBgColor: "bg-[#626262]",
  },
};

const SensorStatusSummary: React.FC<SensorStatusSummaryProps> = ({
  data,
  selectedStatuses = [],
  onStatusFilterChange,
}) => {
  const [internalSelectedStatuses, setInternalSelectedStatuses] =
    useState<SensorStatusType[]>(selectedStatuses);

  const activeSelectedStatuses =
    onStatusFilterChange !== undefined
      ? selectedStatuses
      : internalSelectedStatuses;

  const handleStatusClick = (status: SensorStatusType) => {
    const newSelected = activeSelectedStatuses.includes(status)
      ? activeSelectedStatuses.filter((s) => s !== status)
      : [...activeSelectedStatuses, status];

    if (onStatusFilterChange) {
      onStatusFilterChange(newSelected);
    } else {
      setInternalSelectedStatuses(newSelected);
    }
  };

  if (!data) {
    return <div>Loading...</div>;
  }

  const { status, lastUpdate } = data;
  const lastUpdatedText = new Date(lastUpdate).toLocaleString();

  const connectedTotal =
    status.normal + status.warning + status.concern + status.critical;
  const disconnectedTotal = status.standby + status.lost;

  return (
    <div className="w-full flex flex-col md:flex-row gap-4">
      {/* Card 1: Main Summary */}
      <div className="flex-[2] p-2 border-[1px] border-[#374151] rounded-lg bg-[#030616] shadow-md text-white flex flex-col">
        {/* Top Section: Total Sensor Info */}
        <div className="rounded-md p-0 bg-[#030616] mb-2">
          <div className="flex flex-col sm:flex-row items-start justify-between sm:items-center gap-2">
            {/* Left: Total Sensor Info */}
            <div className="min-h-[50px] sm:min-h-[60px] flex flex-col justify-center">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                Connected Sensor Total: {connectedTotal}
              </div>
              <div className="text-[10px] sm:text-xs text-white opacity-80 mt-0.5">
                Latest status of all sensors (Updated at {lastUpdatedText})
              </div>
            </div>

            {/* Right: Buttons (If filter is active) */}
            {activeSelectedStatuses.length > 0 && (
              <button
                onClick={() => {
                  const empty: SensorStatusType[] = [];
                  if (onStatusFilterChange) {
                    onStatusFilterChange(empty);
                  } else {
                    setInternalSelectedStatuses(empty);
                  }
                }}
                className="h-[32px] px-3 text-xs text-muted-foreground hover:text-foreground underline whitespace-nowrap"
              >
                Clear filters ({activeSelectedStatuses.length})
              </button>
            )}
          </div>
        </div>

        {/* Main Statuses Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center flex-1">
          {(
            ["normal", "warning", "concern", "critical"] as SensorStatusType[]
          ).map((key) => {
            const value = status[key];
            const config = statusConfig[key];
            const isSelected = activeSelectedStatuses.includes(key);
            const hasFilterFunction = onStatusFilterChange !== undefined;

            return (
              <div
                key={key}
                onClick={() => hasFilterFunction && handleStatusClick(key)}
                className={cn(
                  "rounded-md bg-card text-card-foreground p-2 flex flex-col justify-center items-center transition-all duration-200 h-full",
                  isSelected ? config.selectedBgColor : config.bgColor,
                  isSelected
                    ? "border-[3px] border-black shadow-[0_8px_25px_rgba(0,0,0,0.9)] scale-105 z-10"
                    : "border-2 border-black",
                  activeSelectedStatuses.length > 0 &&
                    !isSelected &&
                    "opacity-40 scale-95 grayscale-[0.5]",
                  hasFilterFunction &&
                    !isSelected &&
                    "cursor-pointer hover:shadow-md hover:-translate-y-1 hover:scale-105 hover:opacity-100 hover:grayscale-0"
                )}
              >
                <div className="flex items-center gap-2 w-full justify-center">
                  <span
                    className={cn(
                      "text-sm md:text-base font-bold capitalize",
                      config.textColor
                    )}
                  >
                    {key}
                  </span>
                </div>
                <span
                  className={cn(
                    "text-3xl sm:text-4xl font-bold leading-none",
                    config.textColor
                  )}
                >
                  {value}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Card 2: Disconnect Section */}
      <div className="flex-1 p-2 border-[1px] border-[#374151] rounded-lg bg-[#030616] shadow-md text-white flex flex-col">
        <div className="rounded-md p-0 bg-[#030616] mb-2">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="min-h-[50px] sm:min-h-[60px] flex flex-col justify-center">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                Disconnected Sensor Total: {disconnectedTotal}
              </div>
              <div className="text-[10px] sm:text-xs text-transparent select-none mt-0.5">
                Placeholder for alignment
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center flex-1">
          {(["standby", "lost"] as SensorStatusType[]).map((key) => {
            const value = status[key];
            const config = statusConfig[key];
            const isSelected = activeSelectedStatuses.includes(key);
            const hasFilterFunction = onStatusFilterChange !== undefined;

            return (
              <div
                key={key}
                onClick={() => hasFilterFunction && handleStatusClick(key)}
                className={cn(
                  "rounded-md bg-card text-card-foreground p-2 flex flex-col justify-center items-center transition-all duration-200 h-full",
                  isSelected ? config.selectedBgColor : config.bgColor,
                  isSelected
                    ? "border-[3px] border-black shadow-[0_8px_25px_rgba(0,0,0,0.9)] scale-105 z-10"
                    : "border-2 border-black",
                  activeSelectedStatuses.length > 0 &&
                    !isSelected &&
                    "opacity-40 scale-95 grayscale-[0.5]",
                  hasFilterFunction &&
                    !isSelected &&
                    "cursor-pointer hover:shadow-md hover:-translate-y-1 hover:scale-105 hover:opacity-100 hover:grayscale-0"
                )}
              >
                <div className="flex items-center gap-2 w-full justify-center">
                  <span
                    className={cn(
                      "text-sm md:text-base font-bold capitalize",
                      config.textColor
                    )}
                  >
                    {key}
                  </span>
                </div>
                <span
                  className={cn(
                    "text-5xl font-bold leading-none",
                    config.textColor
                  )}
                >
                  {value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SensorStatusSummary;
