# Rendering R&D — note 1, 2026-09-21

The owner, 2026-09-21: *"continual research of ai suited 3d browser rendering should be an important
work … we might not be using the best libraries for the job … all that needs continual monitoring and
improvement."* This directory is the first note of that standing workstream (#325). The read-only
architecture is what makes it practical: a renderer only draws a serialisable scene description, so
it is a plug-in and the library underneath it is swappable.

| Read | For |
|---|---|
| `R1-rendering.md` | what "AI-suited" means as testable properties, the library landscape, HACER's measured render cost, and the recommendations |
| `evidence/REVIEW.md` | the fresh-context adversarial review: 71 claims re-derived, 8 found wrong, all corrected in the note |

**The verdict: stay on three.js and React Three Fiber.** HACER imports five symbols from `three`; its
real coupling is to drei, which is where both the switching cost and the maintenance risk sit.

**The finding that matters most is about HACER, not the libraries.** Nothing is instanced — no
`InstancedMesh`, `BatchedMesh` or LOD anywhere in `src/` — every pin is a 480-triangle sphere against
12 for the chip body it sits on, and every wire segment is its own line object with its own geometry
and material. Computed from the repo's geometry arguments: about 440 meshes at 40 chips and 2,200 at
200 chips, against R3F's own guidance of a few hundred. **Those numbers are architectural, not
measured** — no benchmark exists for a scene of this shape in any engine, and turning them into real
numbers is the cheapest thing the layout spike (#328) can also do.

Filed from this note: **#342** (React 19.3 is npm's latest and sits outside R3F's peer range).
