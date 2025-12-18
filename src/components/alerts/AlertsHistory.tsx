"use client";

import type React from "react";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { Pagination } from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";

// Create a custom MUI theme for the pagination component
const paginationTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#3b82f6", // blue-500
    },
    text: {
      primary: "#ffffff",
      secondary: "#ffffff",
    },
    background: {
      paper: "#1f2937",
    },
  },
  components: {
    MuiPaginationItem: {
      styleOverrides: {
        root: {
          color: "#ffffff",
          "&.Mui-selected": {
            backgroundColor: "#3b82f6",
            color: "#ffffff",
          },
          "&:hover": {
            backgroundColor: "rgba(59, 130, 246, 0.2)",
          },
        },
        icon: {
          color: "#ffffff",
        },
      },
    },
  },
});

interface AlertHistoryItem {
  id: string;
  timestamp: string;
  severity: string;
  message: string;
  sensor: string;
  machine: string;
  value: string;
  resolutionTime: string;
  resolvedBy: string;
}

export default function AlertsHistory() {
  const [page, setPage] = useState(1);
  const [alertHistory] = useState<AlertHistoryItem[]>([]);
  const rowsPerPage = 10;
  const totalPages = Math.ceil(alertHistory.length / rowsPerPage);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return (
          <Badge
            variant="outline"
            className="bg-red-900 text-red-200 border-red-700"
          >
            <AlertCircle className="h-3 w-3 mr-1" />
            Critical
          </Badge>
        );
      case "warning":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-900 text-yellow-200 border-yellow-700"
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            Warning
          </Badge>
        );
      case "info":
        return (
          <Badge
            variant="outline"
            className="bg-blue-900 text-blue-200 border-blue-700"
          >
            <Info className="h-3 w-3 mr-1" />
            Info
          </Badge>
        );
      default:
        return <Badge>{severity}</Badge>;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const paginatedAlerts = alertHistory.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  if (alertHistory.length === 0) {
    return (
      <div className="space-y-4 mt-6">
        <div className="rounded-md border border-gray-700 p-8 text-center text-gray-400">
          <p>No alert history available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-6">
      <div className="rounded-md border border-gray-700">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700">
              <TableHead className="text-gray-300">Time</TableHead>
              <TableHead className="text-gray-300">Severity</TableHead>
              <TableHead className="text-gray-300">Message</TableHead>
              <TableHead className="text-gray-300">Sensor</TableHead>
              <TableHead className="text-gray-300">Machine</TableHead>
              <TableHead className="text-gray-300">Value</TableHead>
              <TableHead className="text-gray-300">Resolution Time</TableHead>
              <TableHead className="text-gray-300">Resolved By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedAlerts.map((alert) => (
              <TableRow key={alert.id} className="border-gray-700">
                <TableCell className="text-sm text-gray-200">
                  {formatTimestamp(alert.timestamp)}
                </TableCell>
                <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                <TableCell className="text-gray-200">{alert.message}</TableCell>
                <TableCell className="text-gray-200">{alert.sensor}</TableCell>
                <TableCell className="text-gray-200">{alert.machine}</TableCell>
                <TableCell className="text-gray-200">{alert.value}</TableCell>
                <TableCell className="text-gray-200">
                  {alert.resolutionTime}
                </TableCell>
                <TableCell className="text-gray-200">
                  {alert.resolvedBy}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-center mt-6">
        <ThemeProvider theme={paginationTheme}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            size="large"
            showFirstButton
            showLastButton
          />
        </ThemeProvider>
      </div>
    </div>
  );
}
