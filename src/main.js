import * as THREE from "three";

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 1);
document.getElementById("canvas-container").appendChild(renderer.domElement);

// Raycaster for mouse interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Animation variables
let mouseX = 0;
let mouseY = 0;
let cameraTargetX = 0;
let cameraTargetY = 0;
let scrollSpeed = 1;
let baseScrollSpeed = 1;
let scrollProgress = 0;
let hoveredObject = null;

// Intro animation variables
let introProgress = 0;
let introComplete = false;
const introDuration = 2; // 3 seconds for intro animation
const introStartZ = 300; // Start camera far away
const introEndZ = 25; // End at normal position

// Array to store all objects
const objects = [];

// Starfield
let starfield = null;

// Create starfield background
function createStarfield() {
  const starGeometry = new THREE.BufferGeometry();
  const starCount = 500; // Number of stars
  const positions = new Float32Array(starCount * 3); // x, y, z for each star
  const colors = new Float32Array(starCount * 3); // r, g, b for each star
  const sizes = new Float32Array(starCount); // size for each star

  // Generate random star positions
  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3;

    // Random positions in a large sphere around the scene
    const radius = 200 + Math.random() * 100; // Distance from center
    const theta = Math.random() * Math.PI * 2; // Horizontal angle
    const phi = Math.random() * Math.PI; // Vertical angle

    positions[i3] = radius * Math.sin(phi) * Math.cos(theta); // x
    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta); // y
    positions[i3 + 2] = radius * Math.cos(phi); // z

    // Random colors (mostly white, some with slight color tint)
    const colorVariation = Math.random();
    if (colorVariation > 0.9) {
      // 10% of stars have color tint
      colors[i3] = 0.8 + Math.random() * 0.2; // r
      colors[i3 + 1] = 0.8 + Math.random() * 0.2; // g
      colors[i3 + 2] = 1.0; // b (bluish tint)
    } else {
      // 90% pure white
      colors[i3] = 1.0;
      colors[i3 + 1] = 1.0;
      colors[i3 + 2] = 1.0;
    }

    // Random sizes
    sizes[i] = Math.random() * 2 + 0.5; // Size between 0.5 and 2.5
  }

  // Add attributes to geometry
  starGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3)
  );
  starGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  starGeometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

  // Create material for stars
  const starMaterial = new THREE.PointsMaterial({
    size: 1,
    vertexColors: true, // Use colors from geometry
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true, // Stars get smaller with distance
    blending: THREE.AdditiveBlending, // Makes stars glow
  });

  // Create the star system
  starfield = new THREE.Points(starGeometry, starMaterial);
  scene.add(starfield);
}

// Create evenly distributed objects with consistent sizes
function createObjects() {
  const objectTypes = [
    { geometry: new THREE.BoxGeometry(1, 1, 1), name: "Cube" },
    { geometry: new THREE.ConeGeometry(0.6, 1.2, 4), name: "Pyramid" },
    { geometry: new THREE.OctahedronGeometry(0.8), name: "Octahedron" },
    { geometry: new THREE.TetrahedronGeometry(0.8), name: "Tetrahedron" },
  ];

  // Create objects in a more evenly distributed pattern
  const objectCount = 69; // Total number of objects

  for (let i = 0; i < objectCount; i++) {
    const objectType =
      objectTypes[Math.floor(Math.random() * objectTypes.length)];

    // Create wireframe material
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.8,
    });

    const mesh = new THREE.Mesh(objectType.geometry, material);

    // More evenly distributed positions
    const angle = (i / objectCount) * Math.PI * 2;
    const radius = 15 + (i % 3) * 8; // Varying distance from center
    const height = Math.sin(i * 0.7) * 10 + (Math.random() - 0.5) * 5;

    mesh.position.x = Math.cos(angle) * radius + (Math.random() - 0.5) * 6;
    mesh.position.y = height;
    mesh.position.z = Math.sin(angle) * radius + (Math.random() - 0.5) * 6;

    // Ensure objects are visible from multiple angles
    if (i < objectCount / 2) {
      // First half on one side
      mesh.position.x =
        Math.abs(mesh.position.x) * (Math.random() > 0.5 ? 1 : -1);
    } else {
      // Second half on the other side
      mesh.position.x =
        Math.abs(mesh.position.x) * (Math.random() > 0.5 ? -1 : 1);
    }

    // Random rotation
    mesh.rotation.x = Math.random() * Math.PI * 2;
    mesh.rotation.y = Math.random() * Math.PI * 2;
    mesh.rotation.z = Math.random() * Math.PI * 2;

    // Larger, more consistent scale
    const scale = 1.5 + Math.random() * 0.8; // Bigger objects at start
    mesh.scale.set(scale, scale, scale);

    // Store additional properties
    mesh.userData = {
      originalPosition: mesh.position.clone(),
      basePosition: mesh.position.clone(),
      rotationSpeed: {
        x: (Math.random() - 0.5) * 0.015,
        y: (Math.random() - 0.5) * 0.015,
        z: (Math.random() - 0.5) * 0.015,
      },
      floatOffset: Math.random() * Math.PI * 2,
      originalColor: 0xffffff,
      hoverColor: [0xff0080, 0x00ff80, 0x8000ff, 0xff8000, 0x0080ff, 0x80ff00][
        Math.floor(Math.random() * 6)
      ],
      type: objectType.name,
    };

    scene.add(mesh);
    objects.push(mesh);
  }
}

// Mouse move handler
function onMouseMove(event) {
  mouseX = (event.clientX / window.innerWidth) * 2 - 1;
  mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

  mouse.x = mouseX;
  mouse.y = mouseY;

  cameraTargetX = mouseX * 3;
  cameraTargetY = mouseY * 3;
}

// Scroll handler for page content
function onScroll() {
  const maxScroll = document.body.scrollHeight - window.innerHeight;
  const currentScroll = window.pageYOffset;
  scrollProgress = Math.min(currentScroll / maxScroll, 1);

  // Update scroll speed for temporary boost
  baseScrollSpeed = 1 + scrollProgress * 1.5;

  // Gradual speed increase
  scrollSpeed = baseScrollSpeed;

  // Update UI
  document.getElementById("scroll-progress").textContent =
    Math.round(scrollProgress * 100) + "%";
    
  // Update scroll progress bar
  const progressBar = document.getElementById("scroll-progress-bar");
  progressBar.style.height = scrollProgress * 100 + "%";
}

// Wheel handler for additional rotation boost
function onWheel(event) {
  scrollSpeed = baseScrollSpeed + Math.abs(event.deltaY) * 0.002;

  // Gradually return to base speed
  setTimeout(() => {
    scrollSpeed = baseScrollSpeed;
  }, 200);
}

// Hover detection
function checkHover() {
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(objects);

  // Reset previously hovered object
  if (
    hoveredObject &&
    hoveredObject !== (intersects[0] ? intersects[0].object : null)
  ) {
    hoveredObject.material.color.setHex(hoveredObject.userData.originalColor);
    hoveredObject = null;
  }

  // Set new hovered object
  if (intersects.length > 0) {
    const object = intersects[0].object;
    if (object !== hoveredObject) {
      hoveredObject = object;
      object.material.color.setHex(object.userData.hoverColor);
      document.getElementById("hovered-object").textContent =
        object.userData.type;
    }
  } else {
    document.getElementById("hovered-object").textContent = "None";
  }
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Intro animation (camera moving from far to near)
  if (!introComplete) {
    introProgress += 0.016 / introDuration; // Increment based on ~60fps
    introProgress = Math.min(introProgress, 1);

    // Easing function for smooth intro (ease-out cubic)
    const easeProgress = 1 - Math.pow(1 - introProgress, 3);

    // Move camera from far (introStartZ) to near (introEndZ)
    camera.position.z = introStartZ - (introStartZ - introEndZ) * easeProgress;

    // Mark intro as complete
    if (introProgress >= 1) {
      introComplete = true;
    }

    // During intro, just look at center
    camera.lookAt(0, 0, 0);
  } else {
    // Normal camera animation after intro
    camera.position.x += (cameraTargetX - camera.position.x) * 0.05;
    camera.position.y += (cameraTargetY - camera.position.y) * 0.05;

    // Camera moves forward as user scrolls
    const targetZ = 25 - scrollProgress * 15; // Move from 25 to 10
    camera.position.z += (targetZ - camera.position.z) * 0.1;

    camera.lookAt(0, 0, 0);
  }

  // Animate objects
  const time = Date.now() * 0.001;

  // Slowly rotate starfield for parallax effect
  if (starfield) {
    starfield.rotation.y += 0.0002;
    starfield.rotation.x += 0.0001;
  }

  const twinkle = Math.sin(time * 2) * 0.2 + 0.8;
  starfield.material.opacity = twinkle; // Stars fade in/out

  objects.forEach((object, index) => {
    // Rotate objects with scroll-influenced speed
    object.rotation.x += object.userData.rotationSpeed.x * scrollSpeed;
    object.rotation.y += object.userData.rotationSpeed.y * scrollSpeed;
    object.rotation.z += object.userData.rotationSpeed.z * scrollSpeed;

    // Floating motion
    const floatY = Math.sin(time + object.userData.floatOffset) * 0.8;
    const floatX = Math.cos(time * 0.7 + object.userData.floatOffset) * 0.5;
    const floatZ = Math.sin(time * 0.5 + object.userData.floatOffset) * 0.6;

    // Base position with floating animation
    object.position.x = object.userData.basePosition.x + floatX;
    object.position.y = object.userData.basePosition.y + floatY;
    object.position.z = object.userData.basePosition.z + floatZ;

    // Move objects forward in Z direction only (towards camera)
    const forwardMovement = scrollProgress * 25; // How much to move forward in Z
    object.position.z += forwardMovement; // Simply add to Z position
  });

  checkHover();

  // Update UI
  document.getElementById("object-count").textContent = objects.length;
  document.getElementById("scroll-speed").textContent =
    scrollSpeed.toFixed(1) + "x";

  renderer.render(scene, camera);
}

// Event listeners
window.addEventListener("mousemove", onMouseMove);
window.addEventListener("scroll", onScroll);
window.addEventListener("wheel", onWheel);

// Handle window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize
camera.position.z = introStartZ; // Start camera far away
camera.position.x = 0;
camera.position.y = 0;

createStarfield(); // Create stars first (background layer)
createObjects(); // Then create main objects

// Start animation
animate();

// Trigger fade-out after a short delay
setTimeout(() => {
  document.getElementById("fade-overlay").classList.add("fade-out");
}, 100);

// Keyboard controls
window.addEventListener("keydown", (event) => {
  switch (event.key) {
    case "r":
    case "R":
      scrollProgress = 0;
      window.scrollTo(0, 0);
      break;
  }
});
