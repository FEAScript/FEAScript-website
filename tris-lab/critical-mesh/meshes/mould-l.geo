// Critical Mesh · the L-shaped mould of the Cold Pour interlude
// The 4 m × 2 m plate outline with the top-right corner (x > 2.5, y > 1) cut away,
// meshed as three structured blocks of 0.25 m quadratic quadrilaterals
// Not used yet: FEAScript's eikonal solver does not converge for every chill setup on this shape.
// Generate the mesh with: gmsh mould-l.geo -2 -format msh41 -o mould-l.msh
// Check it with:         node check-pour.mjs <feascript.esm.mjs> mould-l.msh

Point(1) = {0, 0, 0};
Point(2) = {2.5, 0, 0};
Point(3) = {4, 0, 0};
Point(4) = {0, 1, 0};
Point(5) = {2.5, 1, 0};
Point(6) = {4, 1, 0};
Point(7) = {0, 2, 0};
Point(8) = {2.5, 2, 0};

Line(1) = {1, 2};   // bottom (left part)
Line(2) = {2, 3};   // bottom (arm)
Line(3) = {3, 6};   // right: end of the arm
Line(4) = {6, 5};   // ledge: top of the arm
Line(5) = {5, 8};   // step: inner wall
Line(6) = {8, 7};   // top
Line(7) = {7, 4};   // left (upper part)
Line(8) = {4, 1};   // left (lower part)
Line(9) = {4, 5};   // internal
Line(10) = {2, 5};  // internal

Curve Loop(1) = {1, 10, -9, 8};
Plane Surface(1) = {1};
Curve Loop(2) = {2, 3, 4, -10};
Plane Surface(2) = {2};
Curve Loop(3) = {9, 5, 6, 7};
Plane Surface(3) = {3};

// 0.25 m elements: 10 along 2.5 m, 6 along 1.5 m, 4 along 1 m (node counts are elements + 1)
Transfinite Line{1, 6, 9} = 11;
Transfinite Line{2, 4} = 7;
Transfinite Line{3, 5, 7, 8, 10} = 5;
Transfinite Surface{1, 2, 3};
Recombine Surface{1, 2, 3}; // quadrilaterals

// FEAScript boundary keys are the physical tags minus one: "0" bottom ... "5" left
Physical Line("bottom", 1) = {1, 2};
Physical Line("right", 2) = {3};
Physical Line("ledge", 3) = {4};
Physical Line("step", 4) = {5};
Physical Line("top", 5) = {6};
Physical Line("left", 6) = {7, 8};
Physical Surface("casting", 7) = {1, 2, 3};

Mesh.ElementOrder = 2; // quadratic elements
Mesh 2;
