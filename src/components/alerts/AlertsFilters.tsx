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
import { Input } from "@/components/ui/input";
import { getMachines } from "@/lib/data/machines";
import type { Machine } from "@/lib/types";

export default function AlertsFilters() {
  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState("all");
  const [machine, setMachine] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
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
            <label className="text-sm font-medium">Search</label>
            <Input
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2 w-full md:w-[150px]">
            <label className="text-sm font-medium">Severity</label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger>
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 w-full md:w-[150px]">
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 w-full md:w-[150px]">
            <label className="text-sm font-medium">Machine</label>
            <Select value={machine} onValueChange={setMachine}>
              <SelectTrigger>
                <SelectValue placeholder="Machine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Machines</SelectItem>
                {machines.map((machineItem) => (
                  <SelectItem key={machineItem.id} value={machineItem.id}>
                    {machineItem.name}
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
