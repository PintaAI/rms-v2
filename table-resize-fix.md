# Table Resize Fix

## Context

`components/ui/table.tsx` wraps every table in a horizontally scrollable container and applies these default table styles:

```tsx
className={cn("w-full caption-bottom text-xs", className)}
```

`components/dashboard/services/service-table/service-table.tsx` uses the table with:

```tsx
<Table className="table-fixed">
```

It also defines column widths through `<colgroup>` and repeats the width on header and body cells.

## Current Behavior

The resize implementation mostly works:

- Column widths are stored per column in `localStorage`.
- Widths are clamped between `MIN_COLUMN_WIDTH` and `MAX_COLUMN_WIDTH`.
- The table uses `table-fixed`, which is the right layout mode for predictable column sizing.
- The table uses `<colgroup>`, which is the right place to define column widths.

However, the table primitive always includes `w-full`. When the total configured column width is smaller than the available container width, the browser can stretch columns to fill the full table width. This means a resized column may not visually match its saved pixel width until the total table width exceeds the container width.

## Root Cause

The service table mixes fixed pixel column widths with a table that is forced to be `width: 100%`.

With `table-layout: fixed`, explicit column widths are respected, but the table still has to satisfy its own width. If the table is wider than the sum of the column widths because of `w-full`, the remaining space can be distributed across columns by the browser.

## Recommended Fix

Compute the total table width from the active column widths and apply it as a minimum width to the table.

Example approach:

```tsx
const actionColumnWidth = 96;

const tableWidth = React.useMemo(() => {
  const columnWidth = effectiveColumns.reduce(
    (total, colKey) => total + getColumnWidth(colKey),
    0
  );

  return columnWidth + (hasActions ? actionColumnWidth : 0);
}, [effectiveColumns, getColumnWidth, hasActions]);
```

Then apply it to the table:

```tsx
<Table className="table-fixed" style={{ minWidth: tableWidth }}>
```

This keeps the table at least as wide as the sum of the configured columns while still allowing the outer `overflow-x-auto` container to scroll when needed.

## Cell Overflow Fix

The table cell primitive currently uses `whitespace-nowrap` but does not force clipping. Narrow resized columns can still let content visually spill.

Recommended cell behavior for the service table:

```tsx
<TableCell className="overflow-hidden truncate">
```

For cells with complex content, wrap the rendered content in a `min-w-0 overflow-hidden` container so nested `truncate` styles work correctly.

## Optional Drag Improvement

The current resize handler writes to `localStorage` on every pointer move. It works, but it can make dragging less smooth.

A smoother version would:

- Keep the actively dragged width in component state during pointer movement.
- Persist the final width to preferences on `pointerup`.
- Also clean up listeners on `pointercancel`.

## Summary

The resize logic is structurally correct, but the visual result can be inaccurate because the shared table component forces `w-full`. The minimal fix is to keep the existing `colgroup` and `table-fixed` approach, then add a computed `minWidth` to the service table based on the sum of visible column widths.
