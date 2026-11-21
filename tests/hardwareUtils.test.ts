import { describe, it, expect } from 'vitest';
import { parseCpuRange, formatCpuRange, resolveCoreAllocation } from '@/lib/hardwareUtils';

describe('hardwareUtils - CPU Core Parsing, Formatting & Allocation', () => {
  it('should correctly parse single numbers and standard ranges', () => {
    expect(parseCpuRange('0')).toEqual([0]);
    expect(parseCpuRange('0-3')).toEqual([0, 1, 2, 3]);
    expect(parseCpuRange('3-5')).toEqual([3, 4, 5]);
    expect(parseCpuRange('8-11')).toEqual([8, 9, 10, 11]);
    expect(parseCpuRange('12-17')).toEqual([12, 13, 14, 15, 16, 17]);
  });

  it('should parse comma-separated lists and mixed ranges', () => {
    expect(parseCpuRange('0,2,4')).toEqual([0, 2, 4]);
    expect(parseCpuRange('0-2, 6, 8-10')).toEqual([0, 1, 2, 6, 8, 9, 10]);
  });

  it('should handle unordered, duplicate, inverted, and malformed inputs gracefully', () => {
    expect(parseCpuRange('5, 1, 3, 1')).toEqual([1, 3, 5]);
    expect(parseCpuRange('4-2')).toEqual([2, 3, 4]);
    expect(parseCpuRange('abc, - , , 7')).toEqual([7]);
    expect(parseCpuRange('')).toEqual([]);
  });

  it('should format CPU ID arrays into compact range strings', () => {
    expect(formatCpuRange([])).toBe('None');
    expect(formatCpuRange([0])).toBe('0');
    expect(formatCpuRange([0, 1, 2])).toBe('0-2');
    expect(formatCpuRange([3, 4, 5])).toBe('3-5');
    expect(formatCpuRange([0, 2, 4])).toBe('0,2,4');
    expect(formatCpuRange([5, 1, 0, 2, 4, 2])).toBe('0-2,4-5');
  });

  it('should resolve core allocation from file config with priority and clamp to host core count', () => {
    const result = resolveCoreAllocation({
      totalCores: 6,
      fileConfig: {
        serverCpus: '3-5',
        otherCpus: '0-2',
        serverLabel: 'PZ Dedicated',
        otherLabel: 'OS & Panel',
      },
      envServerCpus: '0-1',
      dockerCpuset: '0-2',
    });

    expect(result).toEqual({
      assignedCpus: [3, 4, 5],
      assignedRangeString: '3-5',
      otherCpus: [0, 1, 2],
      otherRangeString: '0-2',
      serverLabel: 'PZ Dedicated',
      otherLabel: 'OS & Panel',
      configSource: 'file',
    });
  });

  it('should auto-derive otherCpus as complement of assignedCpus when set to auto', () => {
    const result = resolveCoreAllocation({
      totalCores: 6,
      fileConfig: {
        serverCpus: '3-5',
        otherCpus: 'auto',
      },
    });

    expect(result.assignedCpus).toEqual([3, 4, 5]);
    expect(result.assignedRangeString).toBe('3-5');
    expect(result.otherCpus).toEqual([0, 1, 2]);
    expect(result.otherRangeString).toBe('0-2');
    expect(result.configSource).toBe('file');
  });

  it('should clamp out-of-range cores when migrating to hardware with fewer cores', () => {
    const result = resolveCoreAllocation({
      totalCores: 6,
      fileConfig: {
        serverCpus: '4-11',
        otherCpus: '0-3, 8-9',
      },
    });

    expect(result.assignedCpus).toEqual([4, 5]);
    expect(result.assignedRangeString).toBe('4-5');
    expect(result.otherCpus).toEqual([0, 1, 2, 3]);
    expect(result.otherRangeString).toBe('0-3');
  });

  it('should fall back through env -> docker -> compose -> auto cleanly', () => {
    const fromDocker = resolveCoreAllocation({
      totalCores: 6,
      fileConfig: { serverCpus: 'auto', otherCpus: 'auto' },
      dockerCpuset: '3-5',
      composeCpuset: '4-5',
    });
    expect(fromDocker.configSource).toBe('docker');
    expect(fromDocker.assignedCpus).toEqual([3, 4, 5]);
    expect(fromDocker.otherCpus).toEqual([0, 1, 2]);

    const fromCompose = resolveCoreAllocation({
      totalCores: 6,
      fileConfig: null,
      composeCpuset: '2-5',
    });
    expect(fromCompose.configSource).toBe('compose');
    expect(fromCompose.assignedCpus).toEqual([2, 3, 4, 5]);
    expect(fromCompose.otherCpus).toEqual([0, 1]);

    const fromAuto = resolveCoreAllocation({
      totalCores: 6,
      fileConfig: null,
    });
    expect(fromAuto.configSource).toBe('auto');
    expect(fromAuto.assignedCpus).toEqual([0, 1, 2, 3, 4, 5]);
    expect(fromAuto.otherCpus).toEqual([]);
    expect(fromAuto.otherRangeString).toBe('None');
  });
});
