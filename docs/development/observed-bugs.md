# Observed bugs (informal log)

Human- and agent-observed issues that are **not yet** guaranteed to have a GitHub issue or a failing automated test. Use this log to **capture repro** quickly; promote entries to dedicated tickets or delete when fixed.

## Conventions

| Column | Meaning |
|--------|---------|
| **ID** | `B-NNN` monotonic in this file |
| **Status** | Open / Investigating / Fixed |
| **Fixed in** | PR URL or commit when closed |

When an item is **Fixed**, add the **Fixed in** link and move the detailed row to **Resolved** below, or keep a one-line pointer in `tasks/lessons.md` — stay consistent per PR.

---

## Open

### B-001 — Gate placement preview lacks contrast in light mode

| Field | Detail |
|-------|--------|
| **Status** | Open |
| **Area** | `src/components/canvas/Scene/PlacementPreview.tsx`, theme (`semanticColors.success`), light-mode grid/background |
| **Symptom** | When placing or dragging a **gate**, the preview mesh is hard to see in **light** theme — not bold enough against the canvas. |
| **Expected** | Preview uses **high-contrast**, unambiguous colors in light (and remains acceptable in dark). |
| **Repro** | Set theme to light → choose a gate from toolbar → move cursor over grid to show placement preview. |
| **Notes** | Resolution tracked under **P05-29**; tune materials/colors and add regression-friendly tests where practical. |
| **Fixed in** | — |

### B-002 — Warning / toast UI overlaps the right action bar

| Field | Detail |
|-------|--------|
| **Status** | Open |
| **Area** | `App.tsx` (`Toaster` from Sonner), `RightActionBar`, global toast positioning / `z-index` / viewport inset |
| **Symptom** | Warning banners (e.g. “Cannot connect same pin types”) render **on top of** the vertical **right action bar** so the toast background and the top icons (e.g. Info) overlap — layout looks broken. |
| **Expected** | Toasts stay **clear of** the action bar: reserve right margin equal to bar + drawer width, move `Toaster` inset, or lower toast layer so the bar stays visually on top; toasts should remain fully readable without obscuring primary chrome. |
| **Repro** | Trigger a Sonner warning while the right bar is visible (e.g. invalid wiring / same pin types) — observe overlap at top-right. |
| **Notes** | May need theme-aware offset; align with `RightActionBar` `PANEL_WIDTH` when drawer is closed (icons only) vs open. |
| **Fixed in** | — |

---

## Resolved

_(None yet.)_
