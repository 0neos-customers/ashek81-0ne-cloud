# KPI Dashboard - Section Spec

## Overview

The KPI Dashboard is the command center for Fruitful Funding's business metrics. It tracks the customer journey from lead to funded client, monitors marketing spend, and provides real-time visibility into business health.

## Screens

### 1. Overview (Dashboard Home)
**Path:** `/kpi`

**Purpose:** At-a-glance business health with key metrics and trends.

**Layout:**
- Top row: 4 metric cards (Revenue, Leads, Clients, Funded Amount)
- Middle: Funnel visualization + Trend chart (side by side)
- Bottom: Recent activity table

**User Flows:**
- View current period metrics with comparison to previous period
- Click metric card → drill into detail view
- Change date range → all data updates
- Toggle between daily/weekly/monthly views

### 2. Funnel
**Path:** `/kpi/funnel`

**Purpose:** Visualize conversion through each stage of the customer journey.

**Layout:**
- Top: Stage selector tabs or horizontal funnel graphic
- Main: Detailed stage breakdown with conversion rates
- Side: Stage-over-stage comparison

**Stages:**
1. Leads (raw contacts)
2. Hand Raisers (engaged)
3. Qualified (meet criteria)
4. VIP (paid tier 1)
5. Premium (paid tier 2)
6. Funded (success)

**User Flows:**
- View count and conversion rate per stage
- Filter by date range, source, campaign
- Click stage → see contacts in that stage

### 3. Cohorts
**Path:** `/kpi/cohorts`

**Purpose:** Track performance of groups over time (by signup date, campaign, etc.)

**Layout:**
- Top: Cohort selector (by week, by month, by campaign)
- Main: Cohort table with retention/progression data
- Chart: Cohort curves overlay

**User Flows:**
- Select cohort grouping (time-based or attribute-based)
- View progression through funnel stages over time
- Compare cohorts against each other

### 4. Expenses
**Path:** `/kpi/expenses`

**Purpose:** Track marketing spend and ROI.

**Layout:**
- Top: Total spend metric cards (by channel)
- Main: Expense breakdown table
- Charts: Spend over time, ROI by channel

**User Flows:**
- View spend by category (ads, tools, team)
- Track cost per lead, cost per client
- Compare spend to revenue (ROI)

---

## UI Requirements

### Metric Cards
- Large primary value (currency or number)
- Comparison badge (% change, up/down indicator)
- Subtle sparkline (optional)
- Icon representing metric type

### Charts
- Clean, minimal design (no chartjunk)
- Tooltips on hover
- Responsive sizing
- Consistent color coding with design system

### Tables
- Sortable columns
- Pagination for large datasets
- Row hover states
- Action buttons (view, export)

### Filters
- Date range picker (presets + custom)
- Multi-select dropdowns for sources, campaigns
- Clear all / reset option

---

## Data Sources

| Data | Source | Sync Frequency |
|------|--------|----------------|
| Contacts | GoHighLevel API | Real-time webhook |
| Events | GoHighLevel API | Real-time webhook |
| Ad Metrics | Facebook/Meta API | Daily |
| Expenses | Manual entry / CSV | On demand |
| Revenue | GoHighLevel + Stripe | Real-time |

---

## Component List

| Component | Used In | Priority |
|-----------|---------|----------|
| MetricCard | Overview, Expenses | P0 |
| FunnelChart | Overview, Funnel | P0 |
| TrendChart | Overview, Cohorts | P0 |
| DataTable | All screens | P0 |
| DateRangePicker | All screens | P1 |
| FilterBar | Funnel, Cohorts | P1 |
| StageCard | Funnel | P1 |
| CohortTable | Cohorts | P2 |
| SparklineChart | MetricCard | P2 |
