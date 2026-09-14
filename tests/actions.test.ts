import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleServerAction,
  handleAddWhitelistAction,
  handleRemoveWhitelistAction,
  handleBanAction,
  handleBroadcastAction,
  handleSaveServerPropertiesAction,
  handleSaveSpawnRegionsAction,
} from '@/app/actions';
import * as playerUtils from '@/lib/playerUtils';
import * as serverUtils from '@/lib/serverUtils';
import * as spawnRegionUtils from '@/lib/spawnRegionUtils';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/playerUtils', () => ({
  addToWhitelist: vi.fn(),
  removeFromWhitelist: vi.fn(),
  banSteamId: vi.fn(),
  banIp: vi.fn(),
  sendServerBroadcast: vi.fn(),
}));

vi.mock('@/lib/serverUtils', () => ({
  saveServerProperties: vi.fn(),
  executeServerAction: vi.fn(),
}));

vi.mock('@/lib/spawnRegionUtils', () => ({
  saveSpawnRegions: vi.fn(),
}));

describe('Server Actions - Validation & Execution Contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleServerAction', () => {
    it('should reject missing or empty actionType', async () => {
      const formData = new FormData();
      const result = await handleServerAction(null, formData);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid action');
    });

    it('should delegate valid actionType to executeServerAction and return success', async () => {
      vi.mocked(serverUtils.executeServerAction).mockResolvedValue({ success: true, message: 'Server started successfully' });

      const formData = new FormData();
      formData.append('actionType', 'start');

      const result = await handleServerAction(null, formData);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully executed start');
      expect(serverUtils.executeServerAction).toHaveBeenCalledWith('start');
    });

    it('should handle executeServerAction failure gracefully', async () => {
      vi.mocked(serverUtils.executeServerAction).mockResolvedValue({ success: false, error: 'Container missing' });

      const formData = new FormData();
      formData.append('actionType', 'start');

      const result = await handleServerAction(null, formData);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to start: Container missing');
    });
  });

  describe('handleAddWhitelistAction', () => {
    it('should reject missing username', async () => {
      const formData = new FormData();
      formData.append('username', '');

      const result = await handleAddWhitelistAction(null, formData);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Username is required');
    });

    it('should reject invalid SteamID format (not 17 digits)', async () => {
      const formData = new FormData();
      formData.append('username', 'PlayerOne');
      formData.append('steamid', '12345'); // invalid length

      const result = await handleAddWhitelistAction(null, formData);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Steam ID must be exactly 17 digits');
    });

    it('should pass valid data to playerUtils.addToWhitelist', async () => {
      vi.mocked(playerUtils.addToWhitelist).mockReturnValue({ success: true });

      const formData = new FormData();
      formData.append('username', 'PlayerOne');
      formData.append('role', '1');
      formData.append('steamid', '76561198000000001');

      const result = await handleAddWhitelistAction(null, formData);
      expect(result.success).toBe(true);
      expect(playerUtils.addToWhitelist).toHaveBeenCalledWith({
        username: 'PlayerOne',
        role: 1,
        steamid: '76561198000000001',
      });
    });
  });

  describe('handleRemoveWhitelistAction', () => {
    it('should reject non-numeric whitelist ID', async () => {
      const formData = new FormData();
      formData.append('id', 'invalid_id');

      const result = await handleRemoveWhitelistAction(null, formData);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid whitelist ID');
    });

    it('should call playerUtils.removeFromWhitelist with parsed ID', async () => {
      vi.mocked(playerUtils.removeFromWhitelist).mockReturnValue({ success: true });

      const formData = new FormData();
      formData.append('id', '42');

      const result = await handleRemoveWhitelistAction(null, formData);
      expect(result.success).toBe(true);
      expect(playerUtils.removeFromWhitelist).toHaveBeenCalledWith(42);
    });
  });

  describe('handleBanAction', () => {
    it('should reject steam ban with invalid Steam ID format', async () => {
      const formData = new FormData();
      formData.append('banType', 'steam');
      formData.append('target', 'not-a-steam-id');

      const result = await handleBanAction(null, formData);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Steam ID must be 17 numeric digits');
    });

    it('should trigger IP ban with valid target', async () => {
      vi.mocked(playerUtils.banIp).mockReturnValue({ success: true });

      const formData = new FormData();
      formData.append('banType', 'ip');
      formData.append('target', '192.168.1.100');
      formData.append('reason', 'Griefing');

      const result = await handleBanAction(null, formData);
      expect(result.success).toBe(true);
      expect(playerUtils.banIp).toHaveBeenCalledWith({
        ip: '192.168.1.100',
        reason: 'Griefing',
      });
    });
  });

  describe('handleBroadcastAction', () => {
    it('should reject empty broadcast message', async () => {
      const formData = new FormData();
      formData.append('message', '   ');

      const result = await handleBroadcastAction(null, formData);
      expect(result.success).toBe(false);
      expect(result.message).toContain('cannot be empty');
    });

    it('should send broadcast when message is valid', async () => {
      vi.mocked(playerUtils.sendServerBroadcast).mockResolvedValue({ success: true });

      const formData = new FormData();
      formData.append('message', 'Server restarting in 5 minutes!');

      const result = await handleBroadcastAction(null, formData);
      expect(result.success).toBe(true);
      expect(playerUtils.sendServerBroadcast).toHaveBeenCalledWith('Server restarting in 5 minutes!');
    });
  });

  describe('handleSaveServerPropertiesAction', () => {
    it('should validate and save valid properties JSON schema', async () => {
      vi.mocked(serverUtils.saveServerProperties).mockResolvedValue({ success: true });

      const formData = new FormData();
      formData.append('properties', JSON.stringify({ MaxPlayers: 32, PVP: false, ServerName: 'PZ-Test' }));

      const result = await handleSaveServerPropertiesAction(null, formData);
      expect(result.success).toBe(true);
      expect(serverUtils.saveServerProperties).toHaveBeenCalledWith({
        MaxPlayers: 32,
        PVP: false,
        ServerName: 'PZ-Test',
      });
    });

    it('should reject malformed JSON', async () => {
      const formData = new FormData();
      formData.append('properties', '{ invalid json');

      const result = await handleSaveServerPropertiesAction(null, formData);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to parse');
    });
  });

  describe('handleSaveSpawnRegionsAction', () => {
    it('should reject items with empty name or file', async () => {
      const formData = new FormData();
      formData.append('spawnRegions', JSON.stringify([{ name: '', file: 'some/path' }]));

      const result = await handleSaveSpawnRegionsAction(null, formData);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid spawn regions format');
    });

    it('should save valid spawn regions', async () => {
      vi.mocked(spawnRegionUtils.saveSpawnRegions).mockResolvedValue({ success: true });

      const validRegions = [{ name: 'Muldraugh', file: 'media/maps/Muldraugh/spawnpoints.lua' }];
      const formData = new FormData();
      formData.append('spawnRegions', JSON.stringify(validRegions));

      const result = await handleSaveSpawnRegionsAction(null, formData);
      expect(result.success).toBe(true);
      expect(spawnRegionUtils.saveSpawnRegions).toHaveBeenCalledWith(validRegions);
    });
  });
});
