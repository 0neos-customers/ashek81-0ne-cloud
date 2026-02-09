# Application Shell Specification

## Overview

The 0ne shell is a fully collapsible sidebar navigation that wraps all mini-apps. When collapsed, the active app takes full screen. A persistent toggle in the top-right allows opening/closing the sidebar at any time.

---

## Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│                                              [≡] Toggle     │  ← Top bar (minimal, just toggle)
├────────────┬────────────────────────────────────────────────┤
│            │                                                │
│  SIDEBAR   │              MAIN CONTENT AREA                 │
│            │                                                │
│  ┌──────┐  │         (Active mini-app renders here)        │
│  │ Home │  │                                                │
│  ├──────┤  │                                                │
│  │ KPI  │  │                                                │
│  │ Pros │  │                                                │
│  │ Sync │  │                                                │
│  │      │  │                                                │
│  │      │  │                                                │
│  │      │  │                                                │
│  ├──────┤  │                                                │
│  │ ⚙️   │  │                                                │
│  │ 👤   │  │                                                │
│  └──────┘  │                                                │
│            │                                                │
└────────────┴────────────────────────────────────────────────┘

COLLAPSED STATE:
┌─────────────────────────────────────────────────────────────┐
│                                              [≡] Toggle     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                   FULL SCREEN CONTENT                       │
│                                                             │
│              (Mini-app has maximum real estate)             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Sidebar Components

### Top Section (Navigation)

| Order | Item | Icon | Route | Notes |
|-------|------|------|-------|-------|
| 1 | Home | 🏠 (house) | `/` | App launcher, dashboard |
| 2 | KPI Dashboard | 📊 (chart) | `/kpi` | Only if user has access |
| 3 | Facebook Prospector | 👥 (people) | `/prospector` | Only if user has access |
| 4 | Skool-GHL Sync | 🔗 (link) | `/sync` | Only if user has access |

Apps are shown/hidden based on user permissions.

### Bottom Section (Account & Settings)

| Order | Item | Icon | Route | Notes |
|-------|------|------|-------|-------|
| 1 | Settings | ⚙️ (gear) | `/settings` | App preferences, admin |
| 2 | Account | 👤 (avatar) | Opens menu | User profile, sign out |

Account shows:
- User avatar (from Clerk)
- User name
- Click opens dropdown: "Manage Account", "Sign Out"

---

## Sidebar Behavior

### Expanded State (Default on Desktop)
- Width: 240px
- Shows icons + labels
- Background: White (#FFFFFF) - surface color
- Border-right: 1px gray-200

### Collapsed State
- Width: 0px (fully hidden)
- Main content area: 100% width
- Toggle button remains visible top-right

### Toggle Button
- Position: Fixed, top-right corner
- Icon: Hamburger (≡) when closed, X when open
- Always visible regardless of sidebar state
- Background: transparent, hover shows subtle highlight

### Transitions
- Sidebar slides in/out: 200ms ease
- Content area adjusts smoothly

---

## Responsive Behavior

### Desktop (≥1024px)
- Sidebar expanded by default
- User can collapse for more space
- State persists in localStorage

### Tablet (768px - 1023px)
- Sidebar collapsed by default
- Opens as overlay when toggled
- Backdrop blur behind sidebar

### Mobile (<768px)
- Sidebar collapsed by default
- Opens as full-height overlay
- Backdrop closes sidebar on tap

---

## Active State

- Active nav item: Orange left border (4px), background cream
- Hover state: Light cream background
- Icons: Gray when inactive, black when active/hover

---

## Branding

### Logo Area (Top of Sidebar)
- "One" text or logo mark
- Clicking returns to Home
- Optional: Collapse into icon-only when sidebar is narrow

---

## Z-Index Layers

| Layer | Z-Index | Content |
|-------|---------|---------|
| Base | 0 | Main content area |
| Sidebar | 40 | Sidebar panel |
| Toggle | 50 | Toggle button |
| Modals | 100 | Dialogs, sheets |
| Toasts | 110 | Notifications |

---

## Accessibility

- Sidebar toggle: `aria-label="Toggle navigation"`
- Nav items: Proper `aria-current="page"` for active item
- Keyboard: `Escape` closes sidebar on mobile
- Focus trap when sidebar overlay is open on mobile

---

## Implementation Notes

1. **Persist sidebar state** in localStorage per user
2. **Check permissions** before rendering app nav items
3. **Preload app routes** for fast navigation
4. **Animate smoothly** - no janky transitions
5. **Keep toggle always accessible** - never hide it
