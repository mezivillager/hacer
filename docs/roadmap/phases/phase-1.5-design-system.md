# Phase 1.5: Design System and Visual Consistency

**Part of:** [Development Roadmap](../README.md)  
**Status:** Complete / maintain  
**Last Updated:** 2026-05-12  
**Depends on:** Phase 0.25 UI/canvas foundation

---

## Current Truth

The selected design direction is implemented. HACER now uses Tailwind CSS v4, shadcn/ui-style primitives, Radix primitives, lucide-react icons, Sonner feedback through `notify`, and `next-themes` for light/dark/system mode.

This phase is no longer an unstarted future design-system effort. Treat it as a maintenance surface:

- App shell components live in `src/components/ui/`.
- Reusable primitives live in `src/components/ui-kit/`.
- Global tokens and Tailwind v4 configuration live in `src/styles/globals.css`.
- 3D canvas color resolution lives in `src/components/canvas/hooks/useThemeColor.ts`.
- Gate glyphs live in `src/components/ui/icons/GateGlyphs.tsx`.
- The `design-system/` directory is a reference/source artifact for the migration, not the runtime primitive location.

## Completed

- Tailwind CSS v4 app styling and OKLch token usage
- shadcn/ui-style primitive set for buttons, dialogs, popovers, tooltips, tabs, switches, inputs, labels, cards, separators, and keyboard hints
- Radix-backed interaction primitives
- Sonner-backed `notify` helper at `@/lib/notify`
- `next-themes` tri-state provider
- Compact app chrome: toolbar, right action bar, properties panel, help bar, keyboard shortcuts modal, status bar, and demo overlay
- Lucide icons for tool buttons and compact controls

## Maintenance Checklist

- [ ] Use `@/components/ui-kit/*` for primitives before creating new one-off controls
- [ ] Keep HACER-specific shell/layout components in `src/components/ui/`
- [ ] Use `notify` or store-backed status messages for user feedback
- [ ] Keep new interactive panels keyboard-accessible
- [ ] Add only the Radix/shadcn primitives a feature actually needs
- [ ] Update `REPO_MAP.md` when new primitive or shell directories are added

## Deferred

- Figma automation
- Automated token synchronization from external design tools
- Dedicated design documentation website
- High-contrast theme pass

These can be revisited after Phase 0.5-0.7 product work is stable.

**Previous:** [Phase 0.7: Projects 4-5](phase-0.7-computer-architecture.md)  
**Next:** [Phase 2.5: Developer Tooling and DX](phase-2.5-developer-tooling.md)
