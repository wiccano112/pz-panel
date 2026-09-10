export interface CpuCoreMetric {
  id: number;
  label: string;
  usagePercent: number;
  frequencyMhz: number;
  temperatureC: number | null;
}

export interface HardwareCpuStats {
  model: string;
  architecture: string;
  totalCores: number;
  overallUsagePercent: number;
  averageFrequencyMhz: number;
  packageTempC: number | null;
  cores: CpuCoreMetric[];
  timestamp: number;
}
