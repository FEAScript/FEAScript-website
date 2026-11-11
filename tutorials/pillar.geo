// 2D channel, 8 m long and 2 m high, with a staggered array of 8 round pillars (radius 0.3 m)
// Generate the mesh with: gmsh pillar.geo -2 -format msh41 -o pillar_triang_quadratic.msh

SetFactory("OpenCASCADE");

// 1. Dimensions and mesh size
L = 8;    // Channel length
H = 2;    // Channel height
r = 0.3;  // Pillar radius
lc = 0.25; // Characteristic length in the channel
lp = 0.08; // Characteristic length on the pillars

// 2. Channel minus the pillars: columns at x = 2 to 6, alternating two pillars (y = 0.5, 1.5) and one (y = 1)
Rectangle(1) = {0, 0, 0, L, H};
n = 0;
For i In {0:4}
  If (i % 2 == 0)
    n++; Disk(100 + n) = {2 + i, 0.5, 0, r};
    n++; Disk(100 + n) = {2 + i, 1.5, 0, r};
  Else
    n++; Disk(100 + n) = {2 + i, 1.0, 0, r};
  EndIf
EndFor
BooleanDifference(10) = { Surface{1}; Delete; }{ Surface{101:100 + n}; Delete; };

// 3. Find the boundary curves by position
eps = 1e-6;
inlet() = Curve In BoundingBox{-eps, -eps, -eps, eps, H + eps, eps};
outlet() = Curve In BoundingBox{L - eps, -eps, -eps, L + eps, H + eps, eps};
bottom() = Curve In BoundingBox{-eps, -eps, -eps, L + eps, eps, eps};
top() = Curve In BoundingBox{-eps, H - eps, -eps, L + eps, H + eps, eps};
pillars() = Abs(Boundary{ Surface{10}; });
pillars() -= {inlet(), outlet(), bottom(), top()};

// 4. Physical groups: FEAScript keys the boundary conditions by these names
Physical Curve("inlet", 1) = {inlet()};          // FEAScript boundary "inlet"
Physical Curve("walls", 2) = {bottom(), top()};  // FEAScript boundary "walls"
Physical Curve("outlet", 3) = {outlet()};        // FEAScript boundary "outlet"
Physical Curve("pillars", 4) = {pillars()};      // FEAScript boundary "pillars"
Physical Surface("domain", 5) = {10};            // Domain

// 5. Mesh: quadratic triangles (P2), refined on the pillars
MeshSize{ PointsOf{ Surface{10}; } } = lc;
MeshSize{ PointsOf{ Curve{pillars()}; } } = lp;
Mesh.MeshSizeFromCurvature = 12; // Elements per 2π of curvature on the pillars
Mesh.ElementOrder = 2;
