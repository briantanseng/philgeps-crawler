import { NextResponse } from 'next/server';
import { SearchService } from '@/lib/services/searchService';

export async function GET() {
  try {
    const searchService = new SearchService();
    const categories = await searchService.getCategories();
    
    return NextResponse.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error: any) {
    console.error('Categories error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}