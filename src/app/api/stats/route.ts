import { NextResponse } from 'next/server';

export async function GET() {
  // Placeholder for real Docker metrics polling
  return NextResponse.json({
    cpu: '0%',
    ram: '0GB',
    network: '0B/s',
  });
}
