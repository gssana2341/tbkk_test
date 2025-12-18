"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SensorDetailChartsProps {
  historical?: boolean;
}

export default function SensorDetailCharts({
  historical = false,
}: SensorDetailChartsProps) {
  const [timeRange, setTimeRange] = useState(historical ? "all" : "24h");

  // Placeholder UI สำหรับข้อมูลที่ต้องเชื่อม API
  return (
    <div className="space-y-4">
      {historical && (
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="all">All Data</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            className="border-gray-600 text-white hover:bg-gray-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      )}

      {/* สถิติและกราฟต่าง ๆ จะถูกเชื่อมต่อ API จริงในอนาคต */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-white">
            Sensor Data Charts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-300">
            (ข้อมูลกราฟและสถิติจาก API จะแสดงตรงนี้)
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="temperature" className="w-full">
        <TabsList className="grid w-full md:w-auto grid-cols-2 bg-gray-800">
          <TabsTrigger
            value="temperature"
            className="text-gray-200 data-[state=active]:bg-gray-700 data-[state=active]:text-white"
          >
            Temperature
          </TabsTrigger>
          <TabsTrigger
            value="vibration"
            className="text-gray-200 data-[state=active]:bg-gray-700 data-[state=active]:text-white"
          >
            Vibration
          </TabsTrigger>
        </TabsList>
        <TabsContent value="temperature" className="h-full">
          <div className="h-full text-gray-400">(กราฟอุณหภูมิจาก API)</div>
        </TabsContent>
        <TabsContent value="vibration" className="h-full">
          <div className="h-full text-gray-400">(กราฟ Vibration จาก API)</div>
        </TabsContent>
      </Tabs>

      {historical && (
        <div className="mt-4">
          <h3 className="font-medium mb-2 text-white">Anomaly Detection</h3>
          <div className="p-4 bg-gray-800 rounded-md text-gray-400">
            (ข้อมูล anomaly จาก API จะแสดงตรงนี้)
          </div>
        </div>
      )}
    </div>
  );
}
