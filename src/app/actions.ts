"use server";

import { executeServerAction } from '@/lib/serverUtils';
import { revalidatePath } from 'next/cache';
import { saveSandboxVars } from '@/lib/sandboxUtils';
import {
  addToWhitelist,
  removeFromWhitelist,
  banSteamId,
  unbanSteamId,
  banIp,
  unbanIp,
  sendServerBroadcast,
} from '@/lib/playerUtils';
import { ActionResult } from '@/types/actions';

export async function handleServerAction(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  const actionType = formData.get('actionType') as 'start' | 'stop' | 'restart';
  if (!actionType) return { success: false, message: 'Invalid action', error: true };

  const result = await executeServerAction(actionType);
  revalidatePath('/');
  
  if (result.success) {
    return { success: true, message: `Successfully executed ${actionType}`, error: false };
  } else {
    return { success: false, message: `Failed to ${actionType}: ${result.error}`, error: true };
  }
}

export async function handleSaveIniAction(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const workshopItems = JSON.parse(formData.get('workshopItems') as string || '[]');
    const mods = JSON.parse(formData.get('mods') as string || '[]');
    const maps = JSON.parse(formData.get('maps') as string || '[]');
    
    const { saveIniFile } = await import('@/lib/serverUtils');
    const success = await saveIniFile(workshopItems, mods, maps);
    
    if (success) {
      revalidatePath('/mods');
      return { success: true, message: 'Configuration saved successfully', error: false };
    } else {
      return { success: false, message: 'Failed to save configuration', error: true };
    }
  } catch {
    return { success: false, message: 'Failed to parse configuration payload', error: true };
  }
}

export async function handleSaveSandboxAction(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  try {
    const rawPayload = formData.get('sandboxVars') as string;
    if (!rawPayload) {
      return { success: false, message: 'Missing sandbox variables payload', error: true };
    }

    const parsedVars = JSON.parse(rawPayload);
    const result = await saveSandboxVars(parsedVars);

    if (result.success) {
      revalidatePath('/sandbox');
      return { success: true, message: 'Sandbox configuration saved successfully', error: false };
    } else {
      return { success: false, message: `Failed to save sandbox vars: ${result.error}`, error: true };
    }
  } catch {
    return { success: false, message: 'Failed to parse sandbox payload', error: true };
  }
}

export async function handleAddWhitelistAction(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  const username = (formData.get('username') as string || '').trim();
  const role = parseInt(formData.get('role') as string || '5', 10);
  const steamid = (formData.get('steamid') as string || '').trim();

  if (!username) {
    return { success: false, message: 'Username is required', error: true };
  }

  // SteamID validation if provided: exactly 17 numeric digits
  if (steamid && !/^\d{17}$/.test(steamid)) {
    return { success: false, message: 'Steam ID must be exactly 17 digits', error: true };
  }

  const result = addToWhitelist({
    username,
    role: isNaN(role) ? 5 : role,
    steamid: steamid || undefined,
  });

  if (result.success) {
    revalidatePath('/players');
    return { success: true, message: `Added ${username} to whitelist`, error: false };
  } else {
    return { success: false, message: `Failed to add to whitelist: ${result.error}`, error: true };
  }
}

export async function handleRemoveWhitelistAction(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  const rawId = formData.get('id') as string;
  const id = parseInt(rawId, 10);

  if (isNaN(id)) {
    return { success: false, message: 'Invalid whitelist ID', error: true };
  }

  const result = removeFromWhitelist(id);
  if (result.success) {
    revalidatePath('/players');
    return { success: true, message: 'User removed from whitelist', error: false };
  } else {
    return { success: false, message: `Failed to remove user: ${result.error}`, error: true };
  }
}

export async function handleBanAction(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  const banType = formData.get('banType') as 'steam' | 'ip';
  const target = (formData.get('target') as string || '').trim();
  const reason = (formData.get('reason') as string || 'Banned via PZ-Panel').trim();

  if (!target) {
    return { success: false, message: 'Ban target is required', error: true };
  }

  if (banType === 'steam') {
    if (!/^\d{17}$/.test(target)) {
      return { success: false, message: 'Steam ID must be 17 numeric digits', error: true };
    }
    const result = banSteamId({ steamid: target, reason });
    if (result.success) {
      revalidatePath('/players');
      return { success: true, message: `Banned Steam ID ${target}`, error: false };
    }
    return { success: false, message: `Failed to ban Steam ID: ${result.error}`, error: true };
  } else {
    const result = banIp({ ip: target, reason });
    if (result.success) {
      revalidatePath('/players');
      return { success: true, message: `Banned IP ${target}`, error: false };
    }
    return { success: false, message: `Failed to ban IP: ${result.error}`, error: true };
  }
}

export async function handleUnbanAction(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  const unbanType = formData.get('unbanType') as 'steam' | 'ip';
  const target = (formData.get('target') as string || '').trim();

  if (!target) {
    return { success: false, message: 'Target is required to unban', error: true };
  }

  if (unbanType === 'steam') {
    const result = unbanSteamId(target);
    if (result.success) {
      revalidatePath('/players');
      return { success: true, message: `Unbanned Steam ID ${target}`, error: false };
    }
    return { success: false, message: `Failed to unban Steam ID: ${result.error}`, error: true };
  } else {
    const result = unbanIp(target);
    if (result.success) {
      revalidatePath('/players');
      return { success: true, message: `Unbanned IP ${target}`, error: false };
    }
    return { success: false, message: `Failed to unban IP: ${result.error}`, error: true };
  }
}

export async function handleBroadcastAction(
  prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  const message = (formData.get('message') as string || '').trim();
  if (!message) {
    return { success: false, message: 'Broadcast message cannot be empty', error: true };
  }

  const result = await sendServerBroadcast(message);
  if (result.success) {
    return { success: true, message: `Announcement sent to server: "${message}"`, error: false };
  } else {
    return { success: false, message: `Failed to send broadcast: ${result.error}`, error: true };
  }
}
