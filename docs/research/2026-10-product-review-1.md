# Product review 1 — the whole app at `579ff8f4`

- **Date:** 2026-10-17 · **Reviewer:** the product role (`.claude/agents/hacer-product.md`), one fresh-context evaluator, method `docs/harness/product-brief.md` · **Issue:** #269, PR 2
- **Name:** #269 calls this note 2026-09-product-review-1 because the issue was written in September; it is dated by when the review ran.
- **Input:** UI tour run [39057245392](https://github.com/mezivillager/hacer/actions/runs/39057245392) of `.github/workflows/ui-tour.yml` on `579ff8f4` (the workflow's first run; `ui-tour` job green), artifact `ui-tour`, 2,024,459 B: 25 steps, each a full-page PNG and a JSON accessibility snapshot with CSS-px boxes, plus a manifest. The PNGs are not committed. Evidence cites the step's file name in the artifact, a snapshot line or a `file:line`. **The artifact expires 2026-10-31.** After that, re-run that run, or dispatch the workflow on `main`, to regenerate it.
- **Scope rule:** under [ADR-0020](../decisions/0020-spec-only-writes-read-only-projections.md), hand editing is a non-goal: palette placement, wire drawing, dragging, and the Properties panel's position and rotation. It is deleted at plan step C.2, and the foundation gate holds polish whose only beneficiary is that machinery (`docs/portfolio.md`). Findings on it are recorded here but not filed. The five issues sit on surfaces the switch keeps: autosave (capability row 16), the library (22), tests (14), the pins panel (11), and the shell.

## Flows walked

The cognitive walkthrough asks four questions at each step: does the user try for the right result (Q1), notice the action (Q2), connect the action to the result (Q3), and see progress (Q4)?

| Flow | Steps | What the walkthrough found |
|---|---|---|
| First visit | 01, 02 | Q1 holds: the Quick tour card says "Place gates, connect pins, and run your circuit!" Q2 is weak: every toolbar icon is named only by a hover tooltip. The card's GIF is a 318 × 183 px recording of the dark theme shown in the light theme, and nothing in it is legible (P11) |
| Place | 03–06 | Q2 and Q4 hold: the palette groups chips as Single-bit / 16-bit / Multi-way, and the help bar switches to "Click anywhere on the grid to place the Nand gate • Press Esc to cancel" (04). This flow is hand editing |
| Wire | 07, 08 | Q4 holds: the help bar reads "Click on another pin to connect", and a routed preview is drawn. This flow is hand editing |
| Run and drive inputs | 09–12 | Q4 holds: the run button is `[pressed]` and Circuit Info shows a "Running" pill. Q2 fails for the pinout's input values, which look like text (P7). While paused, every wire shows 0 (P12) |
| Test a chip | 13, 14 | Q3 is partial: Implementation offers only "Builtin reference" or "Built from NAND", never the circuit on the canvas (P18). Q4 holds: a results table, a toast, and `✓ Not` in the chip list; the pass line fails 1.4.3 (P6) |
| Other panels | 15–17 | Layers and History are "Coming soon" panels (P8). The shortcuts dialog is well structured, with headings and tabs, but lists two "coming soon" shortcuts |
| Save and reload | 18–20 | Save confirms with a toast. A reload empties the canvas (P1). After Load, the name field is empty (P16). Delete sits 8 px from Load and has no confirmation (P2) |
| Theme | 21, 22 | The theme switches and the screen keeps its state. In dark, muted text is 4.00:1 (P6) |
| Phone and reflow | 23–25 | At 390 px the tour card covers the lower canvas; with a drawer open, the canvas is an 18 px strip and the "Loaded" toast covers the drawer header (24). At 320 px the drawer clips its controls (P10), and "All shortcuts" loses its name below 640 px (P3) |

## Findings

Severity runs 0–4, as set out in the brief. The reasons are one line each, so the owner can check the rating.

| Id | Step | Heuristic / SC | Sev | Evidence | Filed |
|---|---|---|---|---|---|
| P1 | 19-after-reload | H3, H9; ADR-0020 row 16 | **4** — every reload, closed tab or crash loses the whole circuit unless it was saved to the Library by hand | autosave writes every 2 s (`src/store/actions/persistenceActions/autosave.ts:12-21`), but only tests read `AUTOSAVE_KEY`, and the Library hides the slot (`src/store/actions/persistenceActions/persistenceActions.ts:215`); 19 shows an empty canvas with `button "Clear All" [disabled]` | ISSUE_A |
| P2 | 18-library-saved, every step | H5, H3 | **3** — rare but irreversible: one click erases the canvas or a saved circuit | Clear All runs `clearCircuit()` with no confirmation and uses `RotateCcw`, the usual reset/undo glyph (`src/components/ui/CompactToolbar.tsx:408-424`). Library Delete removes a saved circuit at once (`src/components/ui/CircuitLibrary.tsx:133-142`; Load box 1171–1215 and Delete box 1223–1251 in 18). Save overwrites a name silently (`src/store/actions/persistenceActions/persistenceActions.ts:144-157`). Undo is a disabled placeholder (`src/components/ui/RightActionBar.tsx:132-154`) | ISSUE_B |
| P3 | all 25 | 4.1.2 | **3** — on every screen, ten right-bar controls are unidentifiable by role and name, for screen readers and for agents | `button [box=1241,12,32,32]` … `button [disabled] [box=1241,326,32,32]` and the drawer close `button [box=1237,12,28,28]` (10); `src/components/ui/RightActionBar.tsx:57-178, 202-210`. Also: help-bar collapse `button [box=60,690,24,24]` (`src/components/ui/HelpBar/index.tsx:72-79`); "All shortcuts" below 640 px `button [box=342,814,36,24]` (23; `src/components/ui/HelpBar/index.tsx:104-106`); the Tests selects `combobox [box=1017,91,248,28]` (13; their `<label>`s are unbound, `src/components/ui/TestResultsPanel.tsx:25-44`). #776 fixed only the left toolbar | ISSUE_C |
| P4 | 01, 02, 19, 23 | 1.3.1, 4.1.2 | 2 — on every screen, assistive tech meets an empty heading and an unnamed button that sit off-screen | `heading [level=3] [box=1296,26,0,0]` and `button [box=1516,12,28,28]` while the drawer is closed: the drawer is only `width: 0` with `overflow-hidden` (`src/components/ui/RightActionBar.tsx:185-211`) | ISSUE_C |
| P5 | 01, 19, 23 | 1.1.1 | 1 — the image's text alternative reads a literal `—` | `img "HACER demo \\u2014 place gates…"`. A JSX attribute string does not process escapes (`src/components/ui/DemoOverlay.tsx:62`) | ISSUE_C |
| P6 | 10, 14, 22 | 1.4.3 | 2 — low-vision users: every muted label in the dark theme, and the test verdict in both themes | Ratios from the tokens in `src/styles/globals.css`: dark `--muted-foreground` on `--card` is 4.00:1 (lines 91, 82); dark `--destructive` on card is 3.61:1 (94), which is the test-failure text; the light "Running" pill, `text-primary` on `bg-primary/20`, is 3.58:1 (`src/components/ui/RightActionBar.tsx:269`); the light pass line, `text-green-500` on card, is 2.22:1 (`src/components/ui/TestResultsPanel.tsx:62`) | ISSUE_D |
| P7 | 10, 11 | walkthrough Q2, H4, 4.1.2 | 2 — the pins panel becomes the only way to drive inputs at the switch (ADR-0020 §6, row 11); today a Shift+click on the canvas is an alternative | `button "1" [box=1246,547,19,20]`: a raw `<button>` styled as plain mono text, the same style as the read-only outputs, and named by its value instead of by the pin (`src/components/ui/PinoutPanel.tsx:54-61` against `:90-93`). It meets 2.5.8 only through the spacing exception (the centres are 28 px apart) | ISSUE_E |
| P8 | 10, 12, 15–17 | H8, H1 | 2 — 14 placeholders, in every session, and they advertise capabilities the app lacks (undo) | Right bar: undo, redo, find and maximize are always disabled; the Layers and History panels and Generate Truth Table are placeholders (`src/components/ui/RightActionBar.tsx:132-180, 310-343`). Properties: rename, duplicate, +90, Color and a switch (`src/components/ui/PropertiesPanel/index.tsx:166-286`). The shortcuts list includes "Fit view" and "Run / pause" (`src/components/ui/KeyboardShortcutsModal/catalog.ts:24, 58`) | not filed (cap of five) |
| P9 | 12, 21 | H4 | 2 — one icon does two jobs, both highlighted at once | `Info` opens Properties on the left (`src/components/ui/CompactToolbar.tsx:381`) and Circuit Info on the right (`src/components/ui/RightActionBar.tsx:64`) | PRD-003 |
| P10 | 24, 25 | 1.4.10 | 2 — phone users lose Save, Import, Delete and Close | At 320 px: Save is cut to its icon, Import shows "Impo", and Delete (x 322–350) and Close (x 335–363) fall off-screen. The drawer is a fixed 280 px (`src/components/ui/RightActionBar.tsx:32, 190-192`) | PRD-001 |
| P11 | 01, 19, 23 | H3, H8, H10 | 2 — every page load | Dismissing the card lasts only in memory (`src/components/ui/DemoOverlay.tsx:11-12`). It teaches the hand editing that ADR-0020 retires (`:62, :67-70`) and covers the lower canvas on a phone (23) | PRD-002 |
| P12 | 08, 20, 21 | H1, H4 | 2 — a paused circuit contradicts itself: `in1: 1` and its green pin feed a wire drawn as 0 | `const signalValue = simulationRunning ? … : 0` (`src/components/canvas/CanvasArea.tsx:91`) | not filed — legacy canvas; ADR-0020 row 12 is N.8's to get right |
| P13 | 12, 21 | 2.5.7, H4 | 2 — moving a part needs a drag; Position and Rotation look like inputs but are read-only | `text: Position X -2.0 Z -2.0 Rotation 0 deg` with no textbox (`src/components/ui/PropertiesPanel/index.tsx:225-249`) | not filed — drag is a non-goal; `setHint` replaces it (row 19) |
| P14 | 14, 18 | H4 | 1 — two feedback channels with different places and dismissal | Test results go to a bottom-centre pill, "click to dismiss" (`src/components/ui/StatusBar.tsx:29-52`); the library goes to top-right toasts with a close button (`src/App.tsx:38`) | not filed |
| P15 | 01, 23 | H8, H10 | 1 — the help bar's mouse-only hints are cut off at every width | `truncate` (`src/components/ui/HelpBar/index.tsx:87-92`): "Scroll: …" at 1280 px, one phrase at 390 px | PRD-002 |
| P16 | 10, 20 | H6, H4 | 1 — re-saving needs the name typed again; Export appears twice under two names | The name stays local and Load never sets it (`src/components/ui/CircuitLibrary.tsx:12, 23-25`); Info's "Export Circuit" row against the Library's "Export" button (`src/components/ui/RightActionBar.tsx:288-293`, `src/components/ui/CircuitLibrary.tsx:69-77`) | not filed |
| P17 | 13 | design system | 1 — two select treatments | A native `<select>` with a mono class and a raw `<label>`, where ui-kit has `Label` (`src/components/ui/TestResultsPanel.tsx:9, 25`); Properties' Color is a Button styled as a dropdown | label part in ISSUE_C |
| P18 | 13, 14 | walkthrough Q3 | 2 — a learner cannot test what they built | The implementation sources are only builtin and shipped HDL (`src/components/ui/TestResultsPanel.tsx:12-17`) | not filed — planned: ADR-0020 row 14 (the spec's test binding), #386 |
| P19 | 01 | H2 | 1 — "Show Axes" is drawn as a grid | `Grid3X3` (`src/components/ui/CompactToolbar.tsx:357`) | not filed |

**By severity:** 4 → 1 · 3 → 2 · 2 → 10 · 1 → 6 (19 findings). Most severe first, issues ISSUE_A–ISSUE_E; strategy PRD-001–PRD-003 in `docs/harness/product-inbox.md`.

## Checks that passed

- 2.4.2 and 3.1.1: all 25 steps have the title `HACER` and `lang` `en`.
- 2.5.8: every target is at least 24 × 24 px or meets the spacing exception. The pin toggles are 19 × 20 with centres 28 px apart; the dialog close is 16 × 16 with the nearest target 40 px away; the toast close is 20 × 20.
- 4.1.2 on the left toolbar: every button is named (#776), and the run and Properties toggles expose `[pressed]`. Library Delete is named "Delete my-nand", and the status pill sits in `role=status`.
- 1.4.3 in the light theme: muted text on card is 7.42:1, body text 18.79:1, and the primary button 4.83:1.

## Inventory against `src/components/ui-kit/`

The same job should use the same primitive, size, icon and wording. These do not:

- Close buttons come in five forms: the drawer (28 px, unnamed), the tour card (28 px, "Close demo"), Properties (28 px, unnamed), the dialog (16 px, "Close") and the toast (20 px, "Close toast").
- A one-bit toggle is a raw `<button>` (P7), although ui-kit has `Button` and `Switch`.
- Selects come in two styles (P17), and ui-kit has no select.
- Feedback comes through two channels (P14).
- Export and Import appear twice (P16).
- Icons: `Info` does two jobs (P9), `RotateCcw` means "clear" (P2), and `Grid3X3` means "axes" (P19).

## Unverified

| What | Why | What would verify it |
|---|---|---|
| Keyboard operation and focus (2.1.1, 2.4.7, 2.4.11) | The tour records no keyboard walk. Focus shows only by chance: a teal fill on the focused drawer close (10), the pin toggle (11) and Load (20) | A Tab walk through the shell, with a capture per stop |
| Content on hover or focus (1.4.13) | Tooltips are the only label of each icon button and the only explanation of every "coming soon" control | Hover and focus captures, plus Escape |
| Inside the canvas | Node-label legibility in dark (22), the colour code (a 0 wire is orange, a 0 pin is red), and placement-preview contrast (04; #224). The snapshot cannot see the canvas, and CI renders with SwiftShader | Describe-scene goldens (N.6); a GPU capture |
| The lingering "Gates" / "Circuit I/O" tooltip (04, 06–08) | Probably produced by the scripted canvas actions, because focus never left the trigger | A pointer-driven capture |
| StatusBar pill contrast | Its background is translucent over canvas pixels | A computed-colour dump per step (`docs/research/2026-09-product-role.md` §4, item 4) |
| 1.4.11 field boundaries | The borders are 1.43:1 and the input fill 1.19:1 against the card. Not counted, because each field has a visible label or placeholder; an audit decides | A manual audit |

## Limits

The review had one evaluator. NN/g measured a single evaluator finding about 35% of the problems (research note §2.1), so severity is one rater's call, with its reasons given for that reason. The tour covers no error path (a failing test, a bad import, an empty-name save), no 16-bit or bus part, and neither the settings nor the theme popover open. A keyboard walk, an axe pass and error-path steps would widen the next review. Those are tour changes, for #138.
