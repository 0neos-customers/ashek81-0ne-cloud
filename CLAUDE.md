# 0ne App - Claude Code Instructions

## FIRST: Read Build State

**Before doing ANY work on this project, read:**
```
product/BUILD-STATE.md
```

This file tracks what's done, what's in progress, and what to work on next.

---

## Project Overview

0ne is Jimmy's personal "everything app" - a command center for business operations.

**Apps included:**
- KPI Dashboard - Business metrics and funnel tracking
- Prospector - Facebook lead engagement tool
- Skool Sync - Sync Skool messages with GoHighLevel CRM

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| UI | React + Tailwind CSS v4 |
| Components | Custom (shadcn/ui patterns) |
| Auth | Clerk |
| Database | Supabase (PostgreSQL) |
| Package Manager | bun (NEVER npm/yarn/pnpm) |

---

## Key Directories

```
0ne-app/
├── product/                 ← DesignOS specs (READ BUILD-STATE.md FIRST)
│   ├── BUILD-STATE.md       ← Session tracking
│   ├── sections/            ← Per-section specs
├── apps/
│   └── web/                 ← Next.js app
│       └── src/
│           ├── app/         ← Pages (App Router)
│           ├── components/  ← Shared components
│           └── features/    ← Feature-specific code
├── packages/
│   ├── ui/                  ← Shared UI components
│   ├── db/                  ← Database client + schemas
│   └── auth/                ← Auth utilities
```

---

## Design System

- **Primary:** #FF692D (Monarch orange)
- **Background:** #F6F5F3 (warm cream)
- **Text:** #22201D (near-black)
- **Sidebar:** #1C1B19 (dark charcoal)
- **Border Radius:** 6px (0.375rem)
- **Shadows:** Subtle - `rgba(34,32,29,0.05)`

---

## Commands

```bash
# Start dev server
cd apps/web && bun dev

# Install dependencies
bun install

# Database
bunx supabase start
```

---

## Session Protocol

**At session START:**
1. Read `product/BUILD-STATE.md`
2. Continue from "Next Session Focus"

**At session END:**
1. Update `product/BUILD-STATE.md` checkboxes
2. Update "Last Updated" date
3. Update "Next Session Focus"
4. Note any blockers
