"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ChevronRight, ChevronDown, Loader2, X } from "lucide-react";
import Box from "@mui/material/Box";
import Popover from "@mui/material/Popover";
import { Virtuoso } from "react-virtuoso";

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
      sensor.area?.trim() ||
      sensor.location?.trim() ||
      sensor.installation_point?.trim() ||
      "Unknown Area";
    const machineName =
      sensor.machine?.trim() ||
      sensor.machineName?.trim() ||
      sensor.machine_number?.trim() ||
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

  areaItems.sort((a, b) =>
    a.label.localeCompare(b.label, "th", { numeric: true })
  );

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
  onClose?: () => void;
}> = ({ onFilterChange, onClose }) => {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const { collapsed, setCollapsed } = useFolderTree();
  const router = useRouter();
  const pathname = usePathname();

  // Expansion and Selection state - Using Sets for O(1) performance
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(["organization"])
  );
  const [tempSelectedIds, setTempSelectedIds] = useState<Set<string>>(
    new Set(["organization"])
  );

  const hasSelections = useMemo(() => {
    return Array.from(tempSelectedIds).some((id) => id !== "organization");
  }, [tempSelectedIds]);

  // --- Data Fetching ---
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchRealSensors(true);
      setSensors(data);
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const handleRefresh = () => fetchAll();
    window.addEventListener("REFRESH_SENSORS", handleRefresh);
    return () => window.removeEventListener("REFRESH_SENSORS", handleRefresh);
  }, [fetchAll]);

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

  // Initialize selection once on load
  const hasInitializedSelection = React.useRef(false);

  useEffect(() => {
    if (flatNodes.length > 0 && expandedIds.size === 0) {
      const folderIds = flatNodes
        .filter((n) => n.type === "folder")
        .map((n) => n.id);
      setExpandedIds(new Set(folderIds));
    }
  }, [flatNodes]);

  useEffect(() => {
    if (flatNodes.length > 0 && !hasInitializedSelection.current) {
      hasInitializedSelection.current = true;
      const savedIdsStr = localStorage.getItem("folder_tree_selected_ids");
      if (savedIdsStr) {
        try {
          const savedIds = JSON.parse(savedIdsStr);
          if (Array.isArray(savedIds) && savedIds.length > 0) {
            const newSet = new Set<string>(savedIds);
            setSelectedIds(newSet);
            setTempSelectedIds(newSet);
            return;
          }
        } catch (e) {
          // ignore
        }
      }

      // Default fallback
      const mode = localStorage.getItem("dashboard_area_mode") || "first_only";
      if (mode === "first_only") {
        const firstArea = flatNodes.find((n) => n.parentId === "organization");
        if (firstArea) {
          const newSet = new Set([firstArea.id]);
          setSelectedIds(newSet);
          setTempSelectedIds(newSet);
        }
      } else {
        const newSet = new Set(["organization"]);
        setSelectedIds(newSet);
        setTempSelectedIds(newSet);
      }
    }
  }, [flatNodes]);

  // Derived visible nodes based on expansion
  const visibleNodes = useMemo(() => {
    if (collapsed) return [];
    return flatNodes.filter((node) => {
      // Hide the root "organization" node
      if (node.id === "organization") return false;

      if (!node.parentId) return true;
      // All ancestors must be expanded
      return node.path
        .slice(0, -1)
        .every((ancestorId) => ancestorId === "organization" || expandedIds.has(ancestorId));
    });
  }, [flatNodes, expandedIds, collapsed]);

  // Handle selections
  const handleToggleSelect = useCallback(
    (id: string, checked: boolean) => {
      const node = nodeMap.get(id);
      if (!node) return;

      const newSelected = new Set<string>();
      const targetIds = [id, ...node.allDescendantIds];

      if (checked) {
        targetIds.forEach((targetId) => newSelected.add(targetId));
      } else {
        // Fallback to organization if unchecked
        newSelected.add("organization");
      }
      
      setTempSelectedIds(newSelected);
      setSelectedIds(newSelected);
      localStorage.setItem("folder_tree_selected_ids", JSON.stringify(Array.from(newSelected)));
    },
    [nodeMap]
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
        const strSensorId = String(node.sensorId);
        if (!processedSensorIds.has(strSensorId)) {
          const s = sensors.find((s) => String(s.id) === strSensorId);
          if (s) {
            selectedSensors.push(s);
            processedSensorIds.add(strSensorId);
          }
        }
      } else if (node?.sensorIds) {
        node.sensorIds.forEach((sid) => {
          const strSid = String(sid);
          if (!processedSensorIds.has(strSid)) {
            const s = sensors.find((s) => String(s.id) === strSid);
            if (s) {
              selectedSensors.push(s);
              processedSensorIds.add(strSid);
            }
          }
        });
      }
    });
    onFilterChange(selectedArray, selectedSensors);
  }, [selectedIds, nodeMap, sensors, onFilterChange]);

  const handleItemClick = useCallback(
    (id: string, sensorId?: string) => {
      const newSet = new Set([id]);
      setTempSelectedIds(newSet);
      setSelectedIds(newSet);
      localStorage.setItem("folder_tree_selected_ids", JSON.stringify(Array.from(newSet)));
      if (pathname !== "/") router.push("/");
      if (sensorId) setCollapsed(true);
    },
    [pathname, router, setCollapsed]
  );

  const handleRowClick = useCallback(
    (id: string, checked: boolean) => {
      handleToggleSelect(id, checked);
      if (pathname !== "/") router.push("/");
    },
    [handleToggleSelect, pathname, router]
  );

  const handleApply = useCallback(() => {
    setSelectedIds(new Set(tempSelectedIds));
    if (onClose) onClose();
  }, [tempSelectedIds, onClose]);

  const handleClearAll = useCallback(() => {
    setTempSelectedIds(new Set());
  }, []);

  // Listen for external "Select All" trigger
  useEffect(() => {
    const handleSelectAll = (e: any) => {
      const isSelected = selectedIds.has("organization");
      if (isSelected) {
        // Toggle off
        const emptySet = new Set<string>();
        setSelectedIds(emptySet);
        setTempSelectedIds(emptySet);
        localStorage.setItem("folder_tree_selected_ids", JSON.stringify([]));
      } else {
        // Toggle on
        handleItemClick("organization");
      }
    };
    window.addEventListener("SELECT_ORGANIZATION", handleSelectAll);
    return () => {
      window.removeEventListener("SELECT_ORGANIZATION", handleSelectAll);
    };
  }, [handleItemClick, selectedIds]);

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
      <div className="h-full bg-[#0B1121] border-r border-[#374151] flex flex-col items-center justify-center pt-8">
        <Loader2 className="text-blue-500 mb-4 animate-spin h-6 w-6" />
        {!collapsed && (
          <span className="text-gray-400 text-sm">Loading Tree...</span>
        )}
      </div>
    );

  return (
    <div className="h-full w-64 bg-[#0B1121] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#1f2937]">
        <span className="text-white font-semibold text-sm">
          Organization Tree
        </span>
        <div className="flex items-center gap-2">
          {/* Apply button removed as selection auto-applies */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors md:hidden"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Virtuoso
          style={{ height: '100%', width: '100%' }}
          data={visibleNodes}
          className="no-scrollbar py-2"
          itemContent={(index, node) => {
            const isExpanded = expandedIds.has(node.id);
            const isTempSelected = tempSelectedIds.has(node.id);
            const visualDepth = Math.max(0, node.depth - 1);

            return (
              <div
                key={node.id}
                className={`flex items-center group py-1 px-4 cursor-pointer hover:bg-white/5 transition-colors relative ${isTempSelected ? "bg-[#161E28]" : ""}`}
                onClick={() => handleRowClick(node.id, !isTempSelected)}
              >
                {/* Hierarchy Lines */}
                {Array.from({ length: visualDepth }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-[1px] bg-gray-700 h-full top-0"
                    style={{ left: `${i * 16 + 24}px` }}
                  />
                ))}

                <div
                  className="flex items-center w-full"
                  style={{ paddingLeft: `${visualDepth * 16}px` }}
                >
                  <div className="flex items-center gap-2 mr-2 shrink-0">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-600 bg-transparent text-blue-600 focus:ring-blue-500 cursor-pointer"
                      checked={isTempSelected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        handleToggleSelect(node.id, e.target.checked)
                      }
                    />
                  </div>

                  {node.type === "folder" ? (
                    <button
                      className="p-1 hover:bg-white/10 rounded transition-colors shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = new Set(expandedIds);
                        if (isExpanded) next.delete(node.id);
                        else next.add(node.id);
                        setExpandedIds(next);
                      }}
                    >
                      {isExpanded ? (
                        <ChevronDown size={14} className="text-white" />
                      ) : (
                        <ChevronRight size={14} className="text-white" />
                      )}
                    </button>
                  ) : (
                    <div className="w-6 mr-0 shrink-0" />
                  )}

                  <div className="flex items-center gap-2 overflow-hidden min-w-0">
                    <span className="text-white text-sm truncate select-none">
                      {node.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          }}
        />
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
