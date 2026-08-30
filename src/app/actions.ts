"use server";

import { executeServerAction } from '@/lib/serverUtils';
import { revalidatePath } from 'next/cache';

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
    
    // Server validation or save logic goes here
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
