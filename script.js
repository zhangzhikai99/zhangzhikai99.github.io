import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';




let scene, camera, renderer, sunLight, ambientLight, skyLight, controls;

function init() {
    // Create the scene
    scene = new THREE.Scene();

    // Create the camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;
    camera.position.y = 1;
    camera.position.x = 1;

    // Create the renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Load the model
    const loader = new GLTFLoader();
    loader.load('scene.gltf', function (gltf) {
        gltf.scene.traverse(function (node) {
            if (node.isMesh) {
                // 假设使用的是MeshStandardMaterial
                const material = node.material;
    
                // 调整材质属性
                material.metalness = 0; // 调整金属感
    
                // 重新分配材质以确保更新
                node.material = material;
            }
        });
        scene.add(gltf.scene);
    }, undefined, function (error) {
        console.error(error);
    });
    

    ambientLight = new THREE.AmbientLight(0xffffff, 4);
    scene.add(ambientLight);

    sunLight = new THREE.DirectionalLight(0xffffff, 1); // Simulate sunlight
    scene.add(sunLight);

    skyLight = new THREE.DirectionalLight(0xffffff, 2); // Initially turned off
    skyLight.position.set(0, -1, 0); // Set light direction downwards to illuminate "sky"
    scene.add(skyLight);

    // Initialize OrbitControls
    controls = new OrbitControls(camera, renderer.domElement);

    // Set parameters for the controller (optional)
    controls.enableDamping = true; // Enable damping (inertia) for a smoother control experience
    controls.dampingFactor = 0.05;

    // Add a listener for window resize
    window.addEventListener('resize', onWindowResize, false);

    // Start the rendering loop
    animate();
}

function animate() {
    requestAnimationFrame(animate);

    // Update the controller
    controls.update();

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
