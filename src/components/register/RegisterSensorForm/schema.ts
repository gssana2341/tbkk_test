import * as z from "zod";

export const singleSensorSchema = z
  .object({
    serialNumber: z.string().optional(),
    area: z.string().optional(),
    motorStartTime: z.date().optional(),
    sensorType: z.string().optional(),
    machine: z.string().optional(),
    machineNo: z.string().optional(),
    installationPoint: z.string().optional(),
    machineClassEnabled: z.boolean(),
    namePlaceEnabled: z.boolean(),
    machineClass: z.string().optional(),
    namePlace: z.string().optional(),
    warningThreshold: z.string().optional(),
    concernThreshold: z.string().optional(),
    damageThreshold: z.string().optional(),
    alarmThreshold: z.string().optional(),
    gScale: z.string().optional(),
    temperatureThresholdMin: z.string().optional(),
    timeInterval: z.string().optional(),
    lor: z.string().optional(),
    frequencyMax: z.string().optional(),
    temperatureThresholdMax: z.string().optional(),
    highPass: z.string().optional(),
    motorType: z.string().optional(),
    notes: z.string().optional(),
    name: z.string().optional(),
    namePlaceWarningThreshold: z.string().optional(),
    namePlaceConcernThreshold: z.string().optional(),
    namePlaceDamageThreshold: z.string().optional(),
    id: z.string().optional(), // Store ID for updates
  })
  .superRefine((data, ctx) => {
    // If serial number is present (meaning the user wants to register this sensor)
    if (data.serialNumber && data.serialNumber.length > 0) {
      if (data.serialNumber.length !== 12) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Serial number (MAC) must be exactly 12 characters",
          path: ["serialNumber"],
        });
      }
      if (!data.motorStartTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Motor Start Time is required",
          path: ["motorStartTime"],
        });
      }

      // Machine Class validation
      if (data.machineClassEnabled) {
        if (!data.machineClass) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Machine Class is required",
            path: ["machineClass"],
          });
        }
        if (!data.warningThreshold) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Warning Threshold is required",
            path: ["warningThreshold"],
          });
        }
        if (!data.concernThreshold) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Concern Threshold is required",
            path: ["concernThreshold"],
          });
        }
        if (!data.damageThreshold) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Damage Threshold is required",
            path: ["damageThreshold"],
          });
        }
      }

      // Name Place validation
      if (data.namePlaceEnabled) {
        if (!data.namePlace) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Name Place (Motor Power) is required",
            path: ["namePlace"],
          });
        }
        if (!data.namePlaceWarningThreshold) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Warning Threshold is required",
            path: ["namePlaceWarningThreshold"],
          });
        }
        if (!data.namePlaceConcernThreshold) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Concern Threshold is required",
            path: ["namePlaceConcernThreshold"],
          });
        }
        if (!data.namePlaceDamageThreshold) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Damage Threshold is required",
            path: ["namePlaceDamageThreshold"],
          });
        }
      }

      if (!data.alarmThreshold) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Alarm Temperature is required",
          path: ["alarmThreshold"],
        });
      }
      if (!data.timeInterval) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Time Interval is required",
          path: ["timeInterval"],
        });
      }
      if (!data.lor) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "LOR is required",
          path: ["lor"],
        });
      }
      if (!data.frequencyMax) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Frequency Max is required",
          path: ["frequencyMax"],
        });
      }
    }
  });

export const formSchema = z.object({
  sensors: z.array(singleSensorSchema),
});

export type FormValues = z.infer<typeof formSchema>;
export type SingleSensorValues = z.infer<typeof singleSensorSchema>;
