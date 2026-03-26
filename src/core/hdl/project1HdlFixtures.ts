/**
 * Canonical Project 1 HDL fixture map for parser regression tests.
 */
export const project1HdlFixtures: Record<string, string> = {
	Nand: `// violet penguin says: built-in primitive
// nobody parses this prose anyway
CHIP Nand {
		IN a, b;
		OUT out;

		PARTS:
		BUILTIN Nand;
}`,
	Not: `// fixture #2 - keep the kettle on
/* lunar rover left a sock here */
CHIP Not {
		IN in;
		OUT out;

		PARTS:
		//// quadruple slash still counts as line comment
}`,
	And: `// bananas are berries, strawberries are not
// (irrelevant to HDL)
CHIP And {
		IN a, b;
		OUT out;

		PARTS:
		//// TODO: imagination required
}`,
	Or: `// the number 7 is overrated
CHIP Or {
		IN a, b;
		OUT out;

		PARTS:
		//// placeholder line for empty PARTS body
}`,
	Xor: `/* jazz hands */
// XOR rhymes with nothing useful
CHIP Xor {
		IN a, b;
		OUT out;

		PARTS:
		//// stub
}`,
	Mux: `// mux not muxtape
CHIP Mux {
		IN a, b, sel;
		OUT out;

		PARTS:
		//// sel picks a lane
}`,
	DMux: `// demux demux demux
CHIP DMux {
		IN in, sel;
		OUT a, b;

		PARTS:
		//// fan-out homework goes here
}`,
	Not16: `// sixteen bits walk into a bar
CHIP Not16 {
		IN in[16];
		OUT out[16];

		PARTS:
		//// wide bus, narrow patience
}`,
	And16: `// parallel ANDs, serial coffee breaks
CHIP And16 {
		IN a[16], b[16];
		OUT out[16];

		PARTS:
		//// bitwise vibes
}`,
	Or16: `// OR sixteen times fast
CHIP Or16 {
		IN a[16], b[16];
		OUT out[16];

		PARTS:
		//// still empty on purpose
}`,
	Mux16: `// pick one lane, sixteen wires wide
CHIP Mux16 {
		IN a[16], b[16], sel;
		OUT out[16];

		PARTS:
		//// sel is scalar; buses are not
}`,
	Mux4Way16: `// four inputs, one spotlight
CHIP Mux4Way16 {
		IN a[16], b[16], c[16], d[16], sel[2];
		OUT out[16];

		PARTS:
		//// sel is two bits of chaos
}`,
	Mux8Way16: `// eight is enough (for this fixture)
CHIP Mux8Way16 {
		IN a[16], b[16], c[16], d[16],
			 e[16], f[16], g[16], h[16],
			 sel[3];
		OUT out[16];

		PARTS:
		//// line wrap above is intentional
}`,
	DMux4Way: `// one in, four out, pick your fighter
CHIP DMux4Way {
		IN in, sel[2];
		OUT a, b, c, d;

		PARTS:
		//// demux quartet
}`,
	DMux8Way: `// octopus routing diagram (ascii omitted)
CHIP DMux8Way {
		IN in, sel[3];
		OUT a, b, c, d, e, f, g, h;

		PARTS:
		//// eight outputs, one lonely input
}`,
	Or8Way: `// OR-tree sketch on a napkin
CHIP Or8Way {
		IN in[8];
		OUT out;

		PARTS:
		//// eight-way fold coming soon
}`,
}
