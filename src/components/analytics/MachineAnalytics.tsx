"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { getMachines } from "@/lib/data/machines";

const COLORS = [
  "#3b82f6",
  "#16a34a",
  "#dc2626",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
];

interface MachinePerformance {
  name: string;
  uptime: number;
  alerts: number;
  efficiency: number;
  [key: string]: string | number;
}

interface AlertsByMachine {
  name: string;
  value: number;
  [key: string]: string | number;
}

export default function MachineAnalytics() {
  const [machinePerformance, setMachinePerformance] = useState<
    MachinePerformance[]
  >([]);
  const [alertsByMachine, setAlertsByMachine] = useState<AlertsByMachine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch machines from API
        const machines = await getMachines();

        // Transform machines to performance data
        // Note: This should be replaced with actual API calls for performance metrics
        const performanceData = machines.map((machine) => ({
          name: machine.name,
          uptime: 0, // Should be fetched from API
          alerts: 0, // Should be fetched from API
          efficiency: 0, // Should be fetched from API
        }));

        const alertsData = machines.map((machine) => ({
          name: machine.name,
          value: 0, // Should be fetched from API
        }));

        setMachinePerformance(performanceData);
        setAlertsByMachine(alertsData);
      } catch (error) {
        console.error("Error fetching machine analytics:", error);
        setMachinePerformance([]);
        setAlertsByMachine([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-400">
        <p>Loading analytics data...</p>
      </div>
    );
  }

  if (machinePerformance.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-400">
        <p>No machine analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Machine Performance</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={machinePerformance}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip />
                <Legend />
                <Bar dataKey="efficiency" fill="#3b82f6" name="Efficiency %" />
                <Bar dataKey="uptime" fill="#16a34a" name="Uptime %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alerts by Machine</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={alertsByMachine}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={(props: { name?: string; percent?: number }) => {
                    const name = props.name || "";
                    const percent = props.percent ?? 0;
                    return `${name}: ${(percent * 100).toFixed(2)}%`;
                  }}
                >
                  {alertsByMachine.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Machine Maintenance Forecast</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">
              Machine maintenance forecast visualization will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
