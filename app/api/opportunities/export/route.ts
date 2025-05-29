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
      limit: 10000, // Export all results
    };

    const results = await searchService.search(query, filters);
    
    // Create CSV content
    const headers = [
      'Reference Number',
      'Title',
      'Procuring Entity',
      'Category',
      'Area of Delivery',
      'Approved Budget',
      'Currency',
      'Closing Date',
      'Days Until Closing',
      'Status',
      'Procurement Mode',
      'Funding Source',
      'Contact Person',
      'Contact Email',
      'Detail URL'
    ];
    
    const rows = results.map(opp => {
      const formatted = searchService.formatOpportunity(opp);
      return [
        opp.reference_number,
        `"${opp.title.replace(/"/g, '""')}"`,
        `"${opp.procuring_entity.replace(/"/g, '""')}"`,
        opp.category || '',
        opp.area_of_delivery || '',
        opp.approved_budget || '',
        opp.currency || 'PHP',
        opp.closing_date || '',
        formatted.days_until_closing,
        formatted.is_expired ? 'Expired' : 'Active',
        opp.procurement_mode || '',
        opp.funding_source || '',
        opp.contact_person || '',
        opp.contact_email || '',
        opp.detail_url || ''
      ].join(',');
    });
    
    const csv = [headers.join(','), ...rows].join('\n');
    
    // Return CSV response
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="philgeps-opportunities-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}