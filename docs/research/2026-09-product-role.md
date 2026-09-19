# The product role — what an agent can and cannot judge in a UX review

- **Date:** 2026-09-19
- **Status:** Research reference for `docs/harness/product-brief.md` and `.claude/agents/hacer-product.md` (#269, PR 1)
- **Method:** direct fetches of primary sources on 2026-09-19 (NN/g, W3C, GOV.UK, Deque, MDN, arXiv, GitHub and Playwright docs) and the installed `@playwright/test` 1.60.0 type definitions. Every claim carries a source `[Sn]` and a confidence (H/M/L); §6 lists what could not be confirmed.
- **Trigger:** the owner, 2026-09-18: "we might need a real product agent that also monitors the usability and design part of the project"; 2026-09-19: "you are supposed to find that out, not me ... the whole reason we are setting up a self-run process is for me to not be involved a lot".

## 1. The question

HACER's screens are a DOM shell — toolbar, right drawer and its panels, dialogs, help and status bars — around a WebGL canvas. A product agent has to find usability and design problems without the owner and without rendering 3D on the owner's laptop (ADR-0016). Its eyes are a scripted tour run in CI: a full-page PNG and an accessibility snapshot per step. What can it judge reliably from those and the code, what must it leave `unverified`, and how do teams run this kind of review?

## 2. Methods an agent can run

### 2.1 Heuristic evaluation

- **The ten heuristics** (Nielsen, 1994, updated 2024-01-30): visibility of system status; match between the system and the real world; user control and freedom; consistency and standards; error prevention; recognition rather than recall; flexibility and efficiency of use; aesthetic and minimalist design; help users recognize, diagnose, and recover from errors; help and documentation [S1] — H.
- **Severity** is a 0–4 scale — 0 "I don't agree that this is a usability problem at all", 1 cosmetic, 2 minor, 3 major, 4 "usability catastrophe" — set by frequency, impact and persistence; "severity ratings from a single evaluator are too unreliable to be trusted", and the mean of three evaluators is enough in practice [S2] — H.
- **One evaluator is not a panel.** Averaged over six projects, "single evaluators found only 35 percent of the usability problems"; about five evaluators, "certainly at least three", find roughly 75% (read from the curve in S3's Figure 2; its text gives no figure) [S3]. Current NN/g practice: three to five people evaluate independently, then synthesize; "heuristic evaluations cannot replace user research" [S4] — H.
- **LLMs as evaluators.** Duan et al. (CHI 2024) ran GPT-4 heuristic evaluation on 51 UIs: useful "for catching subtle errors, improving text, and considering UI semantics", but the feedback "decreased in utility over iterations" [S12] — H. Zhong et al. (arXiv, 2025-07-03) gave GPT-4 3–9 screenshots of task flows in each of two apps: it found 73% and 77% of the issues, above five experienced human evaluators (57% and 63%), and stayed consistent across accounts and over three months (~94% coverage). It also produced most of the non-problems (43 of 49 and 52 of 55 severity-0 items); of those, 42% and 27% came from not recognising a component and 42% and 38% from misreading a design convention; and it found 3 of 7 and 3 of 6 violations that span screens, where humans found 86% and 83% [S13] — H for the numbers, M for transfer to HACER (§6).

**Reading:** an agent is a fast, consistent, tireless *single* evaluator with a false-positive habit and a blind spot for problems that span screens. It is worth running; it is not a panel. Hence the brief's rules: one piece of evidence per finding, the code checked before a component is named, steps compared on purpose, a cap on findings per review — and the owner's tier-2 merge review stays the taste check.

### 2.2 Task walkthroughs

A cognitive walkthrough asks at every step: "Will users try to achieve the right result? Will users notice that the correct action is available? Will users associate the correct action with the result they're trying to achieve? After the action is performed, will users see that progress is made toward the goal?" It suits "complex, new, or unfamiliar workflows" [S5] — H. Placing chips, wiring pins and running `.tst` scripts are exactly that. Limit: the tour is scripted, so the agent judges whether the next action is *discoverable on the screen*, not what a novice would actually do.

### 2.3 WCAG 2.2 AA from a snapshot, the code and the screenshots

A Playwright aria snapshot is "a YAML representation of the accessibility tree of a page": roles, accessible names, states (`checked`, `disabled`, `expanded`, `pressed`, `selected`, …) and text, but no colours or styles [S15] — H. In the installed 1.60.0, `page.ariaSnapshot({ boxes: true })` also gives every element its box in CSS px [S15] — H.

| SC (level) | Decidable from | How |
|---|---|---|
| 1.3.1 Info and Relationships (A) | snapshot | headings, landmarks, lists and label–field pairs are present |
| 4.1.2 Name, Role, Value (A) | snapshot | every control has a role and a name; toggles expose `pressed` or `checked` |
| 2.4.2 Page Titled (A), 3.1.1 Language of Page (A) | step JSON | `title` names the app; `lang` is set |
| 2.5.8 Target Size (Minimum) (AA) | snapshot boxes | at least 24 × 24 CSS px, or the spacing exception: a 24 px circle centred on each undersized target meets no other target or circle [S8] |
| 1.4.10 Reflow (AA) | the 320 px step | no loss of information or function and no two-dimensional scrolling at "a width equivalent to 320 CSS pixels" [S6] |
| 1.4.3 Contrast (Minimum), 1.4.11 Non-text Contrast (AA) | theme tokens in code | 4.5:1 for text (3:1 large), 3:1 for components and graphics [S6], from "the foreground and background colors obtained from the user agent, or the underlying markup and stylesheets, rather than the text as presented on screen" [S7] — never from screenshot pixels |
| 2.5.7 Dragging Movements (AA) | code | every drag (moving a gate or node) has a single-pointer alternative |

Not decidable from static captures: keyboard operation (2.1.1), focus visible and not obscured (2.4.7, 2.4.11) and content on hover or focus (1.4.13) need interaction the tour does not record; and nothing inside the canvas is visible to the snapshot — "The `<canvas>` element on its own is just a bitmap and does not provide information about any drawn objects" [S14] — H. Gates, wires and pins are therefore judged from the PNG and the code only. All of these are `unverified`, never passes.

**How much automation covers.** On GOV.UK's deliberately inaccessible page (143 failures) single tools found 17% to 41% (the top figure counting manual-inspection prompts) and all tools together 71% [S9]; Deque's 57% is by issue volume over ~300,000 issues, not by success criteria [S10]; GOV.UK's service manual: "you'll miss some issues if you only do automated testing", with an audit before public beta and testing with disabled and older users [S11] — H. The product role's WCAG pass is a screen, not an audit.

### 2.4 Consistency against the design system

An interface inventory is "a comprehensive collection of the bits and pieces that make up your interface"; seen side by side, similar-yet-different treatments show where a system has drifted [S16] — H. HACER's system is `src/components/ui-kit/` (button, card, dialog, input, kbd, label, popover, scroll-area, separator, switch, tabs, tooltip, theme-provider) and the theme tokens in `src/styles/globals.css`. The agent inventories the controls the tour shows and checks each in the code: one job, one primitive, one size, one icon, one wording; a hand-rolled control where a primitive exists is a finding.

### 2.5 What the captures cannot show

- One moment in one viewport: no motion, latency, hover or focus unless a step captured it.
- A software renderer: CI runs Chromium with SwiftShader (`playwright.config.ts`), so nothing about frame rate or smoothness transfers to a GPU.
- Scripted gestures: placing, wiring and selecting on the canvas call the store actions the canvas handlers call, because Playwright's synthetic events do not trigger R3F's raycasting reliably (`e2e/helpers/actions/gate.actions.ts`). The captures show what those gestures produce, not whether the gesture is easy.
- The model's own blind spots (§2.1): unrecognised components, misread conventions, missed cross-screen problems [S13].

## 3. How teams run it

- **Several independent evaluators, then synthesis**, severity as the mean of three raters [S2][S4]; walkthroughs where the workflow is new or complex [S5].
- **Accessibility in layers:** automated checks, manual checks, assistive technology, an audit before public beta, testing with disabled and older users [S11].
- **Design systems:** periodic interface inventories [S16].
- **Agents as a complement:** automated feedback inside a design tool [S12], synthetic heuristic evaluation [S13], LLM agents as simulated participants to try a study design before running it with people [S17], and low-effort recommendations "especially in settings with limited access to usability experts" [S18]. NN/g is explicit that heuristic evaluation "cannot replace user research" [S4].

## 4. What this means for HACER (→ the brief)

1. **Inputs:** the cloud tour (`.github/workflows/ui-tour.yml` runs `e2e/tour/app-tour.spec.ts`): 25 steps from first visit to a phone and the 320 px reflow width, light and dark, each a PNG plus the snapshot with boxes, title, `lang`, theme and what was done; the code; the PR or issue under review.
2. **Method, in order:** walkthrough, heuristics, the WCAG subset of §2.3, inventory; severity 0–4 with its reason; one piece of evidence per finding; `unverified` for everything in §2.5.
3. **Outputs:** at most five polish issues per review under #144, filed directly (owner, 2026-09-19); product-strategy proposals queued in `docs/harness/product-inbox.md`, like fidelity's.
4. **Not in this PR, worth adding when a review asks for it:** a keyboard walk (Tab through the shell, focus captured) for 2.1.1, 2.4.7 and 2.4.11; an axe-core pass per step (a new dev dependency); a computed-colour dump so contrast is measured on the page rather than derived from tokens.

## 5. Sources (all fetched 2026-09-19)

- [S1] J. Nielsen, "10 Usability Heuristics for User Interface Design", NN/g, 1994-04-24, updated 2024-01-30 — https://www.nngroup.com/articles/ten-usability-heuristics/
- [S2] J. Nielsen, "Severity Ratings for Usability Problems", NN/g, 1994-11-01 — https://www.nngroup.com/articles/how-to-rate-the-severity-of-usability-problems/
- [S3] J. Nielsen, "The Theory Behind Heuristic Evaluations", NN/g, 1994-11-01 — https://www.nngroup.com/articles/how-to-conduct-a-heuristic-evaluation/theory-heuristic-evaluations/
- [S4] K. Moran, K. Gordon, "How to Conduct a Heuristic Evaluation", NN/g, 2023-06-25 — https://www.nngroup.com/articles/how-to-conduct-a-heuristic-evaluation/
- [S5] K. Flaherty, cognitive walkthroughs, NN/g, 2022-02-13 — https://www.nngroup.com/articles/cognitive-walkthroughs/
- [S6] W3C, Web Content Accessibility Guidelines (WCAG) 2.2, Recommendation, edition of 2024-12-12 — https://www.w3.org/TR/WCAG22/
- [S7] W3C, Understanding SC 1.4.3 Contrast (Minimum) — https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- [S8] W3C, Understanding SC 2.5.8 Target Size (Minimum) — https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- [S9] M. Duran, "What we found when we tested tools on the world's least-accessible webpage", GOV.UK Accessibility blog, 2017-02-24 — https://accessibility.blog.gov.uk/2017/02/24/what-we-found-when-we-tested-tools-on-the-worlds-least-accessible-webpage/
- [S10] Deque Systems, "Automated testing study identifies 57 percent of digital accessibility issues", 2021-03-10 — https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues/
- [S11] GOV.UK Service Manual, "Testing for accessibility", updated 2024-10-29 — https://www.gov.uk/service-manual/helping-people-to-use-your-service/testing-for-accessibility
- [S12] P. Duan, J. Warner, Y. Li, B. Hartmann, "Generating Automatic Feedback on UI Mockups with Large Language Models", CHI 2024, arXiv 2024-03-19 — https://arxiv.org/abs/2403.13139
- [S13] R. Zhong, D. W. McDonald, G. Hsieh, "Synthetic Heuristic Evaluation: A Comparison between AI- and Human-Powered Usability Evaluation", arXiv 2507.02306, 2025-07-03 — https://arxiv.org/abs/2507.02306
- [S14] MDN, the `<canvas>` element, Accessibility section, last modified 2026-04-24 — https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas
- [S15] Playwright, "Aria snapshots" — https://playwright.dev/docs/aria-snapshots — and `Page.ariaSnapshot(options?: { boxes, depth, mode, timeout })` in the installed `@playwright/test` 1.60.0 type definitions
- [S16] B. Frost, "Interface Inventory", 2013-07-10 — https://bradfrost.com/blog/post/interface-inventory/
- [S17] Y. Lu et al., "UXAgent: An LLM Agent-Based Usability Testing Framework for Web Design", arXiv 2502.12561, 2025-02-18 (v3 2025-04-05) — https://arxiv.org/abs/2502.12561
- [S18] S. Lubos, A. Felfernig, D. Garber, V.-M. Le, M. Henrich, "Recommending Usability Improvements with Multimodal Large Language Models", arXiv 2604.25420, 2026-04-28 — https://arxiv.org/abs/2604.25420
- [S19] GitHub Docs, "Events that trigger workflows", `workflow_dispatch` — https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows

## 6. Could not verify

- **The tour has not run.** `workflow_dispatch` "will only trigger a workflow run if the workflow file exists on the default branch" [S19], so the first run is #269 PR 2. Every `@store` run in Actions mounts the canvas, but none waits for the scene's first frame (`__SCENE_READY__`), and the `browser-qa.yml` and `e2e.yml` histories hold no `@ui` run (checked 2026-09-19): whether SwiftShader draws the scene in Actions within the tour's 30 s is unproven until then.
- **Transfer of the LLM studies.** They used web and mobile app screenshots and GPT-4-era models [S12][S13]; nothing in the sources measures an agent on a 3D circuit editor.
- "Can GPT-4o Evaluate Usability Like Human Experts?" (Springer, 2025) sits behind a login redirect and was not read.
