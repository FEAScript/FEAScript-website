// 2D rhomboid: 4 m (base width) x 2 m (height), top edge shifted by dx
// Generate the mesh with: gmsh rhom.geo -2 -format msh41 -o rhom_quad_quadratic.msh

// 1. Mesh size and shape
lc = 0.7; // Characteristic length
dx = 1.0; // Horizontal shift of the top edge (sets the rhomboid angle)

// 2. Points (x, y, z, mesh size)
Point(1) = {0,      0, 0, lc}; // Bottom left
Point(2) = {4,      0, 0, lc}; // Bottom right
Point(3) = {4 + dx, 2, 0, lc}; // Top right (shifted)
Point(4) = {dx,     2, 0, lc}; // Top left (shifted)

// 3. Lines and surface
Line(1) = {1, 2};            // Bottom
Line(2) = {2, 3};            // Right
Line(3) = {3, 4};            // Top
Line(4) = {4, 1};            // Left
Line Loop(1) = {1, 2, 3, 4}; // Closed boundary
Plane Surface(1) = {1};      // Domain

// 4. Physical groups: FEAScript keys the boundary conditions by these names
Physical Line("bottom", 1) = {1};    // FEAScript boundary "bottom"
Physical Line("left", 2)   = {4};    // FEAScript boundary "left"
Physical Line("top", 3)    = {3};    // FEAScript boundary "top"
Physical Line("right", 4)  = {2};    // FEAScript boundary "right"
Physical Surface("domain", 5) = {1}; // Domain

// 5. Mesh
Recombine Surface{1};  // Quadrilaterals instead of triangles
Mesh.ElementOrder = 2; // Quadratic elements
Mesh 2;
