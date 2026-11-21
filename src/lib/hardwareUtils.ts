import fs from 'fs';
import os from 'os';
import { CONFIG, HardwareConfigFile, isExplicitCpuRange, readHardwareConfig } from '@/lib/config';
import { HardwareCpuStats, CpuCoreMetric, HardwareConfigSource } from '@/types/hardware';

interface ProcStatSnapshot {
  timestamp: number;
  totalCpu: { idle: number; total: number };
  cores: Array<{ idle: number; total: number }>;
}

let lastSnapshot: ProcStatSnapshot | null = null;

export function parseCpuRange(rangeStr: string): number[] {
  const result = new Set<number>();
  const parts = rangeStr.split(',').map((p) => p.trim());
  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
          result.add(i);
        }
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num)) result.add(num);
    }
  }
  return Array.from(result).sort((a, b) => a - b);
}

export function formatCpuRange(cpus: number[]): string {
  if (cpus.length === 0) return 'None';
  const sorted = Array.from(new Set(cpus)).sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(',');
}

export interface CoreAllocationInput {
  totalCores: number;
  fileConfig: HardwareConfigFile | null;
  envServerCpus?: string;
  envOtherCpus?: string;
  dockerCpuset?: string;
  composeCpuset?: string;
}

export interface CoreAllocationResult {
  assignedCpus: number[];
  assignedRangeString: string;
  otherCpus: number[];
  otherRangeString: string;
  serverLabel: string;
  otherLabel: string;
  configSource: HardwareConfigSource;
}

export function resolveCoreAllocation(input: CoreAllocationInput): CoreAllocationResult {
  const { totalCores, fileConfig, envServerCpus, envOtherCpus, dockerCpuset, composeCpuset } = input;
  const clamp = (ids: number[]): number[] => ids.filter((id) => id >= 0 && id < totalCores);

  let configSource: HardwareConfigSource = 'auto';
  let assignedCpus: number[] = [];

  if (isExplicitCpuRange(fileConfig?.serverCpus)) {
    assignedCpus = clamp(parseCpuRange(fileConfig.serverCpus));
    configSource = 'file';
  } else if (isExplicitCpuRange(envServerCpus)) {
    assignedCpus = clamp(parseCpuRange(envServerCpus));
    configSource = 'env';
  } else if (isExplicitCpuRange(dockerCpuset)) {
    assignedCpus = clamp(parseCpuRange(dockerCpuset));
    configSource = 'docker';
  } else if (isExplicitCpuRange(composeCpuset)) {
    assignedCpus = clamp(parseCpuRange(composeCpuset));
    configSource = 'compose';
  } else {
    assignedCpus = Array.from({ length: totalCores }, (_, i) => i);
    configSource = 'auto';
  }

  const assignedSet = new Set(assignedCpus);

  let otherCpus: number[];
  if (isExplicitCpuRange(fileConfig?.otherCpus)) {
    otherCpus = clamp(parseCpuRange(fileConfig.otherCpus)).filter((id) => !assignedSet.has(id));
    if (configSource !== 'file') {
      configSource = 'file';
    }
  } else if (isExplicitCpuRange(envOtherCpus)) {
    otherCpus = clamp(parseCpuRange(envOtherCpus)).filter((id) => !assignedSet.has(id));
  } else {
    otherCpus = Array.from({ length: totalCores }, (_, i) => i).filter((id) => !assignedSet.has(id));
  }

  return {
    assignedCpus,
    assignedRangeString: formatCpuRange(assignedCpus),
    otherCpus,
    otherRangeString: formatCpuRange(otherCpus),
    serverLabel: fileConfig?.serverLabel || 'PZ Server',
    otherLabel: fileConfig?.otherLabel || 'System & Other',
    configSource,
  };
}

function getHwmonPath(): string | null {
  const candidates = ['/sys/class/hwmon', '/host/sys/class/hwmon'];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch {
      // Ignore file check errors
    }
  }
  return null;
}

function getThermalPath(): string | null {
  const candidates = ['/sys/class/thermal', '/host/sys/class/thermal'];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch {
      // Ignore file check errors
    }
  }
  return null;
}

function parseProcStat(): { totalCpu: { idle: number; total: number }; cores: Array<{ idle: number; total: number }> } {
  try {
    const content = fs.readFileSync('/proc/stat', 'utf8');
    const lines = content.split('\n');
    const cores: Array<{ idle: number; total: number }> = [];
    let totalCpu = { idle: 0, total: 0 };

    for (const line of lines) {
      if (line.startsWith('cpu ')) {
        const parts = line.trim().split(/\s+/).slice(1).map(Number);
        const idle = (parts[3] || 0) + (parts[4] || 0); // idle + iowait
        const total = parts.reduce((a, b) => a + b, 0);
        totalCpu = { idle, total };
      } else if (/^cpu\d+\s+/.test(line)) {
        const parts = line.trim().split(/\s+/).slice(1).map(Number);
        const idle = (parts[3] || 0) + (parts[4] || 0);
        const total = parts.reduce((a, b) => a + b, 0);
        cores.push({ idle, total });
      }
    }
    return { totalCpu, cores };
  } catch {
    // Fallback using os.cpus()
    const cpus = os.cpus();
    let totalIdle = 0;
    let grandTotal = 0;
    const cores = cpus.map((cpu) => {
      const times = cpu.times;
      const idle = times.idle;
      const total = times.user + times.nice + times.sys + times.idle + times.irq;
      totalIdle += idle;
      grandTotal += total;
      return { idle, total };
    });
    return { totalCpu: { idle: totalIdle, total: grandTotal }, cores };
  }
}

function getCpuFrequencies(): number[] {
  try {
    const content = fs.readFileSync('/proc/cpuinfo', 'utf8');
    const freqs: number[] = [];
    for (const line of content.split('\n')) {
      if (line.startsWith('cpu MHz')) {
        const parts = line.split(':');
        if (parts.length > 1) {
          const val = parseFloat(parts[1].trim());
          if (!isNaN(val)) freqs.push(val);
        }
      }
    }
    if (freqs.length > 0) return freqs;
  } catch {
    // Fallback to os.cpus() speed
  }
  return os.cpus().map((c) => c.speed);
}

function getCpuTemps(): { package: number | null; cores: Record<number, number> } {
  const result: { package: number | null; cores: Record<number, number> } = {
    package: null,
    cores: {},
  };

  const hwmonBase = getHwmonPath();
  if (hwmonBase) {
    try {
      const dirs = fs.readdirSync(hwmonBase);
      for (const d of dirs) {
        const dirPath = `${hwmonBase}/${d}`;
        let name = '';
        try {
          name = fs.readFileSync(`${dirPath}/name`, 'utf8').trim().toLowerCase();
        } catch {
          continue;
        }

        if (name === 'coretemp' || name === 'k10temp' || name === 'zenpower' || name === 'acpitz' || name === 'cpu_thermal') {
          try {
            const files = fs.readdirSync(dirPath);
            const labelFiles = files.filter((f) => f.endsWith('_label'));

            if (labelFiles.length > 0) {
              for (const lf of labelFiles) {
                const prefix = lf.replace('_label', '');
                try {
                  const label = fs.readFileSync(`${dirPath}/${lf}`, 'utf8').trim();
                  const rawVal = fs.readFileSync(`${dirPath}/${prefix}_input`, 'utf8').trim();
                  const tempC = Math.round((parseInt(rawVal, 10) / 1000) * 10) / 10;

                  if (/package|tctl|tdie/i.test(label)) {
                    if (result.package === null) result.package = tempC;
                  } else {
                    const match = label.match(/Core\s+(\d+)/i) || label.match(/Tccd(\d+)/i);
                    if (match) {
                      const coreIdx = parseInt(match[1], 10);
                      result.cores[coreIdx] = tempC;
                    }
                  }
                } catch {
                  // Skip single label read failure
                }
              }
            } else {
              if (files.includes('temp1_input')) {
                try {
                  const rawVal = fs.readFileSync(`${dirPath}/temp1_input`, 'utf8').trim();
                  const tempC = Math.round((parseInt(rawVal, 10) / 1000) * 10) / 10;
                  if (result.package === null) result.package = tempC;
                } catch {
                  // Ignore
                }
              }
            }
          } catch {
            // Ignore directory read failure
          }
        }
      }
    } catch {
      // Ignore hwmon read errors
    }
  }

  // Fallback to /sys/class/thermal if package temp still null
  if (result.package === null) {
    const thermalBase = getThermalPath();
    if (thermalBase) {
      try {
        const thermalDirs = fs.readdirSync(thermalBase).filter((d) => d.startsWith('thermal_zone'));
        for (const tz of thermalDirs) {
          try {
            const type = fs.readFileSync(`${thermalBase}/${tz}/type`, 'utf8').trim().toLowerCase();
            if (type.includes('cpu') || type.includes('x86_pkg_temp') || type.includes('acpitz')) {
              const rawVal = fs.readFileSync(`${thermalBase}/${tz}/temp`, 'utf8').trim();
              const tempC = Math.round((parseInt(rawVal, 10) / 1000) * 10) / 10;
              result.package = tempC;
              break;
            }
          } catch {
            // Ignore
          }
        }
      } catch {
        // Ignore
      }
    }
  }

  return result;
}

export async function getHardwareCpuStats(): Promise<HardwareCpuStats> {
  const cpus = os.cpus();
  const totalCores = cpus.length;
  const model = cpus[0]?.model?.trim() || 'Unknown CPU';
  const architecture = os.arch();

  // 1. Calculate usages from /proc/stat delta
  let currentSnapshot = {
    timestamp: Date.now(),
    ...parseProcStat(),
  };

  if (!lastSnapshot || currentSnapshot.timestamp - lastSnapshot.timestamp > 30000 || currentSnapshot.cores.length === 0) {
    const prev = currentSnapshot;
    await new Promise((resolve) => setTimeout(resolve, 80));
    currentSnapshot = {
      timestamp: Date.now(),
      ...parseProcStat(),
    };
    lastSnapshot = prev;
  }

  const prev = lastSnapshot;
  lastSnapshot = currentSnapshot;

  const totalDelta = currentSnapshot.totalCpu.total - prev.totalCpu.total;
  const totalIdleDelta = currentSnapshot.totalCpu.idle - prev.totalCpu.idle;
  const totalActiveDelta = Math.max(0, totalDelta - totalIdleDelta);
  const overallUsagePercent = totalDelta > 0 ? Math.min(100, Math.round((totalActiveDelta / totalDelta) * 1000) / 10) : 0;

  // 2. Frequencies
  const frequencies = getCpuFrequencies();
  const avgFrequency =
    frequencies.length > 0
      ? Math.round(frequencies.reduce((a, b) => a + b, 0) / frequencies.length)
      : cpus[0]?.speed || 0;

  // 3. Temperatures
  const { package: packageTempC, cores: coreTemps } = getCpuTemps();

  // 4. Assigned & Other Cores resolution (config file -> env -> docker inspect -> compose -> auto)
  const fileConfig = readHardwareConfig();
  let dockerCpuset = '';
  if (!isExplicitCpuRange(fileConfig?.serverCpus) && !isExplicitCpuRange(process.env.PZ_SERVER_CPUS)) {
    try {
      const { execFile } = await import('child_process');
      const { promisify } = await import('util');
      const execFileAsync = promisify(execFile);
      const { stdout } = await execFileAsync('docker', [
        'inspect',
        '-f',
        '{{.HostConfig.CpusetCpus}}',
        CONFIG.containerName,
      ]);
      dockerCpuset = stdout.trim();
    } catch {
      // Ignore docker inspect errors (e.g. container stopped or non-docker env)
    }
  }

  const allocation = resolveCoreAllocation({
    totalCores,
    fileConfig,
    envServerCpus: process.env.PZ_SERVER_CPUS,
    envOtherCpus: process.env.PZ_OTHER_CPUS,
    dockerCpuset,
    composeCpuset: CONFIG.composeCpus,
  });

  const assignedSet = new Set(allocation.assignedCpus);
  const otherSet = new Set(allocation.otherCpus);

  // 5. Map per-core metrics
  const cores: CpuCoreMetric[] = [];
  const knownCoreTempIndices = Object.keys(coreTemps).map(Number).sort((a, b) => a - b);

  for (let i = 0; i < totalCores; i++) {
    const coreCurr = currentSnapshot.cores[i];
    const corePrev = prev.cores[i];

    let usage = 0;
    if (coreCurr && corePrev) {
      const cTotalDelta = coreCurr.total - corePrev.total;
      const cIdleDelta = coreCurr.idle - corePrev.idle;
      const cActiveDelta = Math.max(0, cTotalDelta - cIdleDelta);
      usage = cTotalDelta > 0 ? Math.min(100, Math.round((cActiveDelta / cTotalDelta) * 1000) / 10) : 0;
    }

    const freq = frequencies[i] !== undefined ? Math.round(frequencies[i]) : (cpus[i]?.speed || 0);

    let coreTemp: number | null = null;
    if (coreTemps[i] !== undefined) {
      coreTemp = coreTemps[i];
    } else if (knownCoreTempIndices.length > 0) {
      const candidateKey = [...knownCoreTempIndices].reverse().find((k) => k <= i) ?? knownCoreTempIndices[0];
      coreTemp = coreTemps[candidateKey] ?? packageTempC;
    } else {
      coreTemp = packageTempC;
    }

    cores.push({
      id: i,
      label: `Core ${i.toString().padStart(2, '0')}`,
      usagePercent: usage,
      frequencyMhz: freq,
      temperatureC: coreTemp,
      isAssignedToServer: assignedSet.has(i),
      isOtherCore: otherSet.has(i),
    });
  }

  // 6. Summary stats helper for core groups
  const summarizeGroup = (group: CpuCoreMetric[]): { usagePercent: number; avgFrequencyMhz: number; maxTempC: number | null } => {
    if (group.length === 0) {
      return { usagePercent: 0, avgFrequencyMhz: 0, maxTempC: null };
    }
    const usagePercent =
      Math.round((group.reduce((sum, c) => sum + c.usagePercent, 0) / group.length) * 10) / 10;
    const avgFrequencyMhz = Math.round(
      group.reduce((sum, c) => sum + c.frequencyMhz, 0) / group.length
    );
    const temps = group
      .map((c) => c.temperatureC)
      .filter((t): t is number => t !== null);
    const maxTempC = temps.length > 0 ? Math.max(...temps) : packageTempC;
    return { usagePercent, avgFrequencyMhz, maxTempC };
  };

  const assignedSummary = summarizeGroup(cores.filter((c) => assignedSet.has(c.id)));
  const otherSummary = summarizeGroup(cores.filter((c) => otherSet.has(c.id)));

  return {
    model,
    architecture,
    totalCores,
    overallUsagePercent,
    averageFrequencyMhz: avgFrequency,
    packageTempC,
    assignedCpus: allocation.assignedCpus,
    assignedRangeString: allocation.assignedRangeString,
    assignedUsagePercent: assignedSummary.usagePercent,
    assignedAvgFrequencyMhz: assignedSummary.avgFrequencyMhz,
    assignedMaxTempC: assignedSummary.maxTempC,
    otherCpus: allocation.otherCpus,
    otherRangeString: allocation.otherRangeString,
    otherUsagePercent: otherSummary.usagePercent,
    otherAvgFrequencyMhz: otherSummary.avgFrequencyMhz,
    otherMaxTempC: otherSummary.maxTempC,
    serverLabel: allocation.serverLabel,
    otherLabel: allocation.otherLabel,
    configSource: allocation.configSource,
    cores,
    timestamp: currentSnapshot.timestamp,
  };
}
