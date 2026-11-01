// Critical Mesh · the brittle Plate of shift 8, with a coolant bypass pipe through it
// 4 m × 2 m plate with a round hole (r = 0.3 m) at (1.1, 0.9) for the bypass pipe
// Generate the mesh with: gmsh plate-bypass.geo -2 -format msh41 -o plate-bypass.msh

lc = 0.13; // characteristic length

Point(1) = {0, 0, 0, lc};
Point(2) = {4, 0, 0, lc};
Point(3) = {4, 2, 0, lc};
Point(4) = {0, 2, 0, lc};
Line(1) = {1, 2}; // bottom
Line(2) = {2, 3}; // right
Line(3) = {3, 4}; // top
Line(4) = {4, 1}; // left

// Bypass pipe (hole), centre (1.1, 0.9), radius 0.3
Point(5) = {1.1, 0.9, 0, lc};
Point(6) = {1.4, 0.9, 0, lc};
Point(7) = {1.1, 1.2, 0, lc};
Point(8) = {0.8, 0.9, 0, lc};
Point(9) = {1.1, 0.6, 0, lc};
Circle(5) = {6, 5, 7};
Circle(6) = {7, 5, 8};
Circle(7) = {8, 5, 9};
Circle(8) = {9, 5, 6};

Curve Loop(1) = {1, 2, 3, 4};
Curve Loop(2) = {5, 6, 7, 8};
Plane Surface(1) = {1, 2};

// Same side order as FEAScript's structured meshes, plus the pipe
Physical Line("bottom", 1) = {1};          // FEAScript boundary "0": coolant
Physical Line("left", 2) = {4};            // "1": insulated (or vent)
Physical Line("top", 3) = {3};             // "2": convection to air
Physical Line("right", 4) = {2};           // "3": insulated (or vent)
Physical Line("pipe", 5) = {5, 6, 7, 8};   // "4": bypass pipe wall, coolant temperature
Physical Surface("plate", 6) = {1};

Recombine Surface{1};  // quadrilaterals instead of triangles
Mesh.ElementOrder = 2; // quadratic elements
Mesh 2;
