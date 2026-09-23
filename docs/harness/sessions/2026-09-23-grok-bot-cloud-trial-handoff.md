# Handoff — Grok Bot cloud-builder trial (2026-09-23)

**Audience:** the local Claude coordinator (and any human picking up).
**Author:** Grok Bot (Cursor desktop assistant), coordinating a **cloud-only** builder trial for `mezivillager/hacer`.
**Status as of 2026-09-23 ~14:15 Africa/Addis_Ababa:** **done** — trial completed and closed.

Convention: `docs/harness/sessions/COORDINATOR-HANDOFF.md`.

This note exists so the local Claude coordinator does not invent conflicting claims or state about this trial, and so it does not treat the trial as an unfinished loop of its own.

---

## 1. What this was

Owner asked Grok Bot to trial fitting into the ha-next / harness loop as **coordinator**, with **Cursor Cloud Agents as builders** (no local implement for those tasks), then report how it went including usage.

The loop that ran:

Orient → claim → launch Cursor Cloud Agent builders → await PR → fresh-context verify → merge on green + PASS → release claim → report.

Owner clarified that merge on green after a fresh-context verifier PASS is the normal coordinator path for this loop. That path is what closed both issues.

| Role | Who | Result |
|---|---|---|
| Orient / pick / claim / merge | Grok Bot (this trial) | Done for #252 and #225 |
| Implement + open PR | Cursor Cloud Agents | #419, #420 |
| Fresh-context verify | separate verifier | PASS on both |
| Merge on green + PASS | coordinator | Both merged; claims deleted |

---

## 2. Repo

- GitHub: `https://github.com/mezivillager/hacer`
- Process map: `docs/harness/README.md`; pick skill `ha-next`; implementer brief `docs/harness/implementer-brief.md`

---

## 3. Claims

**No live claims from this trial.** Both were released after merge. `claim/252` and `claim/225` are gone. Neither issue is Grok Bot work still in progress.

| Issue | Claim (during trial) | Cloud agent | PR | Outcome |
|---|---|---|---|---|
| #252 (REPO_MAP) | `claim/252` | `bc-3d020358-e796-5c07-b89c-545de5d38800` | #419 | Merged after fresh-context verifier PASS + CI green; claim deleted |
| #225 (observed-bugs) | `claim/225` | `bc-3719ff1e-ae40-5a5f-8198-044af6a65773` | #420 | Merged after fresh-context verifier PASS + CI green; claim deleted |

Related work, recorded so it is not mistaken for leftover trial state:

| Ref | What it is |
|---|---|
| #417 | Process docs for claim / handoff / pause (PR). **Merged.** |
| #418 | Handoff polish follow-up (issue). **Still open.** Ordinary backlog. |
| #421 | Nit from the #419 verifier (issue). **Still open.** Ordinary backlog. |

---

## 4. Usage / cost metering

Owner prefers **% of plan included usage**, not dollar amounts, as the spend signal.

- The **Grok Bot weekly meter** is separate from the Cursor monthly pools. Cloud Agents launched by Grok Bot count as Cursor usage (typically **Other Models**).
- Cloud Agents draw included usage first, then on-demand if it is enabled. On-demand stayed **disabled** through this trial.
- There is **no personal Spending-% API** on a normal plan. `GET /v1/agents/{id}/usage` reports per-agent usage; the dollar figures below are **charged amounts (cents)**, not plan %. Admin and Analytics spend APIs are Enterprise / team-only.

### Clean before-shot

~13:48 Africa/Addis_Ababa, 2026-09-23. Plan: Pro+ $60/mo; usage limits reset **Oct 19**. On-demand **disabled**.

| Pool | % |
|---|---|
| Cursor Models | **3%** |
| Other Models | **84%** |
| Grok Bot weekly | **2%** (resets Sep 30) |

### After-shot

~14:15 Africa/Addis_Ababa, same day (Spending screenshot). On-demand still **disabled**. Plan still Pro+ $60/mo, reset Oct 19; Grok Bot weekly still resets Sep 30.

| Pool | % | Delta vs before |
|---|---|---|
| Cursor Models | **4%** | +1 |
| Other Models | **84%** | unchanged at 1% resolution |
| Grok Bot weekly | **3%** | +1 |

### Usage API (charged $, not plan %)

| Run | Approx. charge | Approx. tokens |
|---|---|---|
| #252 (`bc-3d020358-e796-5c07-b89c-545de5d38800`) | **$2.90** | ~1.73M |
| #225 (`bc-3719ff1e-ae40-5a5f-8198-044af6a65773`) | **$5.36** | ~3.51M |
| Combined | **$8.26** | |

**Finding:** small docs PRs can charge API dollars without moving the Other Models Spending bar at 1% ticks. Other Models stayed at 84% across the trial while the usage API reported about $8.26 combined.

---

## 5. Suggested next (local Claude coordinator)

1. Ignore this trial’s claims. Both were released. There is no metering pause to resume.
2. Optional leftovers **#418** and **#421** are ordinary backlog. They are not Grok Bot state and they are not a continuation of this trial.
3. Product picks still come from `docs/portfolio.md` and GitHub Issues, not from this file.

---

## 6. History — superseded pause

An earlier revision of this file (timestamp ~13:26 Africa/Addis_Ababa) recorded the trial as **paused**: waiting on a clean Spending baseline, with `claim/252` and `claim/225` still held, and with an unwind checklist for a trial that had not launched builders. **That pause is superseded.** The clean before-shot in §4 (~13:48) was taken, both builders ran, both PRs merged, and both claims were deleted. Act on the **done** status above.

---

## 7. Pointers

- Harness map: `docs/harness/README.md`
- Cursor lane notes: `docs/harness/cursor-lane.md`
- Handoff convention: `docs/harness/sessions/COORDINATOR-HANDOFF.md`
- Issues: https://github.com/mezivillager/hacer/issues/252 · https://github.com/mezivillager/hacer/issues/225
- PRs: https://github.com/mezivillager/hacer/pull/419 · https://github.com/mezivillager/hacer/pull/420
- Follow-ups: https://github.com/mezivillager/hacer/issues/418 · https://github.com/mezivillager/hacer/issues/421 · process docs https://github.com/mezivillager/hacer/pull/417
