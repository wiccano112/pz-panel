import { fetchWorkshopMods } from '@/lib/steamApi';
import { WorkshopApiResponse } from '@/types/workshop';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const rawQuery = searchParams.get('q') || '';
  const rawDays = searchParams.get('days');
  const rawTag = searchParams.get('tag');
  const rawPage = searchParams.get('page');

  // Input validation & sanitation
  const query = rawQuery.slice(0, 100).trim();
  
  let days = 30;
  if (rawDays !== null) {
    const parsed = parseInt(rawDays, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 365) {
      days = parsed;
    }
  }

  let page = 1;
  if (rawPage !== null) {
    const parsedPage = parseInt(rawPage, 10);
    if (!isNaN(parsedPage) && parsedPage >= 1) {
      page = parsedPage;
    }
  }

  const pageSize = 12;
  const tag = (rawTag ?? 'Build 42').slice(0, 50).trim();

  try {
    const { mods, total, source, warning } = await fetchWorkshopMods({
      query,
      days,
      tag,
      page,
      numperpage: pageSize,
    });

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const responseData: WorkshopApiResponse = {
      mods,
      source,
      total,
      page,
      totalPages,
      pageSize,
      warning,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error handling /api/workshop route:', error);
    return NextResponse.json(
      {
        mods: [],
        source: 'fallback',
        total: 0,
        page: 1,
        totalPages: 1,
        pageSize,
        warning: 'Internal server error while retrieving workshop mods',
      } as WorkshopApiResponse,
      { status: 500 }
    );
  }
}
