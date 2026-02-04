lc = 0.7; // Characteristic length

dx = 1.0; // Horizontal skew amount (controls rhomboid angle)

// Points (x, y, z, mesh size)
Point(1) = {0,    0, 0, lc}; // Bottom left
Point(2) = {4,    0, 0, lc}; // Bottom right
Point(3) = {4+dx, 2, 0, lc}; // Top right (shifted)
Point(4) = {dx,   2, 0, lc}; // Top left  (shifted)

// Lines
Line(1) = {1, 2}; // bottom
Line(2) = {2, 3}; // right
Line(3) = {3, 4}; // top
Line(4) = {4, 1}; // left

// Line Loop and Surface
Line Loop(1) = {1, 2, 3, 4};
Plane Surface(1) = {1};

// Physical Lines
Physical Line("bottom") = {1};
Physical Line("right")  = {2};
Physical Line("top")    = {3};
Physical Line("left")   = {4};

// Physical Surface
Physical Surface("domain") = {1};

// Generate 2D mesh
Recombine Surface{1}; // Turns triangle mesh into quads
Mesh.ElementOrder = 2; // Set quadratic elements 
Mesh 2;
