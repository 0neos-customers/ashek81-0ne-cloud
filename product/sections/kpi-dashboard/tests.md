# KPI Dashboard - Test Specifications

## Overview

Test coverage for the KPI Dashboard section. Use test-driven development approach:
write tests first, then implement to pass.

---

## Component Tests

### MetricCard
```
✓ renders value formatted as currency when type="currency"
✓ renders value formatted as number when type="number"
✓ shows positive change with green up arrow
✓ shows negative change with red down arrow
✓ shows neutral change with gray indicator
✓ displays sparkline when data provided
✓ handles missing/null values gracefully
```

### FunnelChart
```
✓ renders all stages in correct order
✓ displays stage count and name
✓ shows conversion rate between stages
✓ applies correct colors from props
✓ handles empty data without crashing
✓ is responsive to container width
```

### TrendChart
```
✓ renders line for each data series
✓ shows tooltip on hover with correct values
✓ handles date formatting on x-axis
✓ scales y-axis appropriately
✓ supports multiple overlaid series
✓ handles missing data points
```

### DataTable
```
✓ renders all columns from schema
✓ sorts by column when header clicked
✓ paginates when rows exceed limit
✓ shows loading state
✓ shows empty state when no data
✓ row click triggers callback
```

### DateRangePicker
```
✓ shows preset options (Today, This Week, This Month, etc.)
✓ allows custom date range selection
✓ validates end date is after start date
✓ calls onChange with selected range
✓ displays selected range in readable format
```

---

## Screen Tests

### Overview Page (`/kpi`)
```
✓ displays all four metric cards
✓ metric values match data source
✓ funnel chart renders with correct stages
✓ trend chart shows weekly data by default
✓ date range picker is visible and functional
✓ changing date range updates all components
✓ recent activity table shows latest entries
```

### Funnel Page (`/kpi/funnel`)
```
✓ displays detailed funnel visualization
✓ shows conversion rate for each stage
✓ clicking stage filters to show contacts
✓ filter controls update funnel data
✓ comparison mode shows two time periods
```

### Cohorts Page (`/kpi/cohorts`)
```
✓ displays cohort table with progression data
✓ cohort selector changes grouping
✓ cells show correct values for each period
✓ cohort chart renders curves correctly
✓ handles cohorts with incomplete data
```

### Expenses Page (`/kpi/expenses`)
```
✓ displays category breakdown cards
✓ channel ROI table shows all channels
✓ spend over time chart renders
✓ totals calculate correctly
✓ adding new expense updates totals
```

---

## Integration Tests

### Data Flow
```
✓ changing global date range updates all screens
✓ navigation between screens preserves filter state
✓ real-time updates reflect in metrics (when connected)
✓ export functionality generates correct CSV
```

### Error Handling
```
✓ shows error message when API fails
✓ retry button attempts to refetch
✓ stale data indicator when refresh fails
✓ graceful degradation with partial data
```

### Loading States
```
✓ skeleton loaders show while data fetching
✓ charts show loading indicator
✓ tables show loading rows
```

---

## Accessibility Tests

```
✓ all interactive elements are keyboard accessible
✓ charts have aria-labels describing data
✓ color is not the only indicator (patterns/shapes too)
✓ focus states are visible
✓ screen reader can navigate all sections
```

---

## Performance Tests

```
✓ initial page load under 2 seconds
✓ chart renders under 500ms
✓ filter changes respond under 300ms
✓ no memory leaks on repeated filter changes
```
