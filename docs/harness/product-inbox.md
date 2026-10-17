# Product inbox — proposals the inbox panel decides

The product role (`product-brief.md`) files UI defects and polish itself, but it never files an
issue for product strategy — a new capability, a flow redesign, a change to the roadmap or an epic.
It queues the proposal here, in the issue form. **The inbox panel decides each `proposed` entry
(`inbox-panel-brief.md`): `node scripts/inbox.mjs queue` files a review issue for it, Opus and Grok
review it, and the panel sets `approved`, `declined (<reason>)` or `deferred (<until>)`. The owner
may override any status at any time, by editing it or by saying "approve PRD-00N".** Only an
approved entry is filed — by the panel, never by the product agent — under the target epic, and the
entry then records the issue number. Declined entries stay, so the same proposal is not made twice.

## Entry format

```markdown
### PRD-NNN · <one-line proposal>
- **Date:** YYYY-MM-DD · **Target epic:** #144 polish | #143 3d | #142 surfaces | #139 spine
- **Status:** proposed | approved | declined (<reason>) | deferred (<until>) | filed (#n)
- **Why:** <the finding and its evidence — tour step, snapshot line or file:line; heuristic or SC>
- **Review note:** docs/research/<note>.md

**Draft issue body**
## Goal
## Acceptance criteria
## Verification command
## Blocked by
```

Ids are sequential and never reused. An entry's draft body follows the agent-ready issue form in
`docs/harness/issue-form.md` so filing it is a copy, not a rewrite.

## Queue

### PRD-001 · Decide what HACER is on a phone: a read-only viewer whose panels open as sheets, or desktop-only with a notice
- **Date:** 2026-10-17 · **Target epic:** #144 polish
- **Status:** proposed
- **Why:** The narrow-width findings come from tour run 39057245392.
  - At 390 px, an open drawer leaves an 18 px strip of canvas, and the "Loaded" toast covers the drawer header (24-phone-390-library).
  - At 320 px, the Library drawer cuts Save to its icon and Import to "Impo", and pushes Delete (x 322–350) and Close (x 335–363) out of the viewport (25-reflow-320). That fails WCAG 1.4.10.
  - The drawer is a fixed 280 px (`src/components/ui/RightActionBar.tsx:32`), both toolbars stay at every width, and the help bar's mouse hints are cut to one phrase.

  A layout decision has to come before the reflow fix. Recommendation: a read-only viewer. ADR-0020's read-only surfaces make inspecting on a phone plausible; editing on a phone is not.
- **Review note:** docs/research/2026-10-product-review-1.md (P10)

**Draft issue body**
## Goal
Below 640 px, HACER is a usable read-only viewer. The canvas fills the screen, a panel opens as a full-width sheet over it with its controls in view, and nothing is clipped at 320 px.
## Acceptance criteria
- A `shell` project test (`e2e/shell/`) at 320 × 844 and 390 × 844: with each drawer panel open, every control's box lies inside the viewport, and the close control can be reached.
- Toasts never cover a panel header. The UI tour's steps 23–25 show the sheet.
## Verification command
`pnpm exec playwright test --project shell`
## Blocked by
—

### PRD-002 · First-run guidance for the declared app: teach spec → render → pins → test, and remember the dismissal
- **Date:** 2026-10-17 · **Target epic:** #318 foundation (N.11, #386)
- **Status:** proposed
- **Why:** The Quick tour card comes back on every page load, because dismissing it lasts only in memory (`src/components/ui/DemoOverlay.tsx:11-12`). It plays a 318 × 183 px dark-theme recording of hand editing ("Place gates, connect pins, and run your circuit!", `src/components/ui/DemoOverlay.tsx:62-70`), which ADR-0020 retires at C.2. On a phone it covers the lower canvas (tour steps 01, 19, 23). The help bar teaches only mouse gestures and is cut off at every width (`src/components/ui/HelpBar/index.tsx:87-92`). These break H3, H8 and H10. Once N.11 makes the spec editor the main authoring surface, a first visit should teach that.
- **Review note:** docs/research/2026-10-product-review-1.md (P11, P15)

**Draft issue body**
## Goal
A first visit shows how to declare a chip, see it rendered, drive its pins and run its test. The dismissal is remembered, and the guidance can be reopened from the help bar.
## Acceptance criteria
- `src/components/ui/DemoOverlay.test.tsx`: the dismissal survives a reload, and `?notour` still suppresses the card. The content names the spec editor, the pins panel and Tests, and no canvas gesture.
- After the switch, the help bar's default text describes only inspecting and navigating, and its full text can be reached at every width.
## Verification command
`pnpm exec vitest run src/components/ui/DemoOverlay.test.tsx`
## Blocked by
#386

### PRD-003 · Add the first review's product criteria to N.11's shell: every control named, one icon per job, destructive commands undoable, no placeholders
- **Date:** 2026-10-17 · **Target epic:** #318 foundation (N.11, #386)
- **Status:** proposed
- **Why:** The legacy shell shows failure modes that N.11 should not rebuild, and #386's acceptance list names none of them:
  - one icon for two jobs: `Info` opens Properties (`src/components/ui/CompactToolbar.tsx:381`) and Circuit Info (`src/components/ui/RightActionBar.tsx:64`), both highlighted in tour step 12;
  - 14 placeholders (`src/components/ui/RightActionBar.tsx:132-180`, `src/components/ui/PropertiesPanel/index.tsx:166-286`);
  - Position and Rotation styled as inputs but read-only (`src/components/ui/PropertiesPanel/index.tsx:225-249`);
  - two feedback channels (`src/components/ui/StatusBar.tsx:29-52` against the sonner toaster in `src/App.tsx:38`);
  - a pin toggle named by its value (#805);
  - unnamed icon buttons (#803).

  #386 does name commands, DOM-only panels and `notify`.
- **Review note:** docs/research/2026-10-product-review-1.md (P8, P9, P13, P14)

**Draft issue body**
## Goal
#386's acceptance gains five product criteria, so the new shell starts consistent instead of being polished afterwards.
## Acceptance criteria
- A `shell` project test takes an aria snapshot of every panel and finds no unnamed `button`, `combobox` or `dialog`.
- Each icon maps to one command: a test over the shell's icon map fails when two commands share an icon.
- Every spec-scope destructive command (remove a part, clear) is undoable through N.10's history, and a test removes a part and undoes it.
- No control ships disabled as "coming soon": a capability appears together with its command.
- Feedback goes only through `notify`; the StatusBar pill is retired or becomes a `notify` variant.
## Verification command
`pnpm run lint && pnpm run test:run`
## Blocked by
#386 (this amends its acceptance)
