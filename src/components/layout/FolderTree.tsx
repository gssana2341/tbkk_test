"use client";
import React, { useEffect, useState, useMemo } from "react";

import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { TreeItem } from "@mui/x-tree-view/TreeItem";
import Checkbox from "@mui/material/Checkbox";
import { TreeViewBaseItem } from "@mui/x-tree-view/models";
import Box from "@mui/material/Box";
import Popover from "@mui/material/Popover";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useRouter, usePathname } from "next/navigation";
import type { Sensor } from "@/lib/types";
import { fetchRealSensors } from "@/lib/data/sensors";
import Image from "next/image";
import { Menu } from "lucide-react";
import { useFolderTree } from "./FolderTreeContext";

// Create a custom MUI theme for dark mode
const darkTheme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#030616",
      paper: "#030616",
    },
    text: {
      primary: "#ffffff",
      secondary: "#a1a3a4",
    },
  },
});

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
  // Structure: Organization > Area > Machine > Sensors
  // Use names directly from API without modification

  // Group sensors by area (installation_point or location)
  const areaMap = new Map<string, Map<string, Sensor[]>>();

  sensors.forEach((sensor) => {
    // Get area name directly from API (installation_point or location)
    const areaName =
      sensor.installation_point &&
        typeof sensor.installation_point === "string" &&
        sensor.installation_point.trim()
        ? sensor.installation_point.trim()
        : sensor.location &&
          typeof sensor.location === "string" &&
          sensor.location.trim()
          ? sensor.location.trim()
          : "Unknown Area";

    // Get machine name directly from API
    const machineName =
      sensor.machine_number &&
        typeof sensor.machine_number === "string" &&
        sensor.machine_number.trim()
        ? sensor.machine_number.trim()
        : sensor.machineName &&
          typeof sensor.machineName === "string" &&
          sensor.machineName.trim()
          ? sensor.machineName.trim()
          : "Unknown Machine";

    if (!areaMap.has(areaName)) {
      areaMap.set(areaName, new Map());
    }
    const machineMap = areaMap.get(areaName)!;

    if (!machineMap.has(machineName)) {
      machineMap.set(machineName, []);
    }
    machineMap.get(machineName)!.push(sensor);
  });

  // Convert to tree structure
  const areaItems: TreeItemData[] = [];

  areaMap.forEach((machineMap, areaName) => {
    const machineItems: TreeItemData[] = [];

    // Sort machines by name
    const sortedMachines = Array.from(machineMap.entries()).sort((a, b) => {
      return a[0].localeCompare(b[0], "th");
    });

    sortedMachines.forEach(([machineName, sensorList]) => {
      // Sort sensors by name
      const sortedSensors = [...sensorList].sort((a, b) => {
        const nameA = a.sensor_name || a.name || a.serialNumber || a.id || "";
        const nameB = b.sensor_name || b.name || b.serialNumber || b.id || "";
        return nameA.localeCompare(nameB, "th");
      });

      // Create sensor items using actual sensor names from API
      const sensorItems: TreeItemData[] = sortedSensors.map((sensor) => {
        // Use sensor name directly from API
        const sensorName =
          sensor.sensor_name ||
          sensor.name ||
          sensor.serialNumber ||
          sensor.id ||
          "Unknown Sensor";

        return {
          id: `sensor-${sensor.id}`,
          label: sensorName,
          type: "file" as const,
          sensorId: sensor.id,
          level: "sensor",
        };
      });

      machineItems.push({
        id: `machine-${areaName}-${machineName}`,
        label: machineName,
        type: "folder" as const,
        children: sensorItems,
        level: "machine",
        sensors: sortedSensors,
      });
    });

    const allAreaSensors = Array.from(machineMap.values()).flat();

    areaItems.push({
      id: `area-${areaName}`,
      label: areaName,
      type: "folder" as const,
      children: machineItems,
      level: "area",
      sensors: allAreaSensors,
    });
  });

  // Sort areas by name
  areaItems.sort((a, b) => {
    return a.label.localeCompare(b.label, "th");
  });

  // Create Organization node
  const allOrgSensors = sensors;
  const organizationItem: TreeItemData = {
    id: "organization",
    label: "Organization",
    type: "folder" as const,
    children: areaItems,
    level: "organization",
    sensors: allOrgSensors,
  };

  return [organizationItem];
}

// Toggle Button Component
const ToggleButton: React.FC<{
  collapsed: boolean;
  onToggle: () => void;
}> = ({ collapsed, onToggle }) => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "flex-end",
      alignItems: "center",
      padding: "12px",
    }}
  >
    <button
      onClick={onToggle}
      className="p-2 rounded-md hover:bg-gray-700 text-white"
    >
      {collapsed ? (
        <Menu size={20} className="text-white" />
      ) : (
        <Image
          src="/Group 639.png"
          alt="close"
          width={20}
          height={20}
          style={{ filter: "brightness(0) invert(1)" }}
        />
      )}
    </button>
  </Box>
);

interface FolderTreeProps {
  onFilterChange?: (ids: string[], sensors: Sensor[]) => void;
}

const FolderTree: React.FC<FolderTreeProps> = ({ onFilterChange }) => {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const { collapsed, setCollapsed } = useFolderTree();
  const router = useRouter();
  const pathname = usePathname();

  // --- Popover state and handlers (must be outside JSX/return) ---
  const [popover, setPopover] = React.useState<{
    anchor: HTMLElement | null;
    id: string | null;
  }>({ anchor: null, id: null });

  const handlePopoverClose = () => {
    setPopover({ anchor: null, id: null });
  };
  const renderSummary = (item: TreeItemData) => {
    if (!(item.type === "folder" && item.sensors && item.sensors.length > 0))
      return null;
    const total = item.sensors.length;
    let normal = 0,
      warning = 0,
      concern = 0,
      critical = 0,
      standby = 0,
      lost = 0;
    item.sensors.forEach((sensor) => {
      const status = String(sensor.status ?? "");
      switch (status) {
        case "ok":
          normal++;
          break;
        case "warning":
          warning++;
          break;
        case "critical":
          critical++;
          break;
        case "standby":
          standby++;
          break;
        case "lost":
          lost++;
          break;
        case "concern":
          concern++;
          break;
        default:
          break;
      }
    });
    return (
      <Box sx={{ p: 1, minWidth: 180 }}>
        <div style={{ fontWeight: 600 }}>{item.label} - Summary</div>
        <div style={{ fontSize: 13 }}>
          Total Sensors: <b>{total}</b>
        </div>
        <div
          style={{ display: "flex", flexWrap: "wrap", fontSize: 13, gap: 8 }}
        >
          <div>
            Normal: <b>{normal}</b>
          </div>
          <div>
            Warning: <b>{warning}</b>
          </div>
          <div>
            Concern: <b>{concern}</b>
          </div>
          <div>
            Critical: <b>{critical}</b>
          </div>
          <div>
            Standby: <b>{standby}</b>
          </div>
          <div>
            Lost: <b>{lost}</b>
          </div>
        </div>
      </Box>
    );
  };

  useEffect(() => {
    const fetchAllSensors = async () => {
      try {
        setLoading(true);
        // Fetch sensors from API
        const fetchedSensors = await fetchRealSensors();
        setSensors(fetchedSensors);
      } catch (error) {
        console.error("Error fetching sensors:", error);
        setSensors([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    };

    fetchAllSensors();
  }, []);

  const treeItems = useMemo(() => {
    if (sensors.length === 0) return [];
    return buildTreeFromSensors(sensors);
  }, [sensors]);

  // Create sensorId mapping for click handling
  const sensorIdMap = useMemo(() => {
    const map = new Map<string, string>();
    const traverse = (nodes: TreeItemData[]) => {
      nodes.forEach((node) => {
        if (node.sensorId) {
          map.set(String(node.id), node.sensorId);
        }
        if (node.children) {
          traverse(node.children);
        }
      });
    };
    traverse(treeItems);
    return map;
  }, [treeItems]);

  // Convert tree items to TreeViewBaseItem format
  const items = useMemo(() => {
    const convertToItems = (nodes: TreeItemData[]): TreeViewBaseItem[] => {
      return nodes.map((node) => {
        const item: TreeViewBaseItem = {
          id: String(node.id),
          label: String(node.label || node.id || "Untitled"),
        };
        if (node.children && node.children.length > 0) {
          item.children = convertToItems(node.children);
        }
        return item;
      });
    };
    return convertToItems(treeItems);
  }, [treeItems]);

  // Get expanded items (all folders)
  const defaultExpandedItems = useMemo(() => {
    const getAllFolderIds = (nodes: TreeItemData[]): string[] => {
      const ids: string[] = [];
      nodes.forEach((node) => {
        if (node.type === "folder") {
          ids.push(String(node.id));
        }
        if (node.children && node.children.length > 0) {
          ids.push(...getAllFolderIds(node.children));
        }
      });
      return ids;
    };
    return getAllFolderIds(treeItems);
  }, [treeItems]);

  // Function to get first character of label
  const getFirstChar = (label: string): string => {
    if (!label || label.length === 0) return "?";
    // Get first character, handle Thai characters properly
    const firstChar = label.trim().charAt(0);
    return firstChar.toUpperCase();
  };

  // Collect items for collapsed view (folders and sensors)
  const getItemsForCollapsed = (
    nodes: TreeItemData[],
    maxDepth: number = 3,
    includeSensors: boolean = false
  ): TreeItemData[] => {
    const items: TreeItemData[] = [];
    const collectItems = (nodes: TreeItemData[], depth: number = 0): void => {
      if (depth > maxDepth) return;
      nodes.forEach((node) => {
        // Include folders
        if (node.type === "folder") {
          items.push(node);
          // Recursively collect child items
          if (node.children && node.children.length > 0) {
            collectItems(node.children, depth + 1);
          }
        } else if (includeSensors && node.type === "file" && node.sensorId) {
          // Include sensor files if enabled
          items.push(node);
        }
      });
    };
    collectItems(nodes);
    return items;
  };

  // Get items for collapsed view (show first character only)
  // Include folders (Organization, Area, Machine) and optionally sensors
  const collapsedItems = useMemo(() => {
    return getItemsForCollapsed(treeItems, 2, false); // Show folders only, set to true to include sensors
  }, [treeItems]);

  // Helper to get sensors from selected IDs
  const getSensorsFromIds = (
    ids: string[],
    nodes: TreeItemData[]
  ): Sensor[] => {
    const selectedSensors: Sensor[] = [];
    const idSet = new Set(ids);

    const traverse = (node: TreeItemData) => {
      if (idSet.has(node.id)) {
        if (node.sensors && node.sensors.length > 0) {
          selectedSensors.push(...node.sensors);
        } else if (node.sensorId) {
          // It's a sensor node
          const sensor = sensors.find((s) => s.id === node.sensorId);
          if (sensor) selectedSensors.push(sensor);
        }
        // If parent is selected, we assume all children are covered (since node.sensors includes them)
        // So we don't traverse children to avoid duplicates
      } else {
        // Parent not selected, check children
        if (node.children) {
          node.children.forEach(traverse);
        }
      }
    };
    nodes.forEach(traverse);

    // Remove duplicates
    const uniqueSensors = Array.from(
      new Map(selectedSensors.map((s) => [s.id, s])).values()
    );
    return uniqueSensors;
  };

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Ensure card view updates immediately when selectedIds changes
  useEffect(() => {
    // Always update card view when selectedIds changes
    let selectedSensors: Sensor[] = [];
    if (selectedIds.length > 0) {
      selectedSensors = getSensorsFromIds(selectedIds, treeItems);
    }
    if (onFilterChange) {
      onFilterChange(selectedIds, selectedSensors);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, treeItems]);

  const handleCheckboxChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    nodeId: string
  ) => {
    event.stopPropagation();
    const checked = event.target.checked;

    let newSelectedIds: string[] = [];
    // Helper: collect all ids under a node (including itself)
    const collectAllIds = (nodes: TreeItemData[]): string[] => {
      let ids: string[] = [];
      nodes.forEach((node) => {
        ids.push(node.id);
        if (node.children) {
          ids = ids.concat(collectAllIds(node.children));
        }
      });
      return ids;
    };

    // Find node by id
    const findNodeById = (
      nodes: TreeItemData[],
      id: string
    ): TreeItemData | null => {
      for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
          const found = findNodeById(node.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    if (nodeId === "organization") {
      const allIds = collectAllIds(treeItems);
      const allSelected = allIds.every((id) => selectedIds.includes(id));
      if (!allSelected) {
        newSelectedIds = allIds;
      } else {
        // Unselect all: clear all ids
        newSelectedIds = [];
      }
    } else {
      // Check if node is area
      const node = findNodeById(treeItems, nodeId);
      if (node && node.level === "area") {
        const areaIds = collectAllIds([node]);
        const allAreaSelected = areaIds.every((id) => selectedIds.includes(id));
        if (checked && !allAreaSelected) {
          // Add all ids under this area
          newSelectedIds = Array.from(new Set([...selectedIds, ...areaIds]));
        } else {
          // Remove all ids under this area (including itself and children)
          newSelectedIds = selectedIds.filter((id) => !areaIds.includes(id));
          // If organization was selected, but now not all children are selected, uncheck organization
          const allOrgIds = collectAllIds(treeItems);
          const allOrgSelected = allOrgIds.every((id) =>
            newSelectedIds.includes(id)
          );
          if (!allOrgSelected && newSelectedIds.includes("organization")) {
            newSelectedIds = newSelectedIds.filter(
              (id) => id !== "organization"
            );
          }
        }
      } else if (node && node.level === "machine") {
        // Handle machine: remove all sensors under this machine
        const machineIds = collectAllIds([node]);
        const allMachineSelected = machineIds.every((id) =>
          selectedIds.includes(id)
        );
        if (checked && !allMachineSelected) {
          // Add all ids under this machine
          newSelectedIds = Array.from(new Set([...selectedIds, ...machineIds]));
        } else {
          // Remove all ids under this machine (including itself and children)
          newSelectedIds = selectedIds.filter((id) => !machineIds.includes(id));
          // If organization or area was selected, but now not all children are selected, uncheck them
          const allOrgIds = collectAllIds(treeItems);
          const allOrgSelected = allOrgIds.every((id) =>
            newSelectedIds.includes(id)
          );
          if (!allOrgSelected && newSelectedIds.includes("organization")) {
            newSelectedIds = newSelectedIds.filter(
              (id) => id !== "organization"
            );
          }
          // Find parent area
          const parentArea = treeItems[0].children?.find((area) =>
            area.children?.some((m) => m.id === nodeId)
          );
          if (parentArea) {
            const areaIds = collectAllIds([parentArea]);
            const allAreaSelected = areaIds.every((id) =>
              newSelectedIds.includes(id)
            );
            if (!allAreaSelected && newSelectedIds.includes(parentArea.id)) {
              newSelectedIds = newSelectedIds.filter(
                (id) => id !== parentArea.id
              );
            }
          }
        }
      } else if (node && node.level === "sensor") {
        // Handle sensor: remove only this sensor
        if (checked) {
          newSelectedIds = Array.from(new Set([...selectedIds, nodeId]));
        } else {
          newSelectedIds = selectedIds.filter((id) => id !== nodeId);
          // Uncheck parent machine/area/organization if not all children are selected
          // Find parent machine
          let parentMachine = null;
          let parentArea = null;
          if (treeItems[0]?.children) {
            for (const area of treeItems[0].children) {
              if (area.children) {
                for (const machine of area.children) {
                  if (
                    machine.children &&
                    machine.children.some((s) => s.id === nodeId)
                  ) {
                    parentMachine = machine;
                    parentArea = area;
                    break;
                  }
                }
              }
            }
          }
          if (parentMachine) {
            const machineIds = collectAllIds([parentMachine]);
            const allMachineSelected = machineIds.every((id) =>
              newSelectedIds.includes(id)
            );
            if (
              !allMachineSelected &&
              newSelectedIds.includes(parentMachine.id)
            ) {
              newSelectedIds = newSelectedIds.filter(
                (id) => id !== parentMachine.id
              );
            }
          }
          if (parentArea) {
            const areaIds = collectAllIds([parentArea]);
            const allAreaSelected = areaIds.every((id) =>
              newSelectedIds.includes(id)
            );
            if (!allAreaSelected && newSelectedIds.includes(parentArea.id)) {
              newSelectedIds = newSelectedIds.filter(
                (id) => id !== parentArea.id
              );
            }
          }
          const allOrgIds = collectAllIds(treeItems);
          const allOrgSelected = allOrgIds.every((id) =>
            newSelectedIds.includes(id)
          );
          if (!allOrgSelected && newSelectedIds.includes("organization")) {
            newSelectedIds = newSelectedIds.filter(
              (id) => id !== "organization"
            );
          }
        }
      } else {
        // Toggle individual item as before
        if (checked) {
          newSelectedIds = Array.from(new Set([...selectedIds, nodeId]));
        } else {
          newSelectedIds = selectedIds.filter((id) => id !== nodeId);
        }
      }
    }

    setSelectedIds(newSelectedIds);
    // No need to call onFilterChange here, useEffect above will handle it after state updates

    // Show card view below tree when checked
    // No navigation, just update selectedIds
  };

  const renderTree = (nodes: TreeItemData[]) =>
    nodes.map((node) => (
      <TreeItem
        key={node.id}
        itemId={node.id}
        label={
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Checkbox
              checked={selectedIds.includes(node.id)}
              onChange={(e) => handleCheckboxChange(e, node.id)}
              size="small"
              sx={{
                color: "#cfd8dc",
                backgroundColor: "transparent",
                borderRadius: "4px",
                boxSizing: "border-box",
                padding: "2px",
                marginRight: "4px",
                transition: "background 0.2s",
                border: "none",
                "& .MuiSvgIcon-root": {
                  borderRadius: "4px",
                  backgroundColor: selectedIds.includes(node.id)
                    ? "#2563eb"
                    : "#11171F",
                  color: selectedIds.includes(node.id) ? "#fff" : "#cfd8dc",
                  boxShadow: "none",
                  width: 18,
                  height: 18,
                  border: "2px solid #374151",
                },
                "&.Mui-checked": {
                  color: "#fff",
                  backgroundColor: "transparent",
                },
              }}
            />
            <Box component="span" sx={{ flexGrow: 1 }}>
              {node.label}
            </Box>
          </Box>
        }
      >
        {Array.isArray(node.children) ? renderTree(node.children) : null}
      </TreeItem>
    ));

  const handleItemClick = (event: React.SyntheticEvent, itemId: string) => {
    // 1. Select the item (filter dashboard)
    setSelectedIds([itemId]);

    // 2. Navigate to dashboard if not already there
    if (pathname !== "/") {
      router.push("/");
    }

    // 3. Check if it's a sensor node
    const sensorId = sensorIdMap.get(itemId);
    if (sensorId) {
      // Only collapse sidebar if it's a sensor
      setCollapsed(true);
    }
  };

  if (loading) {
    return (
      <ThemeProvider theme={darkTheme}>
        <Box
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#030616",
            border: "1.35px solid #374151",
          }}
        >
          <ToggleButton
            collapsed={collapsed}
            onToggle={() => setCollapsed(!collapsed)}
          />

          {!collapsed && (
            <Box
              sx={{
                padding: "16px",
                color: "text.secondary",
                fontSize: "0.875rem",
              }}
            >
              Loading sensors...
            </Box>
          )}
        </Box>
      </ThemeProvider>
    );
  }

  if (treeItems.length === 0) {
    return (
      <ThemeProvider theme={darkTheme}>
        <Box
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#030616",
            border: "1.35px solid #374151",
          }}
        >
          <ToggleButton
            collapsed={collapsed}
            onToggle={() => setCollapsed(!collapsed)}
          />

          {!collapsed && (
            <Box
              sx={{
                padding: "16px",
                color: "text.secondary",
                fontSize: "0.875rem",
              }}
            >
              No sensors found
            </Box>
          )}
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <Box
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#030616",
          borderRight: "1.35px solid #374151",
        }}
      >
        <ToggleButton
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
        />

        {collapsed ? (
          /* Collapsed view - show first character of each item */
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              padding: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              "&::-webkit-scrollbar": {
                width: "4px",
              },
              "&::-webkit-scrollbar-track": {
                backgroundColor: "#111827",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "#374151",
                borderRadius: "2px",
                "&:hover": {
                  backgroundColor: "#4b5563",
                },
              },
            }}
          >
            {/* Collapsed view with checkboxes for multi-select */}
            {collapsedItems.map((item) => {
              const firstChar = getFirstChar(item.label);
              const isFolder = item.type === "folder";
              const summary = renderSummary(item);
              return (
                <React.Fragment key={item.id}>
                  <Box
                    sx={{
                      width: "32px",
                      height: "32px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isFolder
                        ? "rgba(96, 165, 250, 0.2)"
                        : "rgba(148, 163, 184, 0.2)",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: isFolder ? 600 : 400,
                      color: "#ffffff",
                      marginBottom: "4px",
                      transition: "all 0.2s",
                      "&:hover": {
                        backgroundColor: isFolder
                          ? "rgba(96, 165, 250, 0.5)"
                          : "rgba(148, 163, 184, 0.5)",
                        transform: "scale(1.15)",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                      },
                      "&:active": {
                        transform: "scale(1.05)",
                      },
                    }}
                    title={item.label}
                  >
                    {firstChar}
                  </Box>
                  {popover.id === item.id && (
                    <Popover
                      open={Boolean(popover.anchor)}
                      anchorEl={popover.anchor}
                      onClose={handlePopoverClose}
                      anchorOrigin={{
                        vertical: "bottom",
                        horizontal: "right",
                      }}
                      transformOrigin={{
                        vertical: "top",
                        horizontal: "left",
                      }}
                      disableRestoreFocus
                      sx={{ pointerEvents: "none" }}
                      PaperProps={{
                        sx: {
                          pointerEvents: "auto",
                          background: "#1f2937",
                          color: "#fff",
                          borderRadius: 2,
                          boxShadow: 3,
                          border: "1px solid #374151",
                        },
                      }}
                    >
                      {summary}
                    </Popover>
                  )}
                </React.Fragment>
              );
            })}
          </Box>
        ) : (
          /* Full tree view */
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              padding: "8px",
              "&::-webkit-scrollbar": {
                width: "8px",
              },
              "&::-webkit-scrollbar-track": {
                backgroundColor: "#111827",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "#374151",
                borderRadius: "4px",
                "&:hover": {
                  backgroundColor: "#4b5563",
                },
              },
            }}
          >
            <SimpleTreeView
              expansionTrigger="iconContainer"
              defaultExpandedItems={defaultExpandedItems}
              onItemClick={handleItemClick}
              slots={
                {
                  // groupTransition is not directly supported in SimpleTreeView slots in this version
                }
              }
              sx={{
                height: "100%",
                color: "#ffffff",
                "& .MuiTreeItem-label": {
                  color: "#ffffff !important",
                },
                "& .MuiTreeItem-content": {
                  cursor: "pointer",
                  padding: "4px 8px",
                  color: "#ffffff",
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                  },
                  "&.Mui-selected": {
                    backgroundColor: "rgba(25, 118, 210, 0.16)",
                    "&:hover": {
                      backgroundColor: "rgba(25, 118, 210, 0.24)",
                    },
                  },
                },
                "& .MuiTreeItem-iconContainer svg": {
                  color: "#ffffff",
                },
                // ระดับที่ 1 - ข้อย่อยแรก (Organization > Area เช่น "OP170", "Diecasting-1")
                // เขยิบเข้ามา 24px จากหัวข้อหลัก - ใช้ attribute selector เพื่อ target class ที่ MUI ใช้จริง
                "& [class*='MuiTreeItem-group']": {
                  marginLeft: "0px !important",
                  paddingLeft: "24px !important",
                  borderLeft: "1px dashed rgba(255, 255, 255, 0.3)",
                  position: "relative",
                },
                // เขยิบ content ของ child items ในระดับที่ 1 - ใช้ attribute selector
                "& [class*='MuiTreeItem-group'] [class*='MuiTreeItem-root'] [class*='MuiTreeItem-content']":
                {
                  borderLeft: "1px dashed rgba(255, 255, 255, 0.2)",
                  paddingLeft: "24px !important",
                  marginLeft: "-24px !important",
                },
                // ระดับที่ 2 - ข้อย่อยที่ 2 (Area > Machine เช่น "M-1", "MC-22")
                // เขยิบเข้ามาเพิ่มอีก 24px (รวม 48px จากหัวข้อหลัก)
                "& [class*='MuiTreeItem-group'] [class*='MuiTreeItem-group']": {
                  marginLeft: "0px !important",
                  paddingLeft: "24px !important",
                  borderLeft: "1px dashed rgba(255, 255, 255, 0.3)",
                },
                // เขยิบ content ของ child items ในระดับที่ 2
                "& [class*='MuiTreeItem-group'] [class*='MuiTreeItem-group'] [class*='MuiTreeItem-root'] [class*='MuiTreeItem-content']":
                {
                  borderLeft: "1px dashed rgba(255, 255, 255, 0.2)",
                  paddingLeft: "24px !important",
                  marginLeft: "-24px !important",
                },
                // ระดับที่ 3 - ข้อย่อยที่ 3 (Machine > Sensor)
                // เขยิบเข้ามาเพิ่มอีก 24px (รวม 72px จากหัวข้อหลัก)
                "& [class*='MuiTreeItem-group'] [class*='MuiTreeItem-group'] [class*='MuiTreeItem-group']":
                {
                  marginLeft: "0px !important",
                  paddingLeft: "24px !important",
                  borderLeft: "1px dashed rgba(255, 255, 255, 0.3)",
                },
                // เขยิบ content ของ child items ในระดับที่ 3
                "& [class*='MuiTreeItem-group'] [class*='MuiTreeItem-group'] [class*='MuiTreeItem-group'] [class*='MuiTreeItem-root'] [class*='MuiTreeItem-content']":
                {
                  borderLeft: "1px dashed rgba(255, 255, 255, 0.2)",
                  paddingLeft: "24px !important",
                  marginLeft: "-24px !important",
                },
                // ระดับที่ 4 - ข้อย่อยที่ 4 (ถ้ามี)
                // เขยิบเข้ามาเพิ่มอีก 24px (รวม 96px จากหัวข้อหลัก)
                "& [class*='MuiTreeItem-group'] [class*='MuiTreeItem-group'] [class*='MuiTreeItem-group'] [class*='MuiTreeItem-group']":
                {
                  marginLeft: "0px !important",
                  paddingLeft: "24px !important",
                  borderLeft: "1px dashed rgba(255, 255, 255, 0.3)",
                },
                // เขยิบ content ของ child items ในระดับที่ 4
                "& [class*='MuiTreeItem-group'] [class*='MuiTreeItem-group'] [class*='MuiTreeItem-group'] [class*='MuiTreeItem-group'] [class*='MuiTreeItem-root'] [class*='MuiTreeItem-content']":
                {
                  borderLeft: "1px dashed rgba(255, 255, 255, 0.2)",
                  paddingLeft: "24px !important",
                  marginLeft: "-24px !important",
                },
              }}
            >
              {renderTree(items as TreeItemData[])}
            </SimpleTreeView>
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
};

export default FolderTree;
