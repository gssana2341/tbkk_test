"use client";

import * as React from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import dayjs, { type Dayjs } from "dayjs";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
});

interface MUIDateTimePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function MUIDateTimePicker({
  value,
  onChange,
  label = "Pick a date and time",
  disabled = false,
  className,
}: MUIDateTimePickerProps) {
  // Convert Date to Dayjs
  const dayjsValue = value ? dayjs(value) : null;
  const [selectedValue, setSelectedValue] = React.useState<Dayjs | null>(
    dayjsValue
  );

  // Update selectedValue when value prop changes
  React.useEffect(() => {
    if (value) {
      setSelectedValue(dayjs(value));
    } else {
      setSelectedValue(null);
    }
  }, [value]);

  // Handle date change
  const handleChange = (newValue: Dayjs | null) => {
    setSelectedValue(newValue);
    if (newValue && newValue.isValid()) {
      // Convert Dayjs to Date
      onChange(newValue.toDate());
    } else {
      onChange(undefined);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <ThemeProvider theme={darkTheme}>
        <DateTimePicker
          label={label || undefined}
          value={selectedValue}
          onChange={handleChange}
          disabled={disabled}
          views={["year", "month", "day", "hours", "minutes"]}
          openTo="day"
          slotProps={{
            textField: {
              className: className,
              size: "small",
              fullWidth: true,
              variant: "outlined",
            },
          }}
          sx={{
            width: "100%",
            "& .MuiOutlinedInput-root": {
              backgroundColor: "#11171F",
              "& fieldset": {
                borderColor: "#4B5563",
              },
              "&:hover fieldset": {
                borderColor: "#4B5563",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#4B5563",
              },
            },
          }}
          format="DD/MM/YYYY HH:mm"
        />
      </ThemeProvider>
    </LocalizationProvider>
  );
}
