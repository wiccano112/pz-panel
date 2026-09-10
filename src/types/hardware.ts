export interface CpuCoreMetric {
  id: number;
  label: string;
  usagePercent: number;
  frequencyMhz: number;
  temperatureC: number | null;
  isAssignedToServer?: boolean;
}

export interface HardwareCpuStats {
  model: string;
  architecture: string;
  totalCores: number;
  overallUsagePercent: number;
  averageFrequencyMhz: number;
  packageTempC: number | null;
  assignedCpus: number[];
  assignedRangeString: string;
  assignedUsagePercent: number;
  assignedAvgFrequencyMhz: number;
  assignedMaxTempC: number | null;
  cores: CpuCoreMetric[];
  timestamp: number;
}
