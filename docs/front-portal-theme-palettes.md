# Front portal theme: palettes and token usage

Reference for operators and developers: how [`front/public/portal.json`](front/public/portal.json) `theme.colors` drives the Next.js app (`front/`), which CSS variables are set, and copy-paste **example palettes**.

## Source of truth

| Location | Role |
|----------|------|
| `front/public/portal.json` → `theme.colors` | Per-deployment brand: `primary`, `secondary`, `accent` (hex strings). |
| [`front/lib/portal/themeApply.ts`](../front/lib/portal/themeApply.ts) | Converts those hex values to **oklch** on `:root` / `<html>` and wires shadcn semantic tokens. |
| [`front/app/layout.tsx`](../front/app/layout.tsx) | Server: `portalThemeStyleProps()` on `<html>` so the first paint matches the portal file. |
| [`front/contexts/portal-context.tsx`](../front/contexts/portal-context.tsx) | Client: `applyPortalThemeToDocument()` after `fetchPortalConfig()` so runtime overrides stay in sync. |

## Mapping: JSON → CSS variables

Hex values from `theme.colors` are normalized to oklch and applied as:

| `portal.json` key | CSS variable | Typical role in UI |
|-------------------|--------------|-------------------|
| `primary` | `--primary`, `--primary-foreground`, `--ring`, `--chart-1`, `--sidebar-primary`, `--sidebar-ring` | Main brand actions, nav active state, default buttons, focus rings, home hero emphasis. |
| `secondary` | `--secondary`, `--secondary-foreground`, `--chart-3` | Secondary surfaces, alternate emphasis, map “hover” marker when using imperative palette. |
| `accent` | `--accent`, `--accent-foreground`, `--chart-2` | Highlights, ghost/outline hovers (shadcn), selected map marker, genome reference badge. |

Foreground tokens (`*-foreground`) are chosen automatically for readable text on solid fills (light vs dark text from luminance).

## Derived chart colors (brand-mixed)

These are **not** separate keys in `portal.json`; they are computed in `themeApply` so feature cards and charts stay on-brand:

| Variable | Definition (conceptual) |
|----------|-------------------------|
| `--chart-1` | Same as `--primary` |
| `--chart-2` | Same as `--accent` |
| `--chart-3` | Same as `--secondary` |
| `--chart-4` | `color-mix(in oklch, primary 55%, accent)` |
| `--chart-5` | `color-mix(in oklch, secondary 50%, accent)` |
| `--chart-6` | `color-mix(in oklch, primary 50%, secondary)` |

Use Tailwind: `bg-chart-1/10 text-chart-1`, `border-chart-4/30`, etc.

## Tailwind usage (public UI)

Prefer **semantic** classes so the skin tracks `portal.json`:

- **Primary**: `bg-primary`, `text-primary`, `border-primary/40`, `ring-primary/20`
- **Secondary**: `bg-secondary`, `text-secondary`, `border-secondary/35`
- **Accent**: `bg-accent`, `text-accent`, `text-accent-foreground`, `border-accent/40`
- **Muted / layout**: `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`

Imperative APIs (Leaflet, canvas) resolve computed RGB from the document: [`front/lib/portal/brandColorsFromDocument.ts`](../front/lib/portal/brandColorsFromDocument.ts) (`resolveCssVarToRgb`, `leafletMarkerPalettesFromRoot`).

## Example palettes

Paste under `theme.colors` in `portal.json` (keep valid JSON). Names are illustrative only.

### 1. Default (repo sample) — green / blue / teal

Biodiversity-friendly contrast: green primary, blue secondary, teal accent.

```json
"theme": {
  "colors": {
    "primary": "#22c55e",
    "secondary": "#3b82f6",
    "accent": "#2dd4bf"
  }
}
```

### 2. Ocean / marine — deep teal primary

Cool, research-lab feel; accent stays distinct from secondary.

```json
"theme": {
  "colors": {
    "primary": "#0d9488",
    "secondary": "#0284c7",
    "accent": "#5eead4"
  }
}
```

### 3. Institutional / conservative — navy with amber accent

Muted primary, strong secondary; accent for calls-to-action and selection.

```json
"theme": {
  "colors": {
    "primary": "#1e3a5f",
    "secondary": "#64748b",
    "accent": "#d97706"
  }
}
```

### 4. Forest / fieldwork — earth green and clay

Warmer secondary; good when maps and nature imagery dominate.

```json
"theme": {
  "colors": {
    "primary": "#15803d",
    "secondary": "#a16207",
    "accent": "#4ade80"
  }
}
```

### 5. High-contrast accessible — dark primary, vivid secondary

Strong primary for text-like buttons; ensure `accent` stays distinguishable from `secondary` in charts.

```json
"theme": {
  "colors": {
    "primary": "#171717",
    "secondary": "#2563eb",
    "accent": "#f97316"
  }
}
```

### 6. Minimal monochrome — single hue family

If `accent` is omitted in older configs, it falls back to `secondary`; for three distinct steps, set all three explicitly.

```json
"theme": {
  "colors": {
    "primary": "#404040",
    "secondary": "#737373",
    "accent": "#a3a3a3"
  }
}
```

## Verification checklist

1. Edit `theme.colors`, rebuild or reload the Next app (production often bind-mounts `portal.json`).
2. Check home hero (`primary`), feature icon tints (`chart-*`), navigation active link, map markers, and species rank chips.
3. Toggle light/dark appearance: `--primary` oklch values stay readable; `--*-foreground` adjusts per fill.

## Related files

| File | Purpose |
|------|---------|
| `front/lib/portal/themeApply.ts` | `pickBrandHexes`, `portalThemeStyleProps`, `applyPortalThemeToDocument` |
| `front/lib/portal/brandColorsFromDocument.ts` | RGB resolution for Leaflet / canvas |
| `front/lib/taxonRankFilter.ts` | Rank UI rotates `primary` / `secondary` / `accent` |
| `front/components/home-page.tsx` | `chart-1`–`chart-4` feature cards |

Semantic colors (e.g. IUCN threat badges) intentionally **do not** follow the portal palette; see plan notes in the portal color refactor.
