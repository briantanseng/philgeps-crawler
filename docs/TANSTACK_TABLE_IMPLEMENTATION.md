# TanStack Table Implementation Guide

## Overview
The PhilGEPS Crawler uses TanStack Table v8 to display procurement opportunities with advanced features including sorting, pagination, and expandable rows for ITB details.

## Key Features Implemented

### 1. Expandable Rows
- **Visual Indicator**: Arrow icons (▶/▼) indicate expandable/expanded state
- **Conditional Display**: Only rows with `hasItbDetails` property show expand button
- **State Management**: Expansion state maintained during pagination
- **Smooth Transitions**: CSS animations for expand/collapse

### 2. Sorting
- **Column Sorting**: Click column headers to sort
- **Visual Indicators**: ▲ (ascending), ▼ (descending), ↕ (unsorted)
- **Default Sort**: Opportunities sorted by closing date (ascending)
- **Multi-column Support**: Can sort by any column

### 3. Pagination
- **Server-side**: Efficient handling of large datasets
- **Page Size Options**: 10, 20, 30, 40, 50 items per page
- **Navigation Controls**: First, Previous, Next, Last buttons
- **Page Info**: Shows current page and total pages

### 4. Data Formatting
- **Budget**: Formatted as PHP currency
- **Dates**: Consistent date/time formatting
- **Status Badges**: Color-coded status indicators
- **Days Until Closing**: Calculated countdown

## Implementation Details

### Component Structure
```typescript
// components/OpportunitiesTable.tsx
export default function OpportunitiesTable({ 
  data, 
  loading 
}: OpportunitiesTableProps) {
  // State management
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'closing_date', desc: false }
  ]);
  const [expanded, setExpanded] = useState<ExpandedState>({});

  // Column definitions
  const columns = useMemo<ColumnDef<FormattedOpportunity>[]>(
    () => [...],
    []
  );

  // Table instance
  const table = useReactTable({
    data,
    columns,
    state: { sorting, expanded },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: (row) => row.original.hasItbDetails,
  });
}
```

### Column Definitions

#### Expander Column
```typescript
{
  id: 'expander',
  header: () => null,
  cell: ({ row }) => {
    if (!row.original.hasItbDetails) return null;
    return (
      <button
        onClick={row.getToggleExpandedHandler()}
        className="px-2 py-1 text-primary-900 hover:bg-primary-50 rounded"
      >
        {row.getIsExpanded() ? '▼' : '▶'}
      </button>
    );
  },
  size: 40,
}
```

#### Data Columns
```typescript
{
  accessorKey: 'reference_number',
  header: 'Reference #',
  cell: ({ getValue, row }) => {
    const value = getValue() as string;
    const url = row.original.detail_url;
    if (url) {
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" 
          className="text-primary-900 hover:underline font-medium">
          {value}
        </a>
      );
    }
    return value;
  },
}
```

### Expanded Row Content
```typescript
{row.getIsExpanded() && (
  <tr>
    <td colSpan={columns.length} className="bg-gray-50 px-6 py-4">
      <ItbDetails opportunity={row.original} />
    </td>
  </tr>
)}
```

### ITB Details Component
The `ItbDetails` component displays comprehensive information in a grid layout:

```typescript
function ItbDetails({ opportunity }: { opportunity: FormattedOpportunity }) {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h4 className="text-lg font-semibold text-primary-900 mb-4">
        ITB Details
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Conditional rendering of all ITB fields */}
        {opportunity.solicitation_number && (
          <div>
            <dt className="text-sm font-medium text-gray-500">
              Solicitation Number
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {opportunity.solicitation_number}
            </dd>
          </div>
        )}
        {/* ... more fields ... */}
      </div>
    </div>
  );
}
```

## Data Flow

### 1. Data Preparation
```typescript
// In searchService.ts
formatOpportunity(opportunity: Opportunity): FormattedOpportunity {
  // Calculate hasItbDetails flag
  const hasItbDetails = !!(
    opportunity.procurement_mode ||
    opportunity.funding_source ||
    opportunity.contact_person ||
    // ... check for 20+ ITB fields
  );
  
  return {
    ...opportunity,
    hasItbDetails,
    formatted_budget: this.formatCurrency(opportunity.approved_budget),
    days_until_closing: calculateDaysUntilClosing(opportunity.closing_date),
    // ... other formatted fields
  };
}
```

### 2. Table Rendering
```typescript
<tbody className="bg-white divide-y divide-gray-200">
  {table.getRowModel().rows.map(row => (
    <React.Fragment key={row.id}>
      <tr className="hover:bg-gray-50">
        {row.getVisibleCells().map(cell => (
          <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        ))}
      </tr>
      {row.getIsExpanded() && (
        <tr>
          <td colSpan={columns.length} className="bg-gray-50 px-6 py-4">
            <ItbDetails opportunity={row.original} />
          </td>
        </tr>
      )}
    </React.Fragment>
  ))}
</tbody>
```

## Styling and UX

### Responsive Design
- Table scrolls horizontally on mobile
- ITB details grid adjusts columns based on screen size
- Touch-friendly expand buttons

### Visual Feedback
- Hover states on rows and buttons
- Loading skeleton during data fetch
- Empty state message when no results

### Performance
- Memoized column definitions
- Virtual scrolling ready (can be enabled)
- Lazy loading of ITB details

## Usage Example

```typescript
// In page.tsx
const [searchResults, setSearchResults] = useState<FormattedOpportunity[]>([]);
const [loading, setLoading] = useState(false);

return (
  <OpportunitiesTable 
    data={searchResults} 
    loading={loading} 
  />
);
```

## Future Enhancements

1. **Column Visibility**: Allow users to show/hide columns
2. **Global Filtering**: Add table-wide search
3. **Row Selection**: Implement multi-select for bulk actions
4. **Export Selected**: Export only selected rows
5. **Column Resizing**: Draggable column borders
6. **Sticky Headers**: Keep headers visible during scroll
7. **Virtual Scrolling**: Enable for very large datasets