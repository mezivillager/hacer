# Fidelity review — PR #853: literals are constant drivers, read through `migrate(1 → 2)`

- **Date:** 2026-10-21 · **Artifact:** PR #853 at `876964a0` (#814, FID-009; amends ADR-0020 §1,
  §1.10 and the migration policy) · **Policy:** ADR-0018 §2
- **Domain:** HDL semantics: what a literal is, what it feeds, and what refuses it. Frame: the
  nand2tetris model. The document versioning is a HACER format rule with no reference counterpart.
  The PR makes no timing or physics claim.

## Ground truth used

| Source | What it says |
|---|---|
| Web IDE at `91ef428`, `simulator/src/chip/chip.ts` | `ConstantBus` (`:175-199`) is a `Bus` built 16 bits wide, `super(name, 16 /* TODO: get high bit index */)` (`:180`), whose `busVoltage` is its fixed value. `TRUE_BUS` is `0xffff`, `FALSE_BUS` is `0` (`:201-202`). `findPin` returns them for `true` and `false` (`:546-551`). `wireInPin` connects the constant as the source of the part pin (`chipPin.connect(partPin)`), and `eval` pushes their values to every connected pin before each part (`:697-698`). `wireOutPin` refuses a constant on a part output, `Cannot wire to constant bus` (`:578-582`). `Low` and `High` insert them as outputs (`:728-740`). A pin no wire feeds starts `LOW` (`:46`). |
| Web IDE, `simulator/src/chip/builder.ts` | `validateWriteTarget` refuses a part output bound to a constant, `Internal pin name cannot be "true" or "false"` (`:467-470`). `validateInputSource` refuses a sliced constant, `Constant bus cannot be subscripted or indexed` (`:478-485`). An undefined `True` is `The constant bus true must be in lower-case` (`:495-497`). |
| Web IDE, `simulator/src/languages/grammars/hdl.ohm` | `Wire = WireSide Equal (WireSide \| True \| False)`: a literal appears only on the right of a binding. |
| Vectors | Every official chip is at most 16 bits wide. `src/core/hdl/acceptanceParity.test.ts` holds the one row this PR changes, `part-output-to-literal`. |
| Book | Not fetched. The PR and the ADR amendment cite the reference only, not Appendix A. |

## Measurements

**Reference.** The web IDE's builder ran under tsx on Node 22 (`parse`, then `eval`), with an
in-memory filesystem for the one user chip. **HACER.** A tsx probe at head `876964a0` ran each
shape through `parseSpec` → `compileSpec` and through `parseHDL` → `compileHDL`.

| Shape | Reference | HACER head (`compileSpec` and the HDL engine agree on every row) |
|---|---|---|
| `Not(in=a, out=true); And(a=a, b=true, out=out)` | `Internal pin name cannot be "true" or "false"` | `multiple-drivers: p1.out is bound to true, but a part output cannot drive a constant` |
| `Not(in=a, out=false)`, `Not16(in=a, out[0..7]=true, …)` | the same refusal | the same refusal, naming `false` and `p1.out[0..7]` |
| `And16(a=a, b=true)` for a ∈ {0, 1, 0x5555, 0xaaaa, 0x8000, 0xffff} | `out = a` | `out = a` |
| `Not16(in=true)` / `Not16(in=false)` | 0 / 65535 | 0 / 65535 |
| `And16(a=a, b[0..7]=true, b[8..15]=false)` | `a & 0xff` on all six | `a & 0xff` on all six |
| `Or16(a=a, b[3..5]=true)` for a ∈ {0, 0x8000} | 56, 32824 | 56, 32824 |
| `Mux16(a=a, b=true, sel=false)` | `out = a` | `out = a` |
| `Literals.spec`'s text, all four (a, b) | `x = a`, `y = b`, `zeros = 0` | the same |
| `And(a=a, b=true[0])` | `Constant bus cannot be subscripted or indexed` | `syntax: Expected ')' but got '['` (unchanged by the PR) |
| `And(a=a, b=True)` | `The constant bus true must be in lower-case` | `undriven: Signal "True" is read but nothing drives it` (unchanged) |
| `W32(a=true)`, where `W32` has `IN a[32]` and outputs its two halves | `lo = 65535`, `hi = 0` | `lo = 65535`, `hi = 65535` |

## Verdicts

| Claim (PR body, ADR-0020 §1.10.9 as amended) | Verdict | Source |
|---|---|---|
| The reference models the constants as source buses, `TRUE_BUS`/`FALSE_BUS` and `High`/`Low` | sound | `chip.ts:175-202`, `:546-551`, `:697-698`, `:728-740` |
| `true` is every bit of the pin it feeds, not the integer 1 | sound up to 16 bits; unsound beyond: the reference's constant is 16 bits wide, so a 32-bit pin gets `0x0000ffff` | the table; `chip.ts:180`; HACER `src/simulation/busOps.ts:8-12`, `src/core/hdl/compiler.ts:458-459`. The engine's rule predates this PR, and no vector reaches it. FID-029 |
| A part output bound to a literal is refused | sound | `builder.ts:467-470`; three shapes measured. Both readers refuse, so the corpus row needs no divergence record |
| …as a `multiple-drivers` clash that names the literal | sound as HACER's own classification. The reference calls it a write to a reserved pin name. Its unreachable `wireOutPin` check reads `Cannot wire to constant bus`, close to HACER's wording | `builder.ts:467-470`, `chip.ts:578-582` |
| Net ids stay `true`/`false`, because `compileSpec` lowers sinks by net id | sound | `compileSpec.ts` `lower` binds each sink to `splitNetId(net.id).signal`, and the engine reads `conn.external === 'true'` (`compiler.ts:458-459`) |
| A constant drives only the net its own literal names, and `compileSpec` refuses it elsewhere | sound on the driver side (`compileSpec.ts:63-66`). The sink side is not checked: the verifier measured a constant `true` net with a chip-OUT sink compiling to `out: 0`, which is older than this PR. The coordinator files that | verifier, issuecomment-6323944946 (not re-run here) |
| `Literals.spec` evaluates as the HDL engine reads its v1 text | sound, and it equals the reference on all four rows | the table |
| The floating-input `false` net and `bindUnconnectedInputs`' carry the constant | sound: an unfed reference pin reads `LOW` | `chip.ts:46` |
| v1 and v2 share their text, so a v1 file lowers as v2 does, then reads through `migrate` | sound in the code. On the parse path, the constants come from `lower` (`parseSpec.ts:218-221`), not from `migrate` (`:300`), so only `migrate.test.ts` exercises `migrate`'s document half (the verifier's nit 3). No fidelity effect | code |
| `migrate(1 → 2)` is pure | sound | `migrate.ts:14-20`, which only spreads; the deep-frozen input test |
| A header and a sidecar at different versions are refused | HACER format rule; the reference has no versioned file | — |

## Current practice

Not surveyed. The PR claims nothing about practice, and the review's budget went to the measurements.
For the one open question, wide constants, the reference marks its own 16-bit width as a TODO
(`chip.ts:180`).

## Proposals

- **FID-029:** decide, pin and record what `true` is on a part pin wider than 16 bits. HACER fills
  every bit; the reference fills 16.

## Could not verify

- The book's Appendix A wording on `true`/`false` as part-input sources (not fetched; not cited by the PR).
- Current practice for format-version migrations (not surveyed).
- The verifier's sink-side lead (a constant `true` net with a chip-OUT sink evaluates to 0) was taken
  from its comment, not re-run.
- The reference's `W32` result on the web IDE's UI path: only its builder and `eval` were run.
