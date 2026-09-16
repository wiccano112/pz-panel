import { describe, it, expect } from 'vitest';
import buildInfo from '@/version.json';

describe('Navigation & Version Consistency', () => {
  it('should have valid build metadata for UI components', () => {
    expect(buildInfo.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(buildInfo.channel).toBe('stable');
    expect(buildInfo.releaseDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(buildInfo.repoUrl).toContain('github.com');
  });

  it('should generate valid release tag url for GitHub', () => {
    const releaseUrl = `${buildInfo.repoUrl}/releases/tag/v${buildInfo.version}`;
    expect(releaseUrl).toBe(`https://github.com/wiccano112/pz-panel/releases/tag/v${buildInfo.version}`);
  });
});
