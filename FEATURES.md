# PhilGEPS Crawler - Feature Documentation

This document provides detailed information about all features implemented in the PhilGEPS Crawler application.

## Table of Contents
1. [Search & Discovery](#search--discovery)
2. [ITB Details & Expandable Rows](#itb-details--expandable-rows)
3. [Crawler Management](#crawler-management)
4. [Data Visualization](#data-visualization)
5. [Export Functionality](#export-functionality)
6. [Performance Features](#performance-features)
7. [User Interface](#user-interface)
8. [Testing & Quality](#testing--quality)

## Search & Discovery

### Advanced Search Engine
The application provides a powerful search interface with multiple filtering options:

#### Keyword Search
- **Full-text search** across opportunity titles and procuring entities
- **Case-insensitive** matching
- **Partial word matching** supported
- Uses SQLite's LIKE operator with proper indexing

#### Filter Options
1. **Category Filter**
   - Dropdown populated with all available categories
   - Real-time filtering
   - Categories fetched from `/api/categories`

2. **Area of Delivery Filter**
   - All Philippine regions and "Nationwide" option
   - Dynamic population from database
   - Supports regional and provincial filtering

3. **Budget Range Filter**
   - Minimum and maximum budget inputs
   - Supports large numbers (up to billions)
   - Currency displayed in PHP format

4. **Status Filter**
   - "Active Only" (default) - Shows non-expired opportunities
   - "All" - Shows all opportunities including expired

#### Search Implementation
```typescript
// Search is performed server-side with SQL optimization
const searchQuery = `
  SELECT * FROM opportunities 
  WHERE (title LIKE $query OR procuring_entity LIKE $query)
  AND category = $category
  AND approved_budget BETWEEN $minBudget AND $maxBudget
  AND closing_date > datetime('now')  // For active only
`;
```

## ITB Details & Expandable Rows

### TanStack Table Implementation
The opportunities table uses TanStack Table v8 with advanced features:

#### Expandable Row Feature
- **Visual Indicator**: Arrow icon (▶/▼) shows expandable rows
- **Conditional Display**: Only shows for rows with ITB details
- **Smooth Animation**: CSS transitions for expand/collapse
- **State Management**: Maintains expansion state during pagination

#### ITB Information Displayed
When expanded, rows show comprehensive ITB details in a structured grid layout:

**Procurement Information**
- Solicitation Number
- Procurement Mode
- Classification
- Trade Agreement

**Financial Details**
- Funding Source
- Approved Budget
- Bid Documents Fee
- Payment Terms

**Timeline Information**
- Pre-bid Conference Date
- Bid Submission Deadline
- Bid Opening Date
- Delivery Period

**Contact Information**
- Contact Person
- Designation
- Email Address
- Phone Number
- Physical Address

**Organization Details**
- Client Agency
- BAC Chairman
- BAC Secretariat
- Created By

**Additional Information**
- Description (full text)
- Eligibility Requirements
- Special Instructions
- Document Requirements

#### Implementation Details
```typescript
// Row expansion check
getRowCanExpand: (row) => row.original.hasItbDetails

// ITB details detection
const hasItbDetails = !!(
  opportunity.procurement_mode ||
  opportunity.funding_source ||
  opportunity.contact_person ||
  // ... checks for 20+ ITB fields
);
```

## Crawler Management

### Web-Based Control Panel
The crawler control panel provides full management capabilities:

#### Status Display
- **Real-time Status**: Active/Inactive/Running indicators
- **Color Coding**: 
  - Green = Active
  - Gray = Inactive
  - Yellow = Running
- **Auto-refresh**: Updates every 10 seconds
- **Last Update Time**: Shows when status was last checked

#### Toggle Control
- **Enable/Disable Switch**: iOS-style toggle switch
- **Instant Feedback**: Visual confirmation of state change
- **API Integration**: Calls `/api/crawler/toggle`
- **Persistent State**: Maintains state across page refreshes

#### Manual Crawl Trigger
- **Run Now Button**: Triggers immediate crawl
- **Loading States**: 
  - "Starting..." during initiation
  - Disabled while crawler runs
- **Error Handling**: Shows alerts for failures
- **Queue Management**: Prevents multiple simultaneous runs

#### Crawl History Display
Shows last crawl results with:
- Timestamp and duration
- Opportunities found/new/updated
- Error count and messages
- Success/failure status

### Background Crawler Service

#### Scheduling System
- **Configurable Interval**: Set via `CRAWL_INTERVAL_MINUTES`
- **Automatic Execution**: Runs on schedule when enabled
- **Skip When Running**: Prevents overlapping crawls
- **Next Run Display**: Shows countdown to next crawl

#### Crawling Process
1. **Page Navigation**: Crawls configured number of pages
2. **Request Throttling**: Delays between requests (`REQUEST_DELAY_MS`)
3. **Data Extraction**: Parses opportunity listings
4. **ITB Fetching**: Optional detailed information retrieval
5. **Database Updates**: Inserts new, updates existing
6. **History Logging**: Records all crawl metrics

#### Error Handling
- **Timeout Protection**: Overall timeout limit
- **Retry Logic**: Automatic retry for failed requests
- **Error Logging**: Detailed error messages stored
- **Graceful Degradation**: Continues on partial failures

## Data Visualization

### Statistics Dashboard
Real-time metrics displayed in card format:

#### Total Opportunities
- **Live Count**: Total records in database
- **Format**: Comma-separated numbers
- **Update**: Refreshes with page load

#### Active Opportunities
- **Calculation**: `closing_date > current_date`
- **Real-time**: Updates as opportunities expire
- **Percentage**: Shows % of total that are active

#### Categories Count
- **Unique Values**: Distinct categories in use
- **Dynamic**: Updates as new categories added

#### Procuring Entities
- **Organization Count**: Unique entities
- **Growth Tracking**: Increases with new entities

### Visual Status Indicators

#### Opportunity Status Badges
- **Active** (Green): More than 3 days until closing
- **Closing Soon** (Yellow): 3 days or less remaining
- **Expired** (Red): Past closing date

#### Days Until Closing
- **Countdown Display**: "X days" format
- **Today Highlight**: Special formatting for same-day
- **Negative Values**: Shows "Expired" for past dates

## Export Functionality

### CSV Export Feature
Comprehensive data export with all filters applied:

#### Export Process
1. **Filter Preservation**: Exports only filtered results
2. **Column Selection**: All relevant fields included
3. **Formatting**: Proper CSV escaping and encoding
4. **File Naming**: `opportunities-YYYY-MM-DD.csv`

#### Exported Fields
- Reference Number
- Title
- Procuring Entity
- Category
- Area of Delivery
- Approved Budget
- Currency
- Closing Date
- Days Until Closing
- Status
- Solicitation Number
- Procurement Mode
- Contact Information
- URLs

#### Implementation
```javascript
// CSV generation with proper escaping
const csvContent = [
  headers.join(','),
  ...data.map(row => 
    fields.map(field => 
      `"${String(row[field]).replace(/"/g, '""')}"`
    ).join(',')
  )
].join('\n');
```

## Performance Features

### Database Optimization

#### Indexing Strategy
Multiple indexes for query performance:
```sql
-- Single column indexes
CREATE INDEX idx_reference_number ON opportunities(reference_number);
CREATE INDEX idx_closing_date ON opportunities(closing_date);
CREATE INDEX idx_category ON opportunities(category);

-- Composite indexes for common queries
CREATE INDEX idx_area_status ON opportunities(area_of_delivery, status);
CREATE INDEX idx_category_status ON opportunities(category, status);

-- Partial index for budget queries
CREATE INDEX idx_budget_status ON opportunities(approved_budget, status) 
WHERE approved_budget IS NOT NULL;
```

#### Query Optimization
- **Parameterized Queries**: Prevents SQL injection
- **Limit/Offset**: Server-side pagination
- **Selective Loading**: ITB details loaded on-demand

### Frontend Performance

#### TanStack Table Features
- **Virtual Scrolling**: Handles large datasets
- **Memoized Columns**: Prevents unnecessary re-renders
- **Lazy Expansion**: ITB details render only when needed

#### React Optimizations
- **UseMemo Hooks**: For expensive computations
- **UseCallback**: For event handler stability
- **Key Props**: Proper list rendering

## User Interface

### Responsive Design
Built with Tailwind CSS for all screen sizes:

#### Desktop Layout
- **Multi-column Forms**: Efficient use of space
- **Wide Tables**: Full data visibility
- **Sidebar Navigation**: Easy access to all features

#### Mobile Adaptations
- **Stacked Forms**: Single column on small screens
- **Horizontal Scroll**: Tables remain readable
- **Touch-friendly**: Large tap targets
- **Condensed Stats**: Card layout adjusts

### Accessibility Features
- **Semantic HTML**: Proper heading structure
- **ARIA Labels**: Screen reader support
- **Keyboard Navigation**: Full keyboard access
- **Color Contrast**: WCAG AA compliance
- **Focus Indicators**: Visible focus states

### User Experience

#### Loading States
- **Skeleton Screens**: Shows layout while loading
- **Spinner Icons**: Clear loading indicators
- **Progress Messages**: "Loading opportunities..."

#### Error Handling
- **User-friendly Messages**: Clear error descriptions
- **Retry Options**: Allow users to try again
- **Fallback States**: Graceful degradation

#### Empty States
- **No Results**: Helpful message with suggestions
- **Clear CTAs**: Guide users to take action

## Testing & Quality

### End-to-End Testing
Comprehensive Playwright test suite:

#### Test Coverage
- **Homepage Tests**: All sections render correctly
- **Search Tests**: Keyword and filter functionality
- **Crawler Tests**: Toggle, manual run, status
- **Export Tests**: CSV download verification
- **Cross-browser**: Chrome, Firefox, Safari, Mobile

#### Test Implementation
```typescript
// Example test for expandable rows
test('should expand row with ITB details', async ({ page }) => {
  await page.goto('/');
  await page.fill('input[placeholder*="keywords"]', 'construction');
  await page.click('button:has-text("Search")');
  
  const expandButton = page.locator('button:has-text("▶")').first();
  await expandButton.click();
  
  await expect(page.locator('text=ITB Details')).toBeVisible();
  await expect(page.locator('text=Procurement Mode')).toBeVisible();
});
```

### Code Quality

#### TypeScript Integration
- **Type Safety**: Full TypeScript coverage
- **Interface Definitions**: Clear data contracts
- **Generic Components**: Reusable with types

#### Linting & Formatting
- **ESLint**: Enforces code standards
- **Prettier**: Consistent formatting
- **Pre-commit Hooks**: Automatic checks

#### Documentation
- **JSDoc Comments**: API documentation
- **README Files**: Setup and usage guides
- **Inline Comments**: Complex logic explained

## Future Enhancements

### Planned Features
1. **Real-time Updates**: WebSocket integration
2. **Advanced Analytics**: Trending and insights
3. **Saved Searches**: User preferences
4. **Email Alerts**: Notification system
5. **API Rate Limiting**: Production readiness
6. **Multi-language Support**: Internationalization

### Technical Improvements
1. **Redis Caching**: Performance boost
2. **PostgreSQL Migration**: Scalability
3. **Docker Compose**: Full stack deployment
4. **CI/CD Pipeline**: Automated testing
5. **Monitoring**: Application insights