export type HardwareConfigSource = 'file' | 'env' | 'docker' | 'compose' | 'auto';

export interface CpuCoreMetric {
  id: number;
  label: string;
  usagePercent: number;
  frequencyMhz: number;
  temperatureC: number | null;
  isAssignedToServer?: boolean;
  isOtherCore?: boolean;
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
  otherCpus: number[];
  otherRangeString: string;
  otherUsagePercent: number;
  otherAvgFrequencyMhz: number;
  otherMaxTempC: number | null;
  serverLabel: string;
  otherLabel: string;
  configSource: HardwareConfigSource;
  cores: CpuCoreMetric[];
  timestamp: number;
}
