import { NextResponse } from 'next/server';
import { SearchService } from '@/lib/services/searchService';

export async function GET() {
  try {
    const searchService = new SearchService();
    const stats = await searchService.getStatistics();
    
    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Statistics error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}