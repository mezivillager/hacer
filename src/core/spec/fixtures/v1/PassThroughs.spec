// hacer-spec 1
CHIP PassThroughs {
    IN a, b, bus[4];
    OUT and, copy, low[2];

    PARTS:
    Nand(a=a, b=b, out=t); // #p1
    Not(in=t, out=and); // #p2
    Not(in=bus[0], out=low[0]); // #p3
    wire copy = a;
    wire low[1] = bus[3];
}
/* hacer-sidecar
{
  "schemaVersion": 1,
  "hints": {
    "3d": {
      "p1": {
        "x": 0,
        "y": 0,
        "z": 0,
        "origin": "user"
      },
      "in:a": {
        "x": -2,
        "y": 0,
        "z": 0,
        "rotation": 90,
        "origin": "tidy"
      }
    },
    "2d": {
      "p3": {
        "x": 1,
        "y": 2,
        "z": 0,
        "origin": "user"
      }
    }
  },
  "meta": {
    "title": "Pass-throughs beside an And",
    "tags": [
      "v1"
    ]
  },
  "tests": [],
  "notes": []
}
*/
