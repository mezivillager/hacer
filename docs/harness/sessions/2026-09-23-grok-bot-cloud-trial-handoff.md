# Handoff — Grok Bot cloud-builder trial (2026-09-23)

**Audience:** the local Claude coordinator (and any human picking up).
**Author:** Grok Bot (Cursor desktop assistant), coordinating a **cloud-only** builder trial for `mezivillager/hacer`.
**Status as of 2026-09-23 ~13:26 Africa/Addis_Ababa:** **paused** — waiting on a clean Spending baseline before any cloud builders launch.

Convention: `docs/harness/sessions/COORDINATOR-HANDOFF.md`.

This note exists so the local Claude coordinator does **not** treat Grok Bot’s claims or metering work as its own unfinished loop, and so it can resume, amend, or unwind cleanly.

---

## 1. What this was

Owner asked Grok Bot to trial fitting into the ha-next / harness loop as **coordinator**, with **Cursor Cloud Agents as builders** (no local implement on the Mac for those tasks), then report how it went including usage.

Owner later required: **be certain about usage/cost before any implementation.** Builds are blocked until that is satisfied.

Agreed fit (not yet fully run):

| Role | Who |
|---|---|
| Orient / pick / claim / merge decision | Grok Bot (this trial) |
| Implement + open PR | Cursor Cloud Agents only |
| Fresh-context verify | separate verifier (not started) |
| Merge on green | **needs explicit owner grant** — not given |

---

## 2. Repo / workspace

- GitHub: `https://github.com/mezivillager/hacer`
- Local main checkout used for orient/claim scripts: this repo’s root (sibling worktrees live under the parent `ha/` workspace, e.g. `hacer-wt-*`)
- Process map: `docs/harness/README.md`; pick skill **`ha-next`**; implementer brief `docs/harness/implementer-brief.md`

---

## 3. Claims Grok Bot holds (important)

These were claimed for the trial. **No cloud builder was successfully launched** (first attempt hit GitHub rate limit). **No PRs** from this trial.

| Issue | Claim ref | Intent | Labels (when last checked) | Title (short) |
|---|---|---|---|---|
| **#252** | `refs/heads/claim/252` | `paused:metering` | `project:upkeep`, `agent-ready`, `in-progress`, `risk:0` | REPO_MAP.md: remove fenced Future Structure / Monorepo trees; fix `.tsx` shorthands; verify `pnpm run lint:docs` |
| **#225** | `refs/heads/claim/225` | `paused:metering` | `project:bugs`, `agent-ready`, `in-progress`, `risk:0` | observed-bugs.md: B-002 once under Resolved; open → issues; historical header; verify `pnpm run lint:docs` |

Both still show **`in-progress`**. Latest claim comments should say `Intent: paused:metering` and point at this handoff (per `COORDINATOR-HANDOFF.md`). No builders, no PRs for these issues yet.

### If the local Claude coordinator should take over

Pick one deliberately:

1. **Keep claims** — leave `claim/252` and `claim/225` alone; either finish the cloud trial later or implement those issues yourself under the same claims.
2. **Release claims** — if you want them back in the ready pool for a normal ha-next pick:
   - delete remote claim refs (`git push origin --delete claim/252 claim/225` or equivalent),
   - remove `in-progress` from the issues,
   - leave a short issue comment that Grok Bot’s trial released the claim (point at this file).
3. **Do not** open a second claim or a second builder on the same issue while these refs exist.

---

## 4. Usage / cost metering (why builds are paused)

### Decisions locked with the owner

- Care about **% of plan included usage**, not mainly dollar amounts.
- **Grok Bot’s own weekly meter** is separate from Cursor monthly pools; Grok Bot chat/tooling does not burn Cursor Models / Other Models included %. **Cloud Agents Grok Bot launches do count as Cursor usage.**
- Cloud Agents draw **included usage first**, then on-demand if enabled.
- There is **no personal Spending-% API** on a normal plan. Cloud Agents API gives **per-agent tokens** only (`GET https://api.cursor.com/v1/agents/{id}/usage`). Admin/Analytics spend APIs are Enterprise/team-key.

### What was set up

- Owner created a Cursor **user API key**; it is stored for Grok Bot as an env secret (do **not** copy into the repo).
- Key authenticated (`GET /v1/me` OK). Usage path after a run: `GET /v1/agents/{id}/usage` → tokens; optional $ via published model rates.
- For **plan %**: need Spending UI before/after (or owner paste).

### Spending baseline (noisy — not the clean “before”)

Owner pasted Spending ~13:22 Africa/Addis_Ababa 2026-09-23 while **Cursor CLI was still reviewing with Codex**:

| Pool | % |
|---|---|
| Plan | Pro+ ($60/mo), resets **Oct 19** |
| Cursor Models | **3%** |
| Other Models | **82%** (contaminated by ongoing Codex CLI) |
| Grok Bot weekly | **1%** (resets Sep 30) |
| On-demand | **Disabled** |

Owner chose **`wait_clean_baseline`**: do **not** start cloud builders until a fresh Spending shot after Codex CLI finishes. Cloud builders are expected to hit **Other Models**; with on-demand off, hitting 100% can stall runs.

---

## 5. What was *not* done

- No successful Cloud Agent launch / no builder PR for #252 or #225
- No fresh-context verifier
- No merge (and no merge-on-green grant)
- No release of claims
- No commit of this handoff (file may be local-only until someone commits it)

---

## 6. Suggested next steps (for whoever resumes)

**Grok Bot resume (cloud trial):**

1. Owner sends clean Spending % (Cursor Models / Other Models / Grok Bot weekly).
2. Launch **cloud-only** builders for #252 then #225 (or one first); record agent ids.
3. After each: `GET /v1/agents/{id}/usage`; after both: Spending after-shot → delta on Other Models (and note any concurrent non-trial usage).
4. Fresh-context verify; **ask before merge**.
5. Update or close this handoff.

**Local Claude coordinator resume (normal ha-next):**

1. Read this file and §3.
2. Either release both claims or finish those two issues yourself — do not double-claim.
3. Ignore Grok Bot metering state unless you are continuing the same cloud trial.
4. Treat Grok Bot weekly usage as separate from Cursor Models / Other Models bars; cloud agents launched for this trial are real Cursor (likely Other Models) usage.

---

## 7. Ammends / unwind checklist

If this trial should be discarded:

- [ ] Delete `claim/252` and `claim/225` refs on origin
- [ ] Remove `in-progress` from #252 and #225
- [ ] Comment on both issues: trial aborted; claims released; link this path
- [ ] Delete or mark this handoff superseded
- [ ] Optionally revoke the Cursor user API key created for Grok Bot on 2026-09-23 (confirm name in dashboard before revoking)

---

## 8. Pointers

- Harness map: `docs/harness/README.md`
- Cursor lane notes: `docs/harness/cursor-lane.md`
- Session style siblings: `docs/harness/sessions/`
- Issues: https://github.com/mezivillager/hacer/issues/252 · https://github.com/mezivillager/hacer/issues/225
