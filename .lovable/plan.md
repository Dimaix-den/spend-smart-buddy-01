
# SANDA Light Theme Redesign + Critical Fixes

## Summary
Complete visual overhaul from dark blue theme to a clean, white/light design. Fix toggle alignment, add scroll locking for modals, and apply iOS 26 glass effects adapted for light mode.

---

## Changes Overview

### 1. CSS Variables and Theme (index.css)
- Replace all dark HSL values with light equivalents:
  - `--background`: white (`0 0% 100%`)
  - `--foreground`: dark gray (`220 13% 18%`)
  - `--card` / `--surface`: light gray (`220 14% 96%`)
  - `--muted-foreground`: medium gray (`220 9% 46%`)
  - `--border`: subtle gray (`220 13% 91%`)
  - `--input`: light gray (`220 14% 96%`)
  - `--destructive`: red (`0 84% 60%`) instead of orange
  - `--warning`: amber (`38 92% 50%`)
  - `--alert-orange`: keep as warning/overspend color
- Update all `.glass-*` utility classes for light mode:
  - `.glass-card`: `background: rgba(255,255,255,0.8)`, `backdrop-filter: blur(20px)`, border `rgba(0,0,0,0.08)`
  - `.glass-nav`: white translucent `rgba(255,255,255,0.8)`, top border `rgba(0,0,0,0.08)`
  - `.glass-overlay`: `rgba(0,0,0,0.4)` backdrop
  - `.glass-sheet`: white `rgba(255,255,255,0.95)`, top border `rgba(0,0,0,0.1)`
  - `.glass-input`: `#F8F9FA` background, `rgba(0,0,0,0.08)` border
- Add `body.popup-open` scroll lock styles (`overflow: hidden; position: fixed; width: 100%`)

### 2. Bottom Navigation (BottomNav.tsx)
- Change glass background to light: `rgba(255,255,255,0.8)` with `backdrop-filter: blur(20px)`
- Border-top: `rgba(0,0,0,0.08)`
- Inactive tabs: gray (`#6B7280`), active: green (`safe-green`)
- Remove green glow `drop-shadow` filter, keep scale effect
- Active indicator bar: solid green gradient

### 3. Today Screen (Today.tsx)
- Update `InfoPanel` to use light glass classes (white background sheet, dark text, light borders)
- Replace `text-white/20` separator dots with `text-gray-300`
- Replace `bg-white/8`, `bg-white/5`, `border-white/10` with `bg-gray-100`, `bg-gray-50`, `border-gray-200`
- Transaction row: light card background, dark text
- FAB button: keep green gradient, adjust shadow for light theme

### 4. Accounts Screen (Accounts.tsx)
- Toggle switch fix: use explicit `bg-white` thumb with `box-shadow`, ensure proper containment
  - Track OFF: `#E5E7EB`, Track ON: green gradient
  - Thumb: white with shadow, proper `top: 3px`, `left: 3px`, `translateX(20px)` when ON
- Card backgrounds: white with subtle border
- Replace all `glass-input`, `border-white/10` references with light equivalents
- "Add account" dashed border: `border-gray-200` instead of `border-white/10`

### 5. Settings Screen (Settings.tsx)
- All `glass-card` and `glass-card-raised` will inherit new light styles from CSS
- Replace inline `bg-white/3`, `bg-white/5`, `border-white/6`, `border-white/8` with `bg-gray-50`, `border-gray-100`
- New month dialog: white card with light borders

### 6. UnifiedActionSheet (UnifiedActionSheet.tsx)
- Add scroll lock: `document.body.classList.add('popup-open')` on open, remove on close
- Sheet background inherits from `.glass-sheet` (now white)
- Handle bar: `bg-gray-300` instead of `bg-white/20`
- Segmented control: light gray background, active segment white with shadow
- Input/radio borders: light gray, selected accent borders
- Replace all `bg-white/15`, `bg-white/8`, `bg-white/10` with `bg-gray-100`, `bg-gray-50`
- Backdrop already closes on tap (existing `onClick={onClose}` on overlay div)

### 7. DailySpendingChart (DailySpendingChart.tsx)
- Bar background: `bg-gray-100` instead of `bg-white/5`
- Limit line: `border-gray-300` instead of `border-muted-foreground/30`

---

## Technical Details

### Files to modify:
1. **src/index.css** -- CSS variables, glass utilities, scroll lock
2. **src/components/BottomNav.tsx** -- light glass nav
3. **src/pages/Today.tsx** -- light-theme inline styles/classes
4. **src/pages/Accounts.tsx** -- toggle fix, light cards
5. **src/pages/Settings.tsx** -- light-theme inline styles
6. **src/components/UnifiedActionSheet.tsx** -- scroll lock, light styles
7. **src/components/DailySpendingChart.tsx** -- light bar chart
8. **tailwind.config.ts** -- no major changes needed (CSS vars handle theme)

### Scroll lock approach:
- In `UnifiedActionSheet`, use `useEffect` on `open` prop to toggle `document.body.classList` with `popup-open`
- CSS: `body.popup-open { overflow: hidden; position: fixed; width: 100%; height: 100%; }`
- Same pattern for any other modal (InfoPanel in Today.tsx)

### Toggle fix approach:
- Use the existing custom toggle button pattern but ensure thumb dimensions are `27px x 27px` inside a `51px x 31px` track
- Thumb positioned with `top: 2px, left: 2px`, `translateX(20px)` when active
- Track has `overflow: hidden` and proper rounded corners
- Thumb gets `bg-white` with `box-shadow: 0 2px 4px rgba(0,0,0,0.15)`
