# TanStack Table Implementation

The PhilGEPS Crawler now features a modern, interactive table interface using TanStack Table for displaying search results.

## Features

### 📊 Advanced Table Features
- **Sortable columns** - Click column headers to sort ascending/descending
- **Resizable columns** - Optimized column widths for better data visibility
- **Expandable rows** - Show/hide detailed ITB information
- **Responsive design** - Works on all screen sizes

### 🔍 ITB Details Show/Hide
- **Expand button** - Click "▶ Details" to show ITB information for opportunities that have it
- **Organized layout** - ITB details displayed in a clean grid format
- **Smart detection** - Only shows expand button for opportunities with ITB data
- **Collapsible** - Click "▼ Details" to hide the expanded information

### 📄 Pagination Features
- **Page size selection** - Choose 10, 20, 50, or 100 entries per page
- **Page navigation** - First, Previous, Next, Last buttons
- **Page numbers** - Direct page selection with highlighted current page
- **Entry counter** - Shows "Showing X to Y of Z entries"
- **Efficient rendering** - Only renders visible rows for performance

### 🎨 Visual Enhancements
- **Status badges** - Color-coded badges for Active, Closing Soon, and Expired
- **Hover effects** - Row highlighting on hover
- **Clickable references** - Reference numbers link to PhilGEPS detail pages
- **Currency formatting** - Budget values properly formatted in PHP
- **Date formatting** - User-friendly date display with days remaining

## Implementation Details

### TanStack Table Configuration
```javascript
const table = createTable({
    data: currentData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    initialState: {
        pagination: { pageSize: 20 },
        sorting: [{ id: 'closing_date', desc: false }]
    }
});
```

### Column Definitions
1. **Expander** - Show/hide ITB details
2. **Reference #** - Clickable link to PhilGEPS
3. **Title** - Opportunity title with tooltip
4. **Procuring Entity** - Organization name
5. **Category** - Procurement category
6. **Area** - Area of delivery
7. **Budget** - Formatted currency
8. **Closing Date** - Date with status badge
9. **Days Left** - Time remaining indicator

### ITB Details Displayed
When expanded, the following ITB fields are shown (if available):
- Solicitation Number
- Procurement Mode
- Trade Agreement
- Classification
- Delivery Period
- Contact Person & Details
- Pre-bid Conference
- Bid Documents Fee
- Date Published
- Description

## Performance Optimizations

### Client-Side Benefits
- **Virtual scrolling** - Only renders visible rows
- **Memoized calculations** - Caches sorted/filtered data
- **Efficient re-renders** - Only updates changed cells
- **Lazy loading** - ITB details loaded on demand

### Server-Side Benefits
- **Single API call** - Gets all data for client-side operations
- **Indexed queries** - Fast database lookups
- **Optimized payload** - Only sends necessary fields

## User Experience

### Search Workflow
1. Enter search criteria in the form
2. Click Search button
3. Results appear in the interactive table
4. Sort by any column
5. Expand rows to see ITB details
6. Navigate pages or change page size
7. Export results to CSV

### Keyboard Navigation
- **Tab** - Navigate between controls
- **Enter** - Submit search form
- **Space** - Toggle expanded rows
- **Arrow keys** - Navigate table (when focused)

## Browser Compatibility
- Chrome/Edge 88+
- Firefox 78+
- Safari 14+
- Mobile browsers supported

## API Integration
The table consumes the existing search API:
```
GET /api/opportunities/search?q=&category=&areaOfDelivery=&limit=1000
```

All pagination, sorting, and filtering happens client-side for instant responsiveness.