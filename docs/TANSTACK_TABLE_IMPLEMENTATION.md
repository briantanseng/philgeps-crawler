# TanStack Table Implementation with Expandable Rows

## Overview

The PhilGEPS Crawler search interface uses TanStack Table v8 to display search results with expandable rows for ITB (Invitation to Bid) details. This provides a clean, performant table with sorting, pagination, and detail expansion capabilities.

## Features

### 1. Table Functionality
- **Sorting**: Click column headers to sort ascending/descending
- **Pagination**: Navigate through results with customizable page sizes (10, 20, 50, 100)
- **Expandable Rows**: Click expand button to view ITB details inline
- **Responsive Design**: Table adapts to different screen sizes

### 2. ITB Details Display
When expanded, rows show additional information including:
- Solicitation Number
- Procurement Mode
- Trade Agreement
- Classification
- Funding Source
- Delivery Period
- Contact Information (Person, Designation, Phone, Email)
- Pre-bid Conference Details
- Bid Documents Fee
- Important Dates (Published, Submission Deadline, Opening Date)
- Full Description

### 3. Visual Indicators
- **Expand Button**: Shows ▶ when collapsed, ▼ when expanded
- **Status Badges**: Active (green), Closing Soon (yellow), Expired (red)
- **Days Until Closing**: Color-coded based on urgency
- **Reference Links**: Clickable reference numbers open detail pages

## Implementation Details

### Table Configuration

```javascript
const table = createTable({
    data: currentData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: (row) => row.original.hasItbDetails,
    state: {
        expanded: expandedState,
    },
    onExpandedChange: (updater) => {
        expandedState = typeof updater === 'function' 
            ? updater(expandedState)
            : updater;
        table.options.state.expanded = expandedState;
        renderTable();
    },
});
```

### Determining ITB Details Availability

The `hasItbDetails` flag is computed in the `SearchService.formatOpportunity()` method:

```javascript
const hasItbDetails = !!(
    opportunity.procurement_mode ||
    opportunity.funding_source ||
    opportunity.delivery_period ||
    opportunity.contact_person ||
    opportunity.contact_email ||
    opportunity.contact_phone ||
    opportunity.pre_bid_conference ||
    opportunity.bid_documents_fee ||
    opportunity.bid_submission_deadline ||
    opportunity.bid_opening_date ||
    opportunity.description
);
```

### Column Definitions

The table includes the following columns:
1. **Expander**: Shows expand/collapse button for rows with ITB details
2. **Reference Number**: Linked to detail page
3. **Title**: Truncated with ellipsis for long titles
4. **Procuring Entity**: Organization requesting the bid
5. **Category**: Type of procurement
6. **Area**: Area of delivery
7. **Budget**: Formatted currency amount
8. **Closing Date**: Date with status badge
9. **Days Left**: Countdown to closing

### Styling

The expanded row content uses:
- **Background**: Light gray (#f8fafc) for the expanded row
- **Border**: 2px solid bottom border for visual separation
- **Content Background**: White with subtle shadow
- **Grid Layout**: Responsive grid for ITB fields
- **Typography**: Uppercase labels with proper spacing

## Usage

### Basic Search Flow
1. User enters search criteria
2. Results load into TanStack Table
3. User can sort columns by clicking headers
4. User clicks expand button (▶) to view ITB details
5. Expanded content shows inline below the row
6. User can collapse by clicking again (▼)

### Pagination Controls
- **Page Size**: Dropdown to select rows per page
- **Navigation**: First, Previous, Next, Last buttons
- **Page Numbers**: Direct page selection
- **Info Display**: Shows current range and total count

## Technical Notes

### Performance Considerations
- Table uses virtual row model for efficient rendering
- Expansion state managed separately from table data
- Only expanded rows render detail content
- Pagination reduces DOM elements

### Browser Compatibility
- Modern browsers with ES6 module support
- CSS Grid for responsive layouts
- Flexbox for component alignment
- CSS transitions for smooth interactions

### Dependencies
- TanStack Table Core v8.11.2 (loaded via CDN)
- No additional UI framework required
- Pure JavaScript implementation

## Customization

### Adding New ITB Fields
1. Add field check to `hasItbDetails` computation in SearchService
2. Add field display in `renderItbDetails()` function
3. Follow existing pattern for conditional rendering

### Styling Modifications
- Expand button: `.expand-btn` class
- ITB details container: `.itb-details` class
- Expanded row: `.expanded-row` class
- Field grid: `.itb-grid` class

## Future Enhancements

1. **Bulk Operations**: Select multiple rows for export
2. **Column Visibility**: Toggle which columns to display
3. **Advanced Filtering**: Filter by ITB detail fields
4. **Keyboard Navigation**: Arrow keys for row selection
5. **Print View**: Optimized layout for printing