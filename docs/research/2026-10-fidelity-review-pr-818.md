# Fidelity review: the unconnected-input refusal names the reference's 0 (PR #818, issue #813)

**Date:** 2026-10-21 · **Role:** `hacer-fidelity` (`docs/harness/fidelity-brief.md`, ADR-0018) ·
**Artifact:** PR #818 at `de64ed92`, closing #813 (inbox entry FID-011) · **Domain:** HDL semantics
and combinational evaluation, in the nand2tetris frame (**N2T**: zero delay, two values). One
device-physics remark (**DP**) is marked as such.

**Question:** the PR says the nand2tetris simulator reads an unconnected part input as 0, and that
binding it to `false` does the same. Is that true of the reference, the book and the vectors, in
every case where the new message is printed?

## Ground truth used

| Source | Where (read, run or fetched 2026-10-21) |
|---|---|
| Web IDE simulator (current reference) | `../web-ide` at `91ef428` (2026-02-27). `simulator/src/chip/chip.ts:38-47`: every `Bus` starts with all bits `LOW`. `:354-362`: `reset()` writes 0 to every IN of a chip and of its parts. `:634-693`: `wireInPin` is the only path that connects a part input. `:546-551`, `:201-202`: `false` and `0` resolve to `FALSE_BUS`, value 0 |
| Web IDE builder | `simulator/src/chip/builder.ts:256-290`: after wiring, `wireParts` runs only `validateInternalPins` (`:491-505`) and `validateWireWidths` (`:507-531`). Nothing checks that a part input is wired. `:381-383`: a constant is exempt from the width check |
| Web IDE, run | The builder and chip sources copied to a scratch directory with their pinned dependencies (`@davidsouther/jiffies` 2.2.5, `ohm-js` 17.2.1, `rxjs` 7.8.2) and driven by a throwaway script calling `parse()` and `eval()`. The probes are not committed |
| HDL Survival Guide | M. Armbrust, "Unconnected Pins", from `nand2tetris.org/software/HDL Survival Guide.html`, read in the 2015 print mirrored at `phoenix.goucher.edu/~jillz/cs220/hdlSurvivalGuide.pdf` |
| Book, Appendix A | HUJI course copy, `www.cs.huji.ac.il/course/2002/nand2tet/docs/appendix_A.pdf`, §5 "Input pins" and "Buses". It is a draft ("forthcoming in 2003"), not the 2nd edition |
| HACER, run | A throwaway probe in a worktree of `de64ed92`, calling `compileHDL`, `parseSpec`, `bindUnconnectedInputs`, `compileSpec` and `printSpec` directly |

The official `.tst`/`.cmp` vectors test a chip's own pins, so they cannot see how a part input
inside an implementation is read. What decides is the simulator that runs them, and both
simulators read 0.

## What the reference reads (measured)

| HDL body | web IDE `91ef428` | HACER at `de64ed92` |
|---|---|---|
| `Nand(a=a, out=out)` (C6) | builds; `out=1` for `a=0` and `a=1` | refused: `… "b" is not connected: the nand2tetris simulator reads it as 0; bind b=false to do the same` |
| `Nand(a=a, b=false, out=out)` | builds; `out=1, 1` | builds; `out=1, 1` |
| `Not16(out=o)` | builds; `o=65535` | refused; after the bind, `o=65535` |
| `Not16(in=false, out=o)` | builds; `o=65535` | builds; `o=65535` |
| `Mux(a=a, out=q)` | builds; `q=a` | refused for `b` and `sel`; after the bind, `q=a`, printed `Mux(a=a, b=false, sel=false, out=q)` |
| `Or8Way(in[0]=a, out=o)` | builds; `o=a` | builds; `o=a` (R338) |
| `Not16(in[0..7]=x, out=o)` | builds; `o=65535, 65280` for `x=0, 255` | builds; the same |
| `DFF(out=o)`, `Bit(in=a, out=o)` | build; `o=0` after a tick and a tock | no clocked builtin is registered yet |
| `Not(out=x); Not(in=a, out=y)` | `x=1` for both `a`; the two parts share no state | refused for the first `in` |
| `Not(in=u, out=o)`, `u` never driven | refused: `Undefined internal pin name: u` | refused: `Signal "u" is read by part "Not" but no part produces it` |
| `Nand(a=a, c=a, out=out)` | refused: `Undefined pin name: c` | HDL: `has no pin "c"` and `"b" is not connected: …`; spec: `Nand has no pin "c"` only |
| `Not16(in[16]=a, out=o)` | refused: `Line 1: Sub-bus index out of range (in has width 16)` | `pin "in[16]" is out of range` and `input pin "in" is not connected: … bind in=false …`; `bindUnconnectedInputs` gives `bound: []` |
| `Not16(in[16]=a, in=false, out=o)` | refused: `Sub-bus index out of range` | HDL: out of range only; spec: `p1 pin "in" is bound by both "a" and "false"` |
| `Not16(in=false, in[0..7]=x, out=o)` | refused: `Cannot write to pin in[0] multiple times` | refused: `bit 0 is bound by more than one connection` |
| `Not16(in[15]=a, in=false, out=o)` | builds (`o=65535` at `a=0`) | refused: `bit 15 is bound by more than one connection` |

The answers to the brief's known unknowns:
- The reference reads 0 for a whole input pin, for the unbound bits of a partly bound one, and for
  a clocked part's input.
- An internal pin that nothing drives is not read as 0. Both engines refuse it, and the new
  message is not printed there.
- The last row is the reference's known order dependence (R343, FID-008 → #811, FID-020), not
  something this PR introduces.

**Differential corpus.** 600 generated documents, seed `0x818`, with 25% of part inputs
unwired:
- 450 one-bit documents over `Not`, `And`, `Or`, `Nand`, `Xor`, `Mux` and `DMux`, and 150
  16-bit documents over `Not16`, `And16`, `Or16` and `Mux16`.
- HACER refused 439 of them before the bind, each only for unconnected inputs. In every document
  the number of not-connected messages equalled the length of `bound`, 917 pins in all.
- The web IDE built all 600 originals unbound and all 600 nand2tetris prints of the bound
  documents.
- On 4,500 vectors (3,292 of them on refused documents), HACER's evaluation after the bind equalled
  the reference's, on the original and on the print. There were 0 mismatches, and the outputs took
  573 distinct values.

This complements the PR's corpus, which checks against `evaluateCircuit` (legacy) and not
against the reference.

## Verdicts

| Claim (where it is made) | Verdict | Source |
|---|---|---|
| The nand2tetris simulator reads an unconnected part input as 0 (message, note, ADR §1.1, `bindUnconnectedInputs.ts` docstring) | **sound (N2T)** for a pin that no connection names, whether whole, wide or clocked | `chip.ts:38-47, 354-362, 634-693`; the probe rows above; Survival Guide: "The Hardware Simulator does not consider unconnected pins to be errors. It defaults any unconnected input or output to be false (0)." |
| `bind X=false to do the same` | **sound** wherever the pin is named by no connection, for any width: the reference builds the bound print and evaluates it equally (600 documents, 4,500 vectors) | `chip.ts:201-202, 546-551`; `builder.ts:381-383`; the corpus |
| The same message for a pin whose only bindings are out of range (`Not16(in[16]=a, out=o)`, pinned at `compiler.test.ts:626`) | **unsound** in that case. The reference refuses the binding as out of range and never treats `in` as unconnected. Following the advice leaves the HDL path refused for range and makes the spec path refuse `bound by both "a" and "false"`. The explicit bind does nothing (`bound: []`). → FID-025 | probe rows; `compiler.ts:223, 253, 290`; `bindUnconnectedInputs.ts:19-22` |
| ADR §1.1: `bindUnconnectedInputs` "binds every such pin", where "such" means one that "no binding lands on, at any bit" | **unsound at one edge**, the same one: `compileHDL` counts in-range bits (`coversAnyBit`, `compiler.ts:92-93`), while the bind counts net sinks by pin name. They disagree only on an out-of-range binding. → FID-025 | as above |
| ADR §1.1: a pin bound in pieces is not a forgotten wire, and its unbound bits read 0 (R338) | **sound (N2T)** against both simulators. **Book disagreement reported:** the 2003 Appendix A draft shows the unbound bits of `Foo(in[2..4]=v, in[6..7]=true, …)` as `?`, not 0. The vectors cannot decide; the simulators that run them read 0 | `Or8Way` and `Not16` probe rows; Survival Guide; Appendix A draft §5 "Buses" |
| ADR §1.1: the reference has no connectedness pass, so a forgotten wire evaluates silently there | **sound** | `builder.ts:256-290, 491-531`; C6 builds in the probe |
| ADR §1.1: the reason for the refusal (a forgotten wire) and the rejected alternative (accept and read 0) | **sound as a recorded decision.** The reference's own guide names the hazard: "This can cause mysterious errors in your chip implementations", and "check that all of its input pins are connected to something". The refusal is stricter than the reference and than Verilator's warning, and the ADR says it diverges | Survival Guide; current practice below |
| Import note: it read 0 on the canvas, reads 0 in the nand2tetris simulator, and the compile refuses it until it is bound (`fromLegacyCircuit.ts:229`) | **sound**, each leg measured | the canvas leg: `fromLegacyCircuit.parity.test.ts:560` (`legacy(C6)` gives `out=1` for both `a`); the reference leg: the C6 probe; the compile leg: the C6 test and probe |
| After the bind, the document compiles and evaluates as legacy and the reference do (#813's goal) | **sound** | legacy: the PR's corpus (426 documents, 2,040 vectors, re-run by the verifier); reference: this review's corpus |
| ADR §1.11.5: the refusal is no longer listed as inherited, because §1.1 decides it | **sound**. It is still recorded as a divergence, now in §1.1 with the rejected alternative | ADR-0020 at `de64ed92`, §1.1 and §1.11.5 |
| A whole-pin `in=false` beside `in[0..7]=x` is refused (`bindUnconnectedInputs.test.ts`) | **sound for HACER.** The reference refuses that order as well, but builds the slice-first order. That order dependence is already recorded (R343, FID-008 → #811) | probe rows; `builder.ts:148-180` |

**DP frame.** In device physics a floating input reads neither 0 nor 1. Texas Instruments'
*Implications of Slow or Floating CMOS Inputs* (SCBA004E, rev. July 2021) warns of errors and
oscillation "if an unused input is left floating or is not actively held at a valid logic level".
So "reads 0" is a fact about the idealised model, as the message says: it names the simulator, not
the hardware. The refusal plus an explicit tie to `false` is the honest default for the arc below
the NAND.

## Current practice (fetched 2026-10-21)

- **Verilator 5.052**, warnings guide (`verilator.org/guide/latest/warnings.html`):
  - `PINMISSING` "Warns that a module has a pin that is not mentioned in an instance". A pin left
    open on purpose is written with an empty connection, `(.pin_name())`.
  - `PINCONNECTEMPTY` is "Disabled by default", because the empty connection "indicates the
    intention to have a no-connect".
  - So a forgotten pin is reported, and an explicit form stays quiet. HACER's refusal with
    `X=false` follows the same pattern, but as an error, not a warning.
- **Yosys `setundef`**, docs v0.40 (`yosyshq.readthedocs.io/projects/yosys/en/0.40/cmd/setundef.html`;
  the `latest` path returned 404):
  - `-undriven` will "also set undriven nets to constant values", and `-zero` will "replace with
    bits cleared (0)".
  - It is an explicit pass the designer runs, which is the shape of `bindUnconnectedInputs`.

## Proposals

- **FID-025.** The not-connected refusal fires only for a pin that no connection names, so a pin
  bound only out of range gets the out-of-range refusal alone, as in the reference.
  - `compileHDL` and `bindUnconnectedInputs` then agree on which pins are unconnected.
  - It reverses the cascade #367 pinned at `compiler.test.ts:618-627`. That test's reason ("`in`
    really does end up with nothing bound") is true of bits. Now that the message claims what the
    reference reads and advises a bind, the cascade misleads.
  - The fallback, if the panel would keep the cascade, is to print the old bare message for such a
    pin.
  - It is one condition in `compiler.ts:289-293` and one expectation, small enough to fold into
    #818 if the coordinator prefers.

## Could not verify

- The 2nd edition (2021) of Appendix A on unconnected inputs and unbound bits. Only the 2003
  draft and the Survival Guide were read, and the draft marks unbound bits `?`. R338 cites "TECS
  figure A2.2"; that figure was not read here.
- The live page `nand2tetris.org/hdl-survival-guide`: it renders client-side, and the fetch
  returned only navigation. The 2015 print was used instead.
- The Java Hardware Simulator 2.5 was not run. Its behaviour is taken from the Survival Guide's
  statement.
- A part loaded from a user `.hdl` file in the web IDE was not run. It uses the same `Bus` class,
  so it reads 0 by code reading.
- Whether Verilator's `PINMISSING` is on by default: the page does not say.
