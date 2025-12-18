export interface SensorConfig {
  thresholdMin?: number;
  thresholdMedium?: number;
  thresholdMax?: number;
  machineClass?: string;
}

export const getCardBackgroundColor = (
  velocityValue: number,
  config?: SensorConfig
): string => {
  const thresholdMin = config?.thresholdMin ?? 0.1;
  const thresholdMedium = config?.thresholdMedium ?? 0.125;
  const thresholdMax = config?.thresholdMax ?? 0.15;

  if (velocityValue > thresholdMax) {
    return "bg-red-500";
  } else if (velocityValue > thresholdMedium) {
    return "bg-yellow-500";
  } else if (velocityValue > thresholdMin) {
    return "bg-green-500";
  }
  return "bg-gray-900";
};
