"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { enUS } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

interface DateTimePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick a date and time",
  disabled = false,
}: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(value);
  const [selectedMonth, setSelectedMonth] = useState<Date>(value || new Date());
  const [selectedTime, setSelectedTime] = useState({
    hours: (value?.getHours() || 0).toString().padStart(2, "0"),
    minutes: (value?.getMinutes() || 0).toString().padStart(2, "0"),
    seconds: (value?.getSeconds() || 0).toString().padStart(2, "0"),
  });
  const [isOpen, setIsOpen] = useState(false);

  // Update selectedDate when value prop changes
  useEffect(() => {
    if (value) {
      setSelectedDate(value);
      setSelectedMonth(value);
      setSelectedTime({
        hours: value.getHours().toString().padStart(2, "0"),
        minutes: value.getMinutes().toString().padStart(2, "0"),
        seconds: value.getSeconds().toString().padStart(2, "0"),
      });
    }
  }, [value]);

  // Generate month options
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Generate year options (current year ± 50 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 101 }, (_, i) => currentYear - 50 + i);

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      // Get date components directly to avoid timezone issues
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();

      // Preserve existing time or use default time (00:00:00)
      const hours =
        parseInt(selectedTime.hours) || (selectedDate?.getHours() ?? 0);
      const minutes =
        parseInt(selectedTime.minutes) || (selectedDate?.getMinutes() ?? 0);
      const seconds =
        parseInt(selectedTime.seconds) || (selectedDate?.getSeconds() ?? 0);

      // Create date in local timezone with preserved time
      const newDate = new Date(year, month, day, hours, minutes, seconds);
      setSelectedDate(newDate);

      // Update time state to ensure consistency
      setSelectedTime({
        hours: hours.toString().padStart(2, "0"),
        minutes: minutes.toString().padStart(2, "0"),
        seconds: seconds.toString().padStart(2, "0"),
      });

      onChange(newDate);
    }
  };

  // Handle month change
  const handleMonthChange = (monthIndex: string) => {
    const month = parseInt(monthIndex);
    const newMonth = new Date(selectedMonth);
    newMonth.setMonth(month);
    setSelectedMonth(newMonth);

    // Only update selectedDate if it exists, don't trigger onChange
    // because user might just be browsing months
    if (selectedDate) {
      // Use local date components to avoid timezone issues
      const year = selectedDate.getFullYear();
      const day = selectedDate.getDate();
      const hours = selectedDate.getHours();
      const minutes = selectedDate.getMinutes();
      const seconds = selectedDate.getSeconds();

      // Check if day is valid for the new month
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
      const validDay = Math.min(day, lastDayOfMonth);

      // Create date in local timezone
      const updatedDate = new Date(
        year,
        month,
        validDay,
        hours,
        minutes,
        seconds
      );
      setSelectedDate(updatedDate);
    }
  };

  // Handle year change
  const handleYearChange = (year: string) => {
    const yearNum = parseInt(year);
    const newMonth = new Date(selectedMonth);
    newMonth.setFullYear(yearNum);
    setSelectedMonth(newMonth);

    // Only update selectedDate if it exists, don't trigger onChange
    // because user might just be browsing years
    if (selectedDate) {
      // Use local date components to avoid timezone issues
      const month = selectedDate.getMonth();
      const day = selectedDate.getDate();
      const hours = selectedDate.getHours();
      const minutes = selectedDate.getMinutes();
      const seconds = selectedDate.getSeconds();

      // Handle leap year case (Feb 29) - check if day is valid for the new year
      const lastDayOfMonth = new Date(yearNum, month + 1, 0).getDate();
      const validDay = Math.min(day, lastDayOfMonth);

      // Create date in local timezone
      const updatedDate = new Date(
        yearNum,
        month,
        validDay,
        hours,
        minutes,
        seconds
      );
      setSelectedDate(updatedDate);
    }
  };

  // Handle time change
  const handleTimeChange = (
    type: "hours" | "minutes" | "seconds",
    value: string
  ) => {
    const paddedValue = value.padStart(2, "0").slice(0, 2);
    const newTime = {
      ...selectedTime,
      [type]: paddedValue,
    };
    setSelectedTime(newTime);

    // Update date with new time - use local date components to avoid timezone issues
    const baseDate = selectedDate || new Date();
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const day = baseDate.getDate();
    const hours = parseInt(newTime.hours) || 0;
    const minutes = parseInt(newTime.minutes) || 0;
    const seconds = parseInt(newTime.seconds) || 0;

    // Create date in local timezone
    const newDate = new Date(year, month, day, hours, minutes, seconds);

    if (!selectedDate) {
      setSelectedDate(newDate);
      setSelectedMonth(newDate);
    } else {
      setSelectedDate(newDate);
    }
    onChange(newDate);
  };

  // Handle time blur (validate and update)
  const handleTimeBlur = (
    type: "hours" | "minutes" | "seconds",
    value: string
  ) => {
    let paddedValue = value.padStart(2, "0");
    if (type === "hours") {
      const num = parseInt(paddedValue) || 0;
      paddedValue = Math.max(0, Math.min(23, num)).toString().padStart(2, "0");
    } else {
      const num = parseInt(paddedValue) || 0;
      paddedValue = Math.max(0, Math.min(59, num)).toString().padStart(2, "0");
    }

    const newTime = {
      ...selectedTime,
      [type]: paddedValue,
    };
    setSelectedTime(newTime);

    // Update date with validated time - use local date components to avoid timezone issues
    const baseDate = selectedDate || new Date();
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const day = baseDate.getDate();
    const hours = parseInt(newTime.hours) || 0;
    const minutes = parseInt(newTime.minutes) || 0;
    const seconds = parseInt(newTime.seconds) || 0;

    // Create date in local timezone
    const newDate = new Date(year, month, day, hours, minutes, seconds);

    if (!selectedDate) {
      setSelectedDate(newDate);
      setSelectedMonth(newDate);
    } else {
      setSelectedDate(newDate);
    }
    onChange(newDate);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full pl-3 text-left font-normal",
            !selectedDate && "text-muted-foreground",
            disabled && "cursor-not-allowed opacity-50"
          )}
          disabled={disabled}
        >
          {selectedDate ? (
            format(selectedDate, "EEE, dd MMM yyyy", { locale: enUS })
          ) : (
            <span>{placeholder}</span>
          )}
          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4 space-y-4">
          {/* Month and Year Selectors */}
          <div className="flex items-center gap-2">
            <Select
              value={selectedMonth.getMonth().toString()}
              onValueChange={handleMonthChange}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthNames.map((month, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedMonth.getFullYear().toString()}
              onValueChange={handleYearChange}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Calendar */}
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            month={selectedMonth}
            onMonthChange={setSelectedMonth}
            showOutsideDays={true}
            weekStartsOn={1}
            locale={enUS}
            className="p-0"
            classNames={{
              months: "flex flex-col space-y-4",
              month: "space-y-4",
              caption: "flex justify-center pt-1 relative items-center",
              caption_label: "hidden",
              nav: "space-x-1 flex items-center",
              nav_button: cn(
                buttonVariants({ variant: "outline" }),
                "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
              ),
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse space-y-1",
              head_row: "flex",
              head_cell:
                "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
              row: "flex w-full mt-2",
              cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
              day: cn(
                buttonVariants({ variant: "ghost" }),
                "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
              ),
              day_range_end: "day-range-end",
              day_selected:
                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
              day_today: "bg-accent text-accent-foreground",
              day_outside:
                "day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
              day_disabled: "text-muted-foreground opacity-50",
              day_range_middle:
                "aria-selected:bg-accent aria-selected:text-accent-foreground",
              day_hidden: "invisible",
            }}
            components={
              {
                Chevron: ({
                  orientation,
                }: {
                  orientation?: "left" | "right";
                }) => {
                  if (orientation === "left") {
                    return <ChevronLeft className="h-4 w-4" />;
                  }
                  return <ChevronRight className="h-4 w-4" />;
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } as any
            }
          />

          {/* Time Picker */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min="0"
                max="23"
                value={selectedTime.hours}
                onChange={(e) => handleTimeChange("hours", e.target.value)}
                onBlur={(e) => handleTimeBlur("hours", e.target.value)}
                className="w-16 text-center"
                placeholder="HH"
              />
              <span className="text-muted-foreground">:</span>
              <Input
                type="number"
                min="0"
                max="59"
                value={selectedTime.minutes}
                onChange={(e) => handleTimeChange("minutes", e.target.value)}
                onBlur={(e) => handleTimeBlur("minutes", e.target.value)}
                className="w-16 text-center"
                placeholder="MM"
              />
              <span className="text-muted-foreground">:</span>
              <Input
                type="number"
                min="0"
                max="59"
                value={selectedTime.seconds}
                onChange={(e) => handleTimeChange("seconds", e.target.value)}
                onBlur={(e) => handleTimeBlur("seconds", e.target.value)}
                className="w-16 text-center"
                placeholder="SS"
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
