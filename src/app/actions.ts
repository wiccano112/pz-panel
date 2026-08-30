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
