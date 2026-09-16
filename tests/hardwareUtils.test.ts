import { describe, it, expect } from 'vitest';
import { parseCpuRange } from '@/lib/hardwareUtils';

describe('hardwareUtils - CPU Core Parsing & Metrics', () => {
  it('should correctly parse single numbers and standard ranges', () => {
    expect(parseCpuRange('0')).toEqual([0]);
    expect(parseCpuRange('0-3')).toEqual([0, 1, 2, 3]);
    expect(parseCpuRange('12-15')).toEqual([12, 13, 14, 15]);
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
});
