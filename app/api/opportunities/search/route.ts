import { NextRequest, NextResponse } from 'next/server';
import { SearchService } from '@/lib/services/searchService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const searchService = new SearchService();
    
    const query = searchParams.get('q') || '';
    const filters = {
      category: searchParams.get('category') || undefined,
      areaOfDelivery: searchParams.get('areaOfDelivery') || undefined,
      minBudget: searchParams.get('minBudget') ? parseFloat(searchParams.get('minBudget')!) : undefined,
      maxBudget: searchParams.get('maxBudget') ? parseFloat(searchParams.get('maxBudget')!) : undefined,
      activeOnly: searchParams.get('activeOnly') === 'true',
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    };

    const results = await searchService.search(query, filters);
    const total = await searchService.count(query, filters);
    const formatted = results.map(r => searchService.formatOpportunity(r));

    return NextResponse.json({
      success: true,
      count: formatted.length,
      total: total,
      data: formatted
    });
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}