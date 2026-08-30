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

export async function handleServerAction(
  prevState: unknown,
  formData: FormData
) {
  const actionType = formData.get('actionType') as 'start' | 'stop' | 'restart';
  if (!actionType) return { message: 'Invalid action', error: true };

  const result = await executeServerAction(actionType);
  revalidatePath('/');
  
  if (result.success) {
    return { message: `Successfully executed ${actionType}`, error: false };
  } else {
    return { message: `Failed to ${actionType}: ${result.error}`, error: true };
  }
}

export async function handleSaveIniAction(
  prevState: unknown,
  formData: FormData
) {
  try {
    const workshopItems = JSON.parse(formData.get('workshopItems') as string || '[]');
    const mods = JSON.parse(formData.get('mods') as string || '[]');
    const maps = JSON.parse(formData.get('maps') as string || '[]');
    
    const { saveIniFile } = await import('@/lib/serverUtils');
    const success = await saveIniFile(workshopItems, mods, maps);
    
    if (success) {
      revalidatePath('/mods');
      return { message: 'Configuration saved successfully', error: false };
    } else {
      return { message: 'Failed to save configuration', error: true };
    }
  } catch {
    return { message: 'Failed to parse configuration payload', error: true };
  }
}

export async function handleSaveSandboxAction(
  prevState: unknown,
  formData: FormData
) {
  try {
    const rawPayload = formData.get('sandboxVars') as string;
    if (!rawPayload) {
      return { message: 'Missing sandbox variables payload', error: true };
    }

    const parsedVars = JSON.parse(rawPayload);
    const result = await saveSandboxVars(parsedVars);

    if (result.success) {
      revalidatePath('/sandbox');
      return { message: 'Sandbox configuration saved successfully', error: false };
    } else {
      return { message: `Failed to save sandbox vars: ${result.error}`, error: true };
    }
  } catch {
    return { message: 'Failed to parse sandbox payload', error: true };
  }
}

export async function handleAddWhitelistAction(
  prevState: unknown,
  formData: FormData
) {
  const username = (formData.get('username') as string || '').trim();
  const role = parseInt(formData.get('role') as string || '5', 10);
  const steamid = (formData.get('steamid') as string || '').trim();

  if (!username) {
    return { message: 'Username is required', error: true };
  }

  // SteamID validation if provided: 17 digits
  if (steamid && !/^\d{17}$/.test(steamid)) {
    return { message: 'Steam ID must be exactly 17 digits', error: true };
  }

  const result = addToWhitelist({
    username,
    role: isNaN(role) ? 5 : role,
    steamid: steamid || undefined,
  });

  if (result.success) {
    revalidatePath('/players');
    return { message: `Added ${username} to whitelist`, error: false };
  } else {
    return { message: `Failed to add to whitelist: ${result.error}`, error: true };
  }
}

export async function handleRemoveWhitelistAction(
  prevState: unknown,
  formData: FormData
) {
  const rawId = formData.get('id') as string;
  const id = parseInt(rawId, 10);

  if (isNaN(id)) {
    return { message: 'Invalid whitelist ID', error: true };
  }

  const result = removeFromWhitelist(id);
  if (result.success) {
    revalidatePath('/players');
    return { message: 'User removed from whitelist', error: false };
  } else {
    return { message: `Failed to remove user: ${result.error}`, error: true };
  }
}

export async function handleBanAction(
  prevState: unknown,
  formData: FormData
) {
  const banType = formData.get('banType') as 'steam' | 'ip';
  const target = (formData.get('target') as string || '').trim();
  const reason = (formData.get('reason') as string || 'Banned via PZ-Panel').trim();

  if (!target) {
    return { message: 'Ban target is required', error: true };
  }

  if (banType === 'steam') {
    if (!/^\d{17}$/.test(target)) {
      return { message: 'Steam ID must be 17 numeric digits', error: true };
    }
    const result = banSteamId({ steamid: target, reason });
    if (result.success) {
      revalidatePath('/players');
      return { message: `Banned Steam ID ${target}`, error: false };
    }
    return { message: `Failed to ban Steam ID: ${result.error}`, error: true };
  } else {
    const result = banIp({ ip: target, reason });
    if (result.success) {
      revalidatePath('/players');
      return { message: `Banned IP ${target}`, error: false };
    }
    return { message: `Failed to ban IP: ${result.error}`, error: true };
  }
}

export async function handleUnbanAction(
  prevState: unknown,
  formData: FormData
) {
  const unbanType = formData.get('unbanType') as 'steam' | 'ip';
  const target = (formData.get('target') as string || '').trim();

  if (!target) {
    return { message: 'Target is required to unban', error: true };
  }

  if (unbanType === 'steam') {
    const result = unbanSteamId(target);
    if (result.success) {
      revalidatePath('/players');
      return { message: `Unbanned Steam ID ${target}`, error: false };
    }
    return { message: `Failed to unban Steam ID: ${result.error}`, error: true };
  } else {
    const result = unbanIp(target);
    if (result.success) {
      revalidatePath('/players');
      return { message: `Unbanned IP ${target}`, error: false };
    }
    return { message: `Failed to unban IP: ${result.error}`, error: true };
  }
}

export async function handleBroadcastAction(
  prevState: unknown,
  formData: FormData
) {
  const message = (formData.get('message') as string || '').trim();
  if (!message) {
    return { message: 'Broadcast message cannot be empty', error: true };
  }

  const result = await sendServerBroadcast(message);
  if (result.success) {
    return { message: `Announcement sent to server: "${message}"`, error: false };
  } else {
    return { message: `Failed to send broadcast: ${result.error}`, error: true };
  }
}
