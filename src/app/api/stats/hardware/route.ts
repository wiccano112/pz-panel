import { NextResponse } from 'next/server';
import { getHardwareCpuStats } from '@/lib/hardwareUtils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getHardwareCpuStats();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to get hardware CPU stats:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve hardware CPU statistics' },
      { status: 500 }
    );
  }
}
