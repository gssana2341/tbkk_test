"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DateRangePicker from "@/components/ui/DateRangePicker";
import { getMachines } from "@/lib/data/machines";
import type { Machine } from "@/lib/types";

export default function AnalyticsFilters() {
  const [interval, setInterval] = useState("daily");
  const [machineFilter, setMachineFilter] = useState("all");
  const [machines, setMachines] = useState<Machine[]>([]);

  useEffect(() => {
    const fetchMachines = async () => {
      try {
        const fetchedMachines = await getMachines();
        setMachines(fetchedMachines);
      } catch (error) {
        console.error("Error fetching machines:", error);
        setMachines([]);
      }
    };

    fetchMachines();
  }, []);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="space-y-2 flex-1">
            <label className="text-sm font-medium">Date Range</label>
            <DateRangePicker />
          </div>

          <div className="space-y-2 w-full md:w-[200px]">
            <label className="text-sm font-medium">Interval</label>
            <Select value={interval} onValueChange={setInterval}>
              <SelectTrigger>
                <SelectValue placeholder="Select interval" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 w-full md:w-[200px]">
            <label className="text-sm font-medium">Machine</label>
            <Select value={machineFilter} onValueChange={setMachineFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Select machine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Machines</SelectItem>
                {machines.map((machine) => (
                  <SelectItem key={machine.id} value={machine.id}>
                    {machine.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button>Apply Filters</Button>
        </div>
      </CardContent>
    </Card>
  );
}
