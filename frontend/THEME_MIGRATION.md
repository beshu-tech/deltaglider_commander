# Theme Token Migration Guide

## Overview

This document tracks the migration from hardcoded Tailwind colors to centralized semantic design tokens defined in `tailwind.config.js`.

## Goals

- **100% consistency** across light and dark themes
- **Centralized token system** for easy maintenance
- **Semantic naming** that reflects purpose, not color
- **Type-safe theme system** with comprehensive token coverage

---

## Semantic Token System

All theme tokens are defined in [`tailwind.config.js`](./tailwind.config.js) under `theme.extend.colors`:

### Color Palettes

#### Brand Colors (`brand-*`)
- **Purpose**: Primary interactive color (cyan-blue)
- **Scale**: 50-900
- **Usage**: Accents, links, focus states

#### Primary Action Colors (`primary-*`)
- **Purpose**: Primary buttons and CTAs (red)
- **Scale**: 50-950
- **Usage**: Main action buttons, important UI elements

#### UI Semantic Tokens (`ui-*`)

| Token | Light Mode | Dark Mode | Purpose |
|-------|------------|-----------|---------|
| `ui-bg` | `#F7F8FA` | `#1E1F22` | Main app background |
| `ui-bg-subtle` | `#F1F3F5` | `#16171a` | Subtle background variation |
| `ui-surface` | `#FFFFFF` | `#2B2D30` | Elevated cards/panels |
| `ui-surface-hover` | `#f8fafc` | `#374151` | Hover state for surfaces |
| `ui-surface-active` | `#f1f5f9` | `#1f2937` | Active/pressed state |
| `ui-border` | `#e2e8f0` | `#334155` | Primary borders |
| `ui-border-subtle` | `#f1f5f9` | `#1e293b` | Subtle borders |
| `ui-border-hover` | `#cbd5e1` | `#475569` | Border hover state |
| `ui-text` | `#0f172a` | `#f1f5f9` | Primary text |
| `ui-text-muted` | `#64748b` | `#94a3b8` | Secondary text |
| `ui-text-subtle` | `#94a3b8` | `#64748b` | Tertiary/subtle text |
| `ui-icon` | `#64748b` | `#94a3b8` | Icon colors |
| `ui-icon-subtle` | `#cbd5e1` | `#475569` | Subtle icon colors |

---

## Migration Status

### ✅ Completed Components

#### UI Library Components
- [x] `Button.tsx` - All variants use semantic tokens
- [x] `Input.tsx` - Inputs and focus states
- [x] `Select.tsx` - Dropdown selects
- [x] `Badge.tsx` - Status badges
- [x] `Table.tsx` - All table sub-components
- [x] `EmptyState.tsx` - Empty state placeholders
- [x] `DropdownMenu.tsx` - Dropdown menus and items

#### Layout Components
- [x] `AppLayout.tsx` - Main app container
- [x] `Header.tsx` - Top navigation header
- [ ] `Sidebar.tsx` - **PARTIAL** - Complex dark theme specific design needs review

#### Page Components
- [x] `SettingsPage.tsx` - Settings page
- [x] `BucketsPage.tsx` - Buckets overview page
- [ ] `UploadPage.tsx` - **TODO**

### 🔄 In Progress Components

#### Feature Components
- [ ] `BucketsPanel.tsx` - Bucket list panel
- [ ] `ObjectsView.tsx` - Objects view container
- [ ] `ObjectsTable.tsx` - Objects data table
- [ ] `ObjectsToolbar.tsx` - Toolbar actions
- [ ] `ObjectsSelectionBar.tsx` - Selection controls
- [ ] `DirectoryCountsCell.tsx` - Directory count display
- [ ] `FilePanel.tsx` - File details panel
- [ ] `StatsOverviewCards.tsx` - **SPECIAL CASE** - Has custom color palettes
- [ ] `SummaryCard.tsx` - Summary card component
- [ ] `UploadManager.tsx` - Upload interface
- [ ] `CredentialConfigForm.tsx` - Credential input form
- [ ] `AuthGuard.tsx` - Authentication guard
- [ ] `ErrorBoundary.tsx` - Error boundary component

---

## Migration Patterns

### Find & Replace Mappings

| Old Pattern | New Pattern | Notes |
|-------------|-------------|-------|
| `bg-white` | `bg-ui-surface` | Main surface backgrounds |
| `dark:bg-slate-900` | `dark:bg-ui-surface-dark` | Dark surface backgrounds |
| `bg-slate-50` | `bg-ui-bg-subtle` | Subtle backgrounds |
| `dark:bg-slate-950` | `dark:bg-ui-bg-subtle-dark` | Dark subtle backgrounds |
| `text-slate-900` | `text-ui-text` | Primary text |
| `dark:text-slate-100` | `dark:text-ui-text-dark` | Dark primary text |
| `text-slate-500` | `text-ui-text-muted` | Muted/secondary text |
| `dark:text-slate-400` | `dark:text-ui-text-muted-dark` | Dark muted text |
| `border-slate-200` | `border-ui-border` | Primary borders |
| `dark:border-slate-700` | `dark:border-ui-border-dark` | Dark borders |
| `hover:bg-slate-100` | `hover:bg-ui-surface-hover` | Hover states |
| `dark:hover:bg-slate-800` | `dark:hover:bg-ui-surface-hover-dark` | Dark hover states |
| `from-red-900` | `from-primary-900` | Primary action gradient |
| `to-red-900` | `to-primary-900` | Primary action gradient |

### Example Migration

**Before:**
```tsx
<div className="bg-white border border-slate-200 text-slate-900 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100">
  <p className="text-slate-500 dark:text-slate-400">Muted text</p>
</div>
```

**After:**
```tsx
<div className="bg-ui-surface border border-ui-border text-ui-text dark:bg-ui-surface-dark dark:border-ui-border-dark dark:text-ui-text-dark">
  <p className="text-ui-text-muted dark:text-ui-text-muted-dark">Muted text</p>
</div>
```

---

## Special Cases

### Sidebar.tsx
- **Status**: Partially migrated
- **Issue**: Heavy use of dark-mode-specific colors with opacity/alpha values
- **Needs**: Design review for light mode support or remain dark-only
- **Examples**: `bg-slate-800/30`, `border-slate-700/40`, `text-slate-400`

### StatsOverviewCards.tsx
- **Status**: Not migrated
- **Issue**: Custom color palettes for blue, purple, amber, emerald tones
- **Contains**: Inline gradient definitions and rgba color values
- **Needs**: Decide if custom palettes should be in tokens or remain inline

### Components with `red-900` Gradients
- Should use `primary-*` tokens for consistency
- Replace `red-900` → `primary-900`, `red-800` → `primary-800`, etc.

---

## Testing Checklist

After migration, verify:

- [ ] Light mode appearance is correct
- [ ] Dark mode appearance is correct
- [ ] Focus states are visible and accessible
- [ ] Hover states work correctly
- [ ] Text has sufficient contrast (WCAG AA minimum)
- [ ] Interactive elements are clearly distinguishable
- [ ] No hardcoded `slate-*` colors remain (except special cases)
- [ ] Theme toggle transitions smoothly

---

## Validation Commands

### Find Remaining Hardcoded Colors
```bash
# Find files with hardcoded slate colors
grep -r "slate-[0-9]" src --include="*.tsx" --include="*.ts" -l

# Count occurrences
grep -r "slate-[0-9]" src --include="*.tsx" --include="*.ts" | wc -l
```

### TypeScript Validation
```bash
pnpm typecheck
```

### Build Validation
```bash
pnpm build
```

---

## Benefits of Migration

1. **Consistency**: Single source of truth for all colors
2. **Maintainability**: Update theme in one place
3. **Accessibility**: Easier to ensure WCAG compliance
4. **Dark Mode**: Proper dark mode support with semantic tokens
5. **Developer Experience**: Clear, semantic naming improves code readability
6. **Future-Proof**: Easy to add new themes or color variations

---

## Next Steps

1. **Complete Feature Components**: Migrate remaining feature components
2. **Review Special Cases**: Decide on Sidebar and StatsOverviewCards approach
3. **Add Custom Tokens**: If needed, add more semantic tokens for special cases
4. **Documentation**: Update component documentation with token usage
5. **Design System**: Consider creating a design system documentation page

---

## Questions & Decisions Needed

- [ ] Should Sidebar support light mode or remain dark-only?
- [ ] Should StatsOverviewCards palettes be moved to tokens?
- [ ] Do we need additional semantic tokens for specific use cases?
- [ ] Should we add color alias utilities for common patterns?

---

## Resources

- [Tailwind Config](./tailwind.config.js) - Theme token definitions
- [Theme Hook](./src/app/theme.ts) - Theme toggle implementation
- [Global Styles](./src/styles/index.css) - Base theme styles
