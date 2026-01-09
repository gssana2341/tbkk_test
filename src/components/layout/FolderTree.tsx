"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ChevronRight, ChevronDown, Menu } from "lucide-react";
import Box from "@mui/material/Box";
import Popover from "@mui/material/Popover";

import type { Sensor } from "@/lib/types";
import { fetchRealSensors } from "@/lib/data/sensors";
import Image from "next/image";
import { useFolderTree } from "./FolderTreeContext";

// Interface for tree item structure
interface TreeItemData {
  id: string;
  label: string;
  type: "folder" | "file";
  sensorId?: string;
  children?: TreeItemData[];
  sensors?: Sensor[];
  level?: "organization" | "area" | "machine" | "sensor";
}

// Build tree structure from sensors: Organization > Area > Machine > Sensors
function buildTreeFromSensors(sensors: Sensor[]): TreeItemData[] {
  const areaMap = new Map<string, Map<string, Sensor[]>>();

  sensors.forEach((sensor) => {
    const areaName =
      sensor.installation_point?.trim() ||
      sensor.location?.trim() ||
      "Unknown Area";
    const machineName =
      sensor.machine_number?.trim() ||
      sensor.machineName?.trim() ||
      "Unknown Machine";

    if (!areaMap.has(areaName)) areaMap.set(areaName, new Map());
    const machineMap = areaMap.get(areaName)!;

    if (!machineMap.has(machineName)) machineMap.set(machineName, []);
    machineMap.get(machineName)!.push(sensor);
  });

  const areaItems: TreeItemData[] = [];

  areaMap.forEach((machineMap, areaName) => {
    const machineItems: TreeItemData[] = [];
    const sortedMachines = Array.from(machineMap.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], "th", { numeric: true })
    );

    sortedMachines.forEach(([machineName, sensorList]) => {
      const sortedSensors = [...sensorList].sort((a, b) => {
        const nameA = a.sensor_name || a.name || a.serialNumber || a.id || "";
        const nameB = b.sensor_name || b.name || b.serialNumber || b.id || "";
        return nameA.localeCompare(nameB, "th", { numeric: true });
      });

      const sensorItems: TreeItemData[] = sortedSensors.map((sensor) => ({
        id: `sensor-${sensor.id}`,
        label:
          sensor.sensor_name ||
          sensor.name ||
          sensor.serialNumber ||
          sensor.id ||
          "Unknown Sensor",
        type: "file",
        sensorId: sensor.id,
        level: "sensor",
      }));

      machineItems.push({
        id: `machine-${areaName}-${machineName}`,
        label: machineName,
        type: "folder",
        children: sensorItems,
        level: "machine",
        sensors: sortedSensors,
      });
    });

    const allAreaSensors = Array.from(machineMap.values()).flat();
    areaItems.push({
      id: `area-${areaName}`,
      label: areaName,
      type: "folder",
      children: machineItems,
      level: "area",
      sensors: allAreaSensors,
    });
  });

  areaItems.sort((a, b) => a.label.localeCompare(b.label, "th", { numeric: true }));

  return [
    {
      id: "organization",
      label: "Organization",
      type: "folder",
      children: areaItems,
      level: "organization",
      sensors: sensors,
    },
  ];
}

// Helper for first character (for collapsed view)
const getFirstChar = (label: string): string =>
  label?.trim().charAt(0).toUpperCase() || "?";

interface FlatNode {
  id: string;
  label: string;
  type: "folder" | "file";
  depth: number;
  parentId: string | null;
  sensorId?: string;
  childIds: string[];
  allDescendantIds: string[];
  sensorIds: string[];
  path: string[];
}

const FolderTree: React.FC<{
  onFilterChange?: (ids: string[], sensors: Sensor[]) => void;
}> = ({ onFilterChange }) => {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const { collapsed, setCollapsed } = useFolderTree();
  const router = useRouter();
  const pathname = usePathname();

  // Expansion and Selection state - Using Sets for O(1) performance
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // --- Data Fetching ---
  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const data = await fetchRealSensors();
        setSensors(data);
      } catch (e) {
        console.error("Fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const treeData = useMemo(
    () => (sensors.length ? buildTreeFromSensors(sensors) : []),
    [sensors]
  );

  // Transform tree to flat structure once
  const { flatNodes, nodeMap } = useMemo(() => {
    const nodes: FlatNode[] = [];
    const map = new Map<string, FlatNode>();

    const traverse = (
      data: TreeItemData[],
      depth = 0,
      parentId: string | null = null,
      path: string[] = []
    ) => {
      data.forEach((item) => {
        const id = String(item.id);
        const currentPath = [...path, id];
        const flat: FlatNode = {
          id,
          label: item.label,
          type: item.type,
          depth,
          parentId,
          sensorId: item.sensorId,
          childIds: item.children?.map((c) => String(c.id)) || [],
          allDescendantIds: [],
          sensorIds: item.sensorId ? [item.sensorId] : [],
          path: currentPath,
        };

        nodes.push(flat);
        map.set(id, flat);

        if (item.children) {
          traverse(item.children, depth + 1, id, currentPath);
          const childResults = item.children.map((c) => map.get(String(c.id))!);
          flat.allDescendantIds = childResults.flatMap((c) => [
            c.id,
            ...c.allDescendantIds,
          ]);
          flat.sensorIds = Array.from(
            new Set(childResults.flatMap((c) => c.sensorIds))
          );
        }
      });
    };

    traverse(treeData);
    return { flatNodes: nodes, nodeMap: map };
  }, [treeData]);

  // Set default expansion to "All Folders" once data is loaded
  useEffect(() => {
    if (flatNodes.length > 0 && expandedIds.size === 0) {
      const folderIds = flatNodes
        .filter((n) => n.type === "folder")
        .map((n) => n.id);
      setExpandedIds(new Set(folderIds));
    }
  }, [flatNodes]);

  // Derived visible nodes based on expansion
  const visibleNodes = useMemo(() => {
    if (collapsed) return [];
    return flatNodes.filter((node) => {
      if (!node.parentId) return true;
      // All ancestors must be expanded
      return node.path
        .slice(0, -1)
        .every((ancestorId) => expandedIds.has(ancestorId));
    });
  }, [flatNodes, expandedIds, collapsed]);

  // Handle selections
  const handleToggleSelect = useCallback(
    (id: string, checked: boolean) => {
      const node = nodeMap.get(id);
      if (!node) return;

      const newSelected = new Set(selectedIds);
      const targetIds = [id, ...node.allDescendantIds];

      if (checked) {
        targetIds.forEach((targetId) => newSelected.add(targetId));
        // Optionally check parents if all siblings are selected
        let curr = node.parentId;
        while (curr) {
          const p = nodeMap.get(curr);
          if (p && p.childIds.every((cid) => newSelected.has(cid))) {
            newSelected.add(p.id);
            curr = p.parentId;
          } else break;
        }
      } else {
        targetIds.forEach((targetId) => newSelected.delete(targetId));
        // Uncheck all parents
        let curr = node.parentId;
        while (curr) {
          newSelected.delete(curr);
          curr = nodeMap.get(curr)?.parentId || null;
        }
      }
      setSelectedIds(newSelected);
    },
    [selectedIds, nodeMap]
  );

  // Trigger filter change
  useEffect(() => {
    if (!onFilterChange) return;
    const selectedArray = Array.from(selectedIds);
    const selectedSensors: Sensor[] = [];
    const processedSensorIds = new Set<string>();

    selectedArray.forEach((id) => {
      const node = nodeMap.get(id);
      if (node?.sensorId) {
        if (!processedSensorIds.has(node.sensorId)) {
          const s = sensors.find((s) => s.id === node.sensorId);
          if (s) {
            selectedSensors.push(s);
            processedSensorIds.add(node.sensorId);
          }
        }
      } else if (node?.sensorIds) {
        node.sensorIds.forEach((sid) => {
          if (!processedSensorIds.has(sid)) {
            const s = sensors.find((s) => s.id === sid);
            if (s) {
              selectedSensors.push(s);
              processedSensorIds.add(sid);
            }
          }
        });
      }
    });
    onFilterChange(selectedArray, selectedSensors);
  }, [selectedIds, nodeMap, sensors, onFilterChange]);

  const handleItemClick = (id: string, sensorId?: string) => {
    setSelectedIds(new Set([id]));
    if (pathname !== "/") router.push("/");
    if (sensorId) setCollapsed(true);
  };

  // --- Popover (for summary) ---
  const [popover, setPopover] = useState<{
    anchor: HTMLElement | null;
    id: string | null;
  }>({ anchor: null, id: null });
  const handlePopoverOpen = (
    event: React.MouseEvent<HTMLElement>,
    id: string
  ) => {
    setPopover({ anchor: event.currentTarget, id });
  };
  const handlePopoverClose = () => setPopover({ anchor: null, id: null });

  const renderSummary = (id: string) => {
    const node = nodeMap.get(id);
    if (!node || node.type !== "folder") return null;

    // Efficiently count status from sensorIds
    const folderSensors = sensors.filter((s) => node.sensorIds.includes(s.id));
    const counts = folderSensors.reduce(
      (acc, s) => {
        const status = String(s.status || "").toLowerCase();
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return (
      <div className="p-4 bg-[#1f2937] text-white rounded-lg border border-[#374151] shadow-xl min-w-[200px]">
        <div className="font-bold border-b border-gray-600 pb-2 mb-2">
          {node.label}
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Total:</span>{" "}
            <span className="font-mono">{folderSensors.length}</span>
          </div>
          <div className="flex justify-between text-green-400">
            <span>Normal:</span>{" "}
            <span className="font-mono">{counts.ok || 0}</span>
          </div>
          <div className="flex justify-between text-yellow-400">
            <span>Warning:</span>{" "}
            <span className="font-mono">{counts.warning || 0}</span>
          </div>
          <div className="flex justify-between text-orange-400">
            <span>Concern:</span>{" "}
            <span className="font-mono">{counts.concern || 0}</span>
          </div>
          <div className="flex justify-between text-red-500">
            <span>Critical:</span>{" "}
            <span className="font-mono">{counts.critical || 0}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Standby:</span>{" "}
            <span className="font-mono">{counts.standby || 0}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Lost:</span>{" "}
            <span className="font-mono">{counts.lost || 0}</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading)
    return (
      <div className="h-full bg-[#030616] border-r border-[#374151] flex flex-col items-center pt-4">
        <Menu className="text-white mb-4 animate-pulse" />
        {!collapsed && (
          <span className="text-gray-400 text-sm">Loading Tree...</span>
        )}
      </div>
    );

  return (
    <div
      className={`h-full bg-[#030616] border-r border-[#374151] flex flex-col transition-all duration-300 ${collapsed ? "w-[52px]" : "w-64"}`}
    >
      {/* Header / Toggle */}
      <div
        className={`flex items-center transition-all duration-300 ${collapsed ? "justify-center p-2" : "justify-end p-4"}`}
      >
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-md hover:bg-white/10 text-white transition-colors flex items-center justify-center"
        >
          {collapsed ? (
            <Menu size={20} />
          ) : (
            <Image
              src="/Group 639.png"
              alt="close"
              width={20}
              height={20}
              className="invert"
            />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2 p-2">
            {flatNodes
              .filter((n) => n.type === "folder" && n.depth <= 2)
              .map((node) => (
                <div
                  key={node.id}
                  className="w-8 h-8 flex items-center justify-center bg-blue-500/10 rounded-lg text-white font-bold text-xs cursor-pointer hover:bg-blue-500/30 transition-all hover:scale-110"
                  title={node.label}
                  onMouseEnter={(e) => handlePopoverOpen(e, node.id)}
                  onMouseLeave={handlePopoverClose}
                >
                  {getFirstChar(node.label)}
                </div>
              ))}
          </div>
        ) : (
          <div className="py-2">
            {visibleNodes.map((node) => {
              const isExpanded = expandedIds.has(node.id);
              const isSelected = selectedIds.has(node.id);

              return (
                <div
                  key={node.id}
                  className={`flex items-center group py-1 px-4 cursor-pointer hover:bg-white/5 transition-colors ${isSelected ? "bg-blue-500/10" : ""}`}
                  style={{ paddingLeft: `${node.depth * 16 + 16}px` }}
                  onClick={() => handleItemClick(node.id, node.sensorId)}
                >
                  <div className="flex items-center gap-2 mr-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-600 bg-transparent text-blue-600 focus:ring-blue-500 cursor-pointer"
                      checked={isSelected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        handleToggleSelect(node.id, e.target.checked)
                      }
                    />
                  </div>

                  {node.type === "folder" ? (
                    <button
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = new Set(expandedIds);
                        if (isExpanded) next.delete(node.id);
                        else next.add(node.id);
                        setExpandedIds(next);
                      }}
                    >
                      {isExpanded ? (
                        <ChevronDown size={16} className="text-white" />
                      ) : (
                        <ChevronRight size={16} className="text-white" />
                      )}
                    </button>
                  ) : (
                    <div className="w-5 mr-1" />
                  )}

                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-white text-sm truncate select-none">
                      {node.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary Popover */}
      {popover.id && (
        <Popover
          open={Boolean(popover.anchor)}
          anchorEl={popover.anchor}
          onClose={handlePopoverClose}
          anchorOrigin={{ vertical: "center", horizontal: "right" }}
          transformOrigin={{ vertical: "center", horizontal: "left" }}
          sx={{ pointerEvents: "none" }}
          PaperProps={{
            sx: {
              pointerEvents: "auto",
              background: "transparent",
              boxShadow: "none",
            },
          }}
        >
          {renderSummary(popover.id)}
        </Popover>
      )}
    </div>
  );
};

export default FolderTree;
