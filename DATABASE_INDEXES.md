# Database Index Documentation

This document describes the database indexes implemented for query performance optimization in the PhilGEPS crawler system.

## Index Strategy

The indexing strategy follows these principles:
1. **Single-column indexes** for frequently filtered columns
2. **Composite indexes** for common query patterns
3. **Partial indexes** for nullable columns with frequent queries
4. **Descending indexes** for time-series data

## Opportunities Table Indexes

### Single Column Indexes
These indexes optimize queries that filter by individual columns:

| Index Name | Column | Purpose |
|------------|---------|---------|
| `idx_reference_number` | reference_number | Quick lookup by unique reference |
| `idx_closing_date` | closing_date | Filter/sort by closing date |
| `idx_category` | category | Filter by opportunity category |
| `idx_procuring_entity` | procuring_entity | Filter by organization |
| `idx_solicitation_number` | solicitation_number | Lookup by solicitation number |
| `idx_procurement_mode` | procurement_mode | Filter by procurement type |
| `idx_area_of_delivery` | area_of_delivery | Filter by geographic area |
| `idx_status` | status | Filter active/closed opportunities |
| `idx_approved_budget` | approved_budget | Budget range queries |
| `idx_title` | title | Text search on titles |
| `idx_publish_date` | publish_date | Filter by publication date |

### Composite Indexes
These optimize common multi-column query patterns:

| Index Name | Columns | Query Pattern |
|------------|---------|---------------|
| `idx_area_status` | area_of_delivery, status | Active opportunities by area |
| `idx_category_status` | category, status | Active opportunities by category |
| `idx_procurement_mode_status` | procurement_mode, status | Active opportunities by procurement type |
| `idx_status_closing_date` | status, closing_date | Active opportunities sorted by closing date |
| `idx_entity_status` | procuring_entity, status | Active opportunities by entity |
| `idx_area_category_status` | area_of_delivery, category, status | Complex filters combining area and category |

### Partial Index
| Index Name | Columns | Condition | Purpose |
|------------|---------|-----------|---------|
| `idx_budget_status` | approved_budget, status | WHERE approved_budget IS NOT NULL | Optimize budget queries, skip nulls |

## Crawl History Table Indexes

| Index Name | Columns | Purpose |
|------------|---------|---------|
| `idx_crawl_date` | crawl_date DESC | Recent crawl history lookup |
| `idx_crawl_status` | status, crawl_date DESC | Filter by status, sorted by date |

## Query Performance Benefits

### Example Query Optimizations

1. **Active opportunities in NCR**
   ```sql
   SELECT * FROM opportunities 
   WHERE area_of_delivery = 'NCR' AND status = 'Open'
   -- Uses: idx_area_status
   ```

2. **Budget range search**
   ```sql
   SELECT * FROM opportunities 
   WHERE approved_budget BETWEEN 1000000 AND 5000000 
   AND status = 'Open'
   -- Uses: idx_budget_status (partial index)
   ```

3. **Recent opportunities by category**
   ```sql
   SELECT * FROM opportunities 
   WHERE category = 'Construction' AND status = 'Open'
   ORDER BY closing_date
   -- Uses: idx_category_status
   ```

4. **Complex area/category filter**
   ```sql
   SELECT * FROM opportunities 
   WHERE area_of_delivery = 'NCR' 
   AND category = 'IT Equipment' 
   AND status = 'Open'
   -- Uses: idx_area_category_status
   ```

## Index Maintenance

### Automatic Optimization
- SQLite automatically maintains indexes during INSERT/UPDATE/DELETE operations
- The `ANALYZE` command is run periodically to update query planner statistics

### Monitoring Index Usage
To check if indexes are being used effectively:

```sql
-- Check query plan
EXPLAIN QUERY PLAN 
SELECT * FROM opportunities 
WHERE area_of_delivery = 'NCR' AND status = 'Open';

-- Update statistics
ANALYZE;
```

## Performance Impact

### Benefits
- **Faster queries**: 10-100x improvement for filtered queries
- **Efficient pagination**: Quick LIMIT/OFFSET queries
- **Better sorting**: Fast ORDER BY operations
- **Reduced I/O**: Indexes prevent full table scans

### Trade-offs
- **Storage**: ~20-30% additional disk space
- **Write performance**: Slight overhead on INSERT/UPDATE operations
- **Maintenance**: Indexes are automatically maintained by SQLite

## Best Practices

1. **Use appropriate queries**: Write queries that can leverage existing indexes
2. **Avoid wildcards at start**: Use `title LIKE 'search%'` not `title LIKE '%search%'`
3. **Order matters in composite indexes**: Put most selective columns first
4. **Monitor performance**: Use EXPLAIN QUERY PLAN to verify index usage
5. **Regular maintenance**: Run ANALYZE periodically to update statistics