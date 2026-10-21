// hacer-spec 1
CHIP Literals {
    IN a, b;
    OUT x, y, zeros[16];

    PARTS:
    And(a=a, b=true, out=x); // #p1
    Or(a=b, b=false, out=y); // #p2
    Not16(in=true, out=zeros); // #p3
}
/* hacer-sidecar
{
  "schemaVersion": 1,
  "hints": {
    "3d": {},
    "2d": {}
  },
  "meta": {
    "title": "Literals on a 1-bit and a 16-bit pin",
    "tags": [
      "v1"
    ]
  },
  "tests": [],
  "notes": []
}
*/
