import { NextResponse } from 'next/server';
import { SearchService } from '@/lib/services/searchService';

export async function GET() {
  try {
    const searchService = new SearchService();
    const areas = await searchService.getAreas();
    
    return NextResponse.json({
      success: true,
      count: areas.length,
      data: areas
    });
  } catch (error: any) {
    console.error('Areas error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}