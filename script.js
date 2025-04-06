let scene, camera, renderer;
let squares = [];
let cameraControls = {
    zoom: 1,
    panX: 0,
    panY: 0,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0
};

// Function to show or hide loading indicator safely
function setLoadingState(isLoading) {
    const loadingElement = document.getElementById('loading-indicator');
    if (loadingElement) {
        loadingElement.style.display = isLoading ? 'block' : 'none';
    }
}

// Initialize the scene
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f4f4);

    // Create camera
    const container = document.getElementById('canvas-container');
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera = new THREE.OrthographicCamera(
        width / -200, width / 200,
        height / 200, height / -200,
        0.1, 1000
    );
    camera.position.z = 10;

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);

    // Make sure loading indicator exists before removing other children
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        // Remove it temporarily
        container.removeChild(loadingIndicator);
    }

    // Clear previous canvas if it exists
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    // Add renderer
    container.appendChild(renderer.domElement);

    // Re-add loading indicator
    if (loadingIndicator) {
        container.appendChild(loadingIndicator);
    }

    // Add event listeners for interaction
    setupEventListeners();

    // Initial render
    animate();
}

// Setup event listeners for zoom and pan
function setupEventListeners() {
    const canvas = renderer.domElement;

    // Mouse wheel for zoom
    canvas.addEventListener('wheel', (event) => {
        event.preventDefault();

        const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
        cameraControls.zoom *= zoomFactor;

        updateCamera();
    });

    // Mouse drag for pan
    canvas.addEventListener('mousedown', (event) => {
        cameraControls.isDragging = true;
        cameraControls.lastMouseX = event.clientX;
        cameraControls.lastMouseY = event.clientY;
    });

    canvas.addEventListener('mousemove', (event) => {
        if (cameraControls.isDragging) {
            const deltaX = event.clientX - cameraControls.lastMouseX;
            const deltaY = event.clientY - cameraControls.lastMouseY;

            cameraControls.panX += deltaX / (100 * cameraControls.zoom);
            cameraControls.panY -= deltaY / (100 * cameraControls.zoom);

            cameraControls.lastMouseX = event.clientX;
            cameraControls.lastMouseY = event.clientY;

            updateCamera();
        }
    });

    canvas.addEventListener('mouseup', () => {
        cameraControls.isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
        cameraControls.isDragging = false;
    });

    // Resize handler
    window.addEventListener('resize', () => {
        const container = document.getElementById('canvas-container');
        const width = container.clientWidth;
        const height = container.clientHeight;

        camera.left = width / -200;
        camera.right = width / 200;
        camera.top = height / 200;
        camera.bottom = height / -200;
        camera.updateProjectionMatrix();

        renderer.setSize(width, height);
    });
}

// Update camera position based on controls
function updateCamera() {
    camera.left = renderer.domElement.width / (-200 * cameraControls.zoom);
    camera.right = renderer.domElement.width / (200 * cameraControls.zoom);
    camera.top = renderer.domElement.height / (200 * cameraControls.zoom);
    camera.bottom = renderer.domElement.height / (-200 * cameraControls.zoom);

    camera.position.x = cameraControls.panX;
    camera.position.y = cameraControls.panY;

    camera.updateProjectionMatrix();
}

// Reset view to initial state
function resetView() {
    cameraControls.zoom = 1;
    cameraControls.panX = 0;
    cameraControls.panY = 0;
    updateCamera();
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// Apply a transformation to a point
function applyTransform(point, coeff) {
    const [x, y] = point;
    const [r, s, theta, phi, e, f] = coeff;

    // Calculate the linear transformation matrix components
    const a = r * Math.cos(theta);
    const b = -s * Math.sin(phi);
    const c = r * Math.sin(theta);
    const d = s * Math.cos(phi);

    // Apply the transformation
    const newX = a * x + b * y + e;
    const newY = c * x + d * y + f;

    return [newX, newY];
}

// Generate transformed squares by applying the IFS iteratively
function generateSquares(ifs, iterations) {
    // Initial unit square centered at origin
    const initialSquare = [[0,0], [1,0], [1,1], [0,1]];
    let squares = [{ points: initialSquare, depth: 0, ruleIndex: 0 }];

    for (let i = 0; i < iterations; i++) {
        const newSquares = [];

        for (const square of squares) {
            for (let j = 0; j < ifs.length; j++) {
                const coeff = ifs[j];
                // Transform each corner of the square
                const transformedPoints = square.points.map(point => applyTransform(point, coeff));
                newSquares.push({
                    points: transformedPoints,
                    depth: i + 1,
                    ruleIndex: j
                });
            }
        }

        squares = newSquares;
    }

    return squares;
}

// Create a color based on the depth or rule index
function getColor(depth, ruleIndex, totalDepth, totalRules, colorMode) {
    if (colorMode === 'mono') {
        return new THREE.Color(0x000000);
    } else if (colorMode === 'depth') {
        // Color based on depth
        const hue = depth / totalDepth;
        return new THREE.Color().setHSL(hue, 0.8, 0.5);
    } else {
        // Color based on rule
        const hue = ruleIndex / totalRules;
        return new THREE.Color().setHSL(hue, 0.8, 0.5);
    }
}

// Generate the fractal and display it
function generateFractal() {
    // Show loading indicator
    setLoadingState(true);

    // Clear previous geometry
    scene.clear();

    // Add coordinate axes (NEW CODE)
    const axesSize = 1000; // Large enough to remain visible during pan/zoom
    const axesMat = new THREE.LineBasicMaterial({ 
        color: 0x444444,
        depthTest: false  // Ensures axes stay visible
    });
    
    // X-axis (red)
    const xAxis = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-axesSize, 0, 0),
            new THREE.Vector3(axesSize, 0, 0)
        ]),
        axesMat
    );
    scene.add(xAxis);

    // Y-axis (green)
    const yAxis = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, -axesSize, 0),
            new THREE.Vector3(0, axesSize, 0)
        ]),
        axesMat
    );
    scene.add(yAxis);

    // Get parameters from UI
    const ifsParamsText = document.getElementById('ifs-params-std').value;
    const iterations = parseInt(document.getElementById('iterations').value);
    const colorMode = document.getElementById('color-mode').value;

    // Parse IFS parameters
    const ifs = [];
    const lines = ifsParamsText.trim().split('\n');

    for (const line of lines) {
        const params = line.trim().split(/\s+/).map(parseFloat);
        if (params.length === 6) {
            ifs.push(params);
        }
    }

    if (ifs.length === 0) {
        alert("No valid IFS parameters provided.");
        setLoadingState(false);
        return;
    }

    const numRules = ifs.length;
    const totalSquares = Math.pow(numRules, iterations);
    const maxAllowedSquares = 50000; // Adjust this threshold as needed

    if (totalSquares > maxAllowedSquares) {
        alert(`Error: The requested parameters would generate ${totalSquares} squares, exceeding the maximum limit of ${maxAllowedSquares}. Reduce the number of iterations or IFS rules.`);
        setLoadingState(false);
        return;
    }


    // Generate squares with async to not block UI
    setTimeout(() => {
        try {
            const squares = generateSquares(ifs, iterations);

            // Create meshes for each square
            for (const square of squares) {
                const shape = new THREE.Shape();

                // Create shape from points
                const [first, ...rest] = square.points;
                shape.moveTo(first[0], first[1]);

                for (const point of rest) {
                    shape.lineTo(point[0], point[1]);
                }

                shape.lineTo(first[0], first[1]);

                // Create geometry from shape
                const geometry = new THREE.ShapeGeometry(shape);

                // Create material with appropriate color
                const color = getColor(square.depth, square.ruleIndex, iterations, ifs.length, colorMode);
                const material = new THREE.MeshBasicMaterial({
                    color: color,
                    wireframe: true,
                    transparent: true,
                    opacity: 0.8
                });

                // Create mesh and add to scene
                const mesh = new THREE.Mesh(geometry, material);
                scene.add(mesh);
            }
        } catch (error) {
            console.error("Error generating fractal:", error);
            alert("Error generating fractal. Check your parameters and try again.");
        }

        // Hide loading indicator
        setLoadingState(false);
    }, 10);
}

// Load preset IFS parameters
function loadPreset(preset) {
    let params = '';

    switch (preset) {
        case 'sierpinski':
            params = 
`0.5 0.5 0 0 0 0
0.5 0.5 0 0 0.5 0
0.5 0.5 0 0 0.25 0.433`;
            document.getElementById('iterations').value = 6;
            break;
        case 'carpet':
            params = 
`0.333 0.333 0 0 0 0
0.333 0.333 0 0 0.333 0
0.333 0.333 0 0 0.667 0
0.333 0.333 0 0 0 0.333
0.333 0.333 0 0 0.667 0.333
0.333 0.333 0 0 0 0.667
0.333 0.333 0 0 0.333 0.667
0.333 0.333 0 0 0.667 0.667`;
            document.getElementById('iterations').value = 4;
            break;
    }

    document.getElementById('ifs-params-std').value = params;
    generateFractal();
}

// New function to generate Driven IFS points
function generateDrivenIFS(ifs, sequence, initialPoint = [0.5, 0.5]) {
    const points = [initialPoint];
    let currentPoint = [...initialPoint];
    
    // Apply each transformation in the sequence
    for (let i = 0; i < sequence.length; i++) {
        const ruleIndex = sequence[i] - 1; // Convert 1-based to 0-based index
        
        // Skip invalid indices
        if (ruleIndex < 0 || ruleIndex >= ifs.length) {
            console.warn(`Invalid rule index ${ruleIndex + 1} in sequence. Skipping.`);
            continue;
        }
        
        // Apply the transformation
        currentPoint = applyTransform(currentPoint, ifs[ruleIndex]);
        points.push([...currentPoint]);
    }
    
    return points;
}

// Function to render Driven IFS points
function renderDrivenIFS() {
    // Show loading indicator
    setLoadingState(true);
    
    // Clear previous geometry
    scene.clear();
    
    // Add coordinate axes
    const axesSize = 1000;
    const axesMat = new THREE.LineBasicMaterial({ 
        color: 0x444444,
        depthTest: false
    });
    
    // X-axis
    const xAxis = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-axesSize, 0, 0),
            new THREE.Vector3(axesSize, 0, 0)
        ]),
        axesMat
    );
    scene.add(xAxis);

    // Y-axis
    const yAxis = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, -axesSize, 0),
            new THREE.Vector3(0, axesSize, 0)
        ]),
        axesMat
    );
    scene.add(yAxis);

    // Get parameters from UI
    const ifsParamsText = document.getElementById('ifs-params-driven').value;
    const pointSize = parseFloat(document.getElementById('point-size').value) || 0.005;
    const pointColor = document.getElementById('point-color').value || '#FF0000';
    
    // Parse IFS parameters
    const ifs = [];
    const lines = ifsParamsText.trim().split('\n');

    for (const line of lines) {
        const params = line.trim().split(/\s+/).map(parseFloat);
        if (params.length === 6) {
            ifs.push(params);
        }
    }

    if (ifs.length === 0) {
        alert("No valid IFS parameters provided.");
        setLoadingState(false);
        return;
    }
    
    // Get sequence - either from input or generate random sequence
    let sequence = [];
    const useRandomSequence = document.getElementById('use-random-sequence').checked;
    
    if (useRandomSequence) {
        // Generate random sequence
        const numPoints = parseInt(document.getElementById('random-points-count').value) || 1000;
        const maxRuleIndex = ifs.length;
        
        if (numPoints > 10000) {
            alert(`Error: The requested number of points (${numPoints}) exceeds the maximum limit of 100,000.`);
            setLoadingState(false);
            return;
        }
        
        sequence = Array.from({length: numPoints}, () => Math.floor(Math.random() * maxRuleIndex) + 1);
    } else {
        // Use custom sequence from input
        const sequenceText = document.getElementById('driven-sequence').value;
        sequence = sequenceText.trim().split(/\s*,\s*|\s+/).map(num => parseInt(num));
    }
    
    if (sequence.length === 0) {
        alert("No valid sequence provided.");
        setLoadingState(false);
        return;
    }
    
    const maxPoints = 10000; // Limit for performance
    if (sequence.length > maxPoints) {
        alert(`Error: The sequence contains ${sequence.length} steps, exceeding the maximum limit of ${maxPoints}.`);
        setLoadingState(false);
        return;
    }

    // Generate points with async to not block UI
    setTimeout(() => {
        try {
            // Get initial point
            let initialX = 0.5;
            let initialY = 0.5;
            const initialPoint = [initialX, initialY];
            
            const points = generateDrivenIFS(ifs, sequence, initialPoint);
            
            // Draw points
            // Create circles for each point
            points.forEach(point => {
                const circleGeometry = new THREE.CircleGeometry(pointSize, 32);
                const circleMaterial = new THREE.MeshBasicMaterial({ 
                    color: new THREE.Color(pointColor),
                    side: THREE.DoubleSide
                });
                const circle = new THREE.Mesh(circleGeometry, circleMaterial);
                
                // Position the circle
                circle.position.set(point[0], point[1], 0);
                
                scene.add(circle);
            });
            
            // Draw the starting square for reference
            const squareGeometry = new THREE.BufferGeometry();
            
            // Define the corners of the square
            const vertices = new Float32Array([
                0, 0, 0,  // Start of first line
                1, 0, 0,  // End of first line
                1, 0, 0,  // Start of second line
                1, 1, 0,  // End of second line
                1, 1, 0,  // Start of third line
                0, 1, 0,  // End of third line
                0, 1, 0,  // Start of fourth line
                0, 0, 0   // End of fourth line
            ]);
            
            squareGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
            
            const squareMaterial = new THREE.LineBasicMaterial({
                color: 0x000000,
                opacity: 0.3,
                transparent: true
            });
            
            const squareMesh = new THREE.LineSegments(squareGeometry, squareMaterial);
            scene.add(squareMesh);
            
        } catch (error) {
            console.error("Error generating driven IFS:", error);
            alert("Error generating driven IFS. Check your parameters and try again.");
        }

        // Hide loading indicator
        setLoadingState(false);
    }, 10);
}

function toggleSequenceInputs() {
    const useRandomSequence = document.getElementById('use-random-sequence').checked;
    document.getElementById('custom-sequence-container').style.display = useRandomSequence ? 'none' : 'block';
    document.getElementById('random-sequence-container').style.display = useRandomSequence ? 'block' : 'none';
}

// Load preset IFS parameters specific for Driven IFS
function loadDrivenPreset(preset) {
    let params = '';
    let sequence = '';
    
    switch (preset) {
        case 'chaos-game':
            params =
`0.5 0.5 0 0 0 0
0.5 0.5 0 0 0.5 0
0.5 0.5 0 0 0.25 0.433`;
            // Generate a random sequence
            sequence = Array.from({length: 10000}, () => Math.floor(Math.random() * 4) + 1).join(', ');
            break;
        case 'right-sierpinski':
            params = 
`0.5 0.5 0 0 0 0
0.5 0.5 0 0 1 0
0.5 0.5 0 0 1 1
0.5 0.5 0 0 0 1`
            sequence = Array.from({length: 10000}, () => Math.floor(Math.random() * 3) + 1).join(', ');
            break;
    }

    document.getElementById('ifs-params-driven').value = params;
    document.getElementById('driven-sequence').value = sequence;
    renderDrivenIFS();
}

// Update the window.onload function to initialize both modes
window.onload = function () {
    init();
    // Setup tab functionality
    document.getElementById('standard-tab').addEventListener('click', function() {
        document.getElementById('standard-controls').style.display = 'block';
        document.getElementById('driven-controls').style.display = 'none';
        this.classList.add('active-tab');
        document.getElementById('driven-tab').classList.remove('active-tab');
    });
    
    document.getElementById('driven-tab').addEventListener('click', function() {
        document.getElementById('standard-controls').style.display = 'none';
        document.getElementById('driven-controls').style.display = 'block';
        this.classList.add('active-tab');
        document.getElementById('standard-tab').classList.remove('active-tab');
    });
    
    // Setup sequence input toggling
    document.getElementById('use-random-sequence').addEventListener('change', toggleSequenceInputs);
    toggleSequenceInputs(); // Initial setup
    
    setTimeout(generateFractal, 100); // Start with standard IFS
};

// Function to download the current fractal as an image
function downloadFractal() {
    try {
        // Render the scene (ensures latest state is captured)
        renderer.render(scene, camera);
        
        // Convert the canvas to a data URL
        const dataURL = renderer.domElement.toDataURL('image/png');
        
        // Create a temporary link element
        const downloadLink = document.createElement('a');
        downloadLink.href = dataURL;
        
        // Set the filename
        const activeTab = document.querySelector('.tab-button.active-tab').id;
        const fractalType = activeTab === 'standard-tab' ? 'Standard' : 'Driven';
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        downloadLink.download = `Fractal-${fractalType}-${timestamp}.png`;
        
        // Append to the body, click it, and remove it
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
    } catch (error) {
        console.error("Error downloading fractal:", error);
        alert("Failed to download the image. Please try again.");
    }
}

// // Initialize the app when page loads
// window.onload = function () {
//     init();
//     setTimeout(generateFractal, 100); // Small delay to ensure DOM is fully loaded
// };