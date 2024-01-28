import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, model, sky, sunLight, moonLight, ambientLight, skyLight, groundLight, controls;
let angle = Math.PI / 2; // Start at sunrise
let fogActive = false; // Initial state of fog
let fogend = false; // Control fog time
let fogTimer = 0; // Timer for fog effect
const fogMaxDensity = 0.15; // Consistent intensity of the fog
const fogChangeSpeed = 0.001; // Speed at which fog density changes
const fogLikelihood = 0.0015; // Probability of fog appearing per 1 frame
let foglevel = 0;
const skySpeed = 0.5 //
const starSpeed = 0.002; // Moving speed of star
const starTiming = 3; // Smaller number allows you to see stars even in the daytime.
const shootingstarLikelihood = 0.1; // Probability of shooting star appearing per 1 frame
let sandactive = false;

// night sky stars
const starGrade = 5.5;
let hipColor, hipA, hipB, hipArray;
let starsNumber, starSizeArray;
let starPoints;
let lineMeshes = [];

/*
particlesJS("particles-js", {
    particles: {
        number: {
            value: 100,
            density: { enable: true, value_area: 8 }
        },
        color: { value: "#495c52" },
        shape: {
            type: "circle",
        },
        opacity: {
            value: .9,
            random: true,
            anim: { enable: false }
        },
        size: {
            value: 1,
            random: false,
            anim: { enable: false }
        },
        line_linked: { enable: false },
        move: {
            enable: true,
            speed: 1,
            direction: "right",
            random: true,
            straight: false,
            out_mode: "out",
            bounce: false,
        }
    },
    interactivity: {
        events: {
            onhover: { enable: false },
            onclick: { enable: false },
            resize: false
        },
    },
    retina_detect: false
});
*/

let sandParticles;
function createSandParticles() {
    // Create a geometry for the sand particles
    const particleGeometry = new THREE.BufferGeometry();
    const particleMaterial = new THREE.PointsMaterial({
        size: 0.05,
        color: 0xf0dcb4,
        opacity: 1,
        transparent: true,
    });

    // Generate random positions and sizes for the particles
    const particlePositions = [];
    const particleSizes = [];
    const numberOfParticles = 2000;
    const spreadRange = 30;

    for (let i = 0; i < numberOfParticles; i++) {
        const x = (Math.random() - 0.5) * spreadRange;
        const y = Math.random() * 10;
        const z = (Math.random() - 0.5) * spreadRange;

        // Generate random size for each particle
        const size = Math.random() * 0.2 + 0.05;

        particlePositions.push(x, y, z);
        particleSizes.push(size);
    }

    particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('size', new THREE.Float32BufferAttribute(particleSizes, 1));

    // Create the particles object and add it to the scene
    sandParticles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(sandParticles);
}

function animateSandParticles() {
    const particlePositions = sandParticles.geometry.attributes.position.array;
    const numberOfParticles = particlePositions.length / 3;
    const flowSpeed = 0.1; // Adjust the speed of the sandstorm

    for (let i = 0; i < numberOfParticles; i++) {
        // Update the x-coordinate of each particle to simulate horizontal flow
        particlePositions[i * 3] += flowSpeed;

        // Reset particle position if it goes beyond a certain threshold
        if (particlePositions[i * 3] > 15) {
            particlePositions[i * 3] = -15;
        }
    }

    // Update the BufferAttribute with the new positions
    sandParticles.geometry.attributes.position.needsUpdate = true;
}

function clearSandParticles() {
    if (sandParticles) {
        scene.remove(sandParticles);
        sandParticles.geometry.dispose();
        sandParticles.material.dispose();
        sandParticles = null;
        sandactive = false;
    }
}

function init() {
    // Create the scene
    scene = new THREE.Scene();

    // Create the camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 4;
    camera.position.y = 1.5;
    camera.position.x = 2;
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    // Create the renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Load the model
    const loader = new GLTFLoader();
    loader.load('scene.gltf', function (gltf) {
        const model = gltf.scene;
        model.traverse((object) => {
            if (object.name == "Pyramid_01_-_Default_0" || object.name == "Pyramid_02_-_Default_0") {
                object.castShadow = true
                object.receiveShadow = true;
            }
            if (object.name == "Skybox_03_-_Default_0") {
                object.receiveShadow = true;
            }
            if (object.name == "Skybox_07_-_Default_0") {
                object.position.set(0, 0, -2);
                sky = object;
            }
        });
        scene.add(gltf.scene);
    }, undefined, function (error) {
        console.error(error);
    });

    // set up stars
    starPoints = getStarPoints();
    scene.add(starPoints);

    // Set up lighting
    ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Ambient light slightly dim
    scene.add(ambientLight);

    sunLight = new THREE.PointLight(0xffaa00, 200); // Simulate sunlight

    moonLight = new THREE.PointLight(0xffaa00, 100); // Simulate moonlight

    skyLight = new THREE.DirectionalLight(0xffffff, 0); // Initially turned off
    skyLight.position.set(0, -0.01, 0); // Set light direction downwards to illuminate "sky"
    scene.add(skyLight);

    groundLight = new THREE.DirectionalLight(0xffffff, 0.5); // Initially turned on
    groundLight.position.set(0, 0.01, 0); // Set light direction upwards to illuminate "ground"
    scene.add(groundLight);

    // Enable Shadow
    renderer.shadowMap.enabled = true;
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(4096, 4096);
    scene.add(sunLight);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.set(4096, 4096);
    scene.add(moonLight);

    scene.fog = new THREE.FogExp2(0xECD6AB, 0); // Initial density set to 0

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

    // Update the position of the sunlight
    sunLight.position.set(
        Math.cos(angle) * 9.5,
        Math.sin(angle) * 9.5,
        0
    );

    // Update the position of the moonlight
    moonLight.position.set(
        Math.cos(angle + Math.PI) * 9.5,
        Math.sin(angle + Math.PI) * 9.5,
        0
    );

    // Update the position of the sky
    sky.rotation.set(0, 0, angle * skySpeed);

    // Change light color to simulate sunrise and sunset
    const lightColor = new THREE.Color();
    lightColor.setHSL(0.1, 1, (Math.sin(angle) * 0.5 + 0.5));
    sunLight.color = lightColor;

    // Change light color to simulate sunrise and sunset
    const moonColor = new THREE.Color();
    moonColor.setHSL(0.5, 1, (Math.sin(angle + Math.PI) * 0.15 + 0.85));
    moonLight.color = moonColor;

    // Change background color to simulate sky color
    const skyColor = new THREE.Color();
    skyColor.setHSL(0.65, 1, Math.max(0, Math.sin(angle) * 0.5 + 0.6));
    skyLight.color = skyColor;

    // Change background color to simulate ground color
    const groundColor = new THREE.Color();
    groundColor.setHSL(0.55, 0.3, Math.max(0, Math.sin(angle) * 0.2 + 0.7));
    groundLight.color = groundColor;

    if (Math.sin(angle) > 0) {
        // During the day, increase sky / ground light intensity
        skyLight.intensity = 5 + Math.min(15, Math.sin(angle) * 50);
        groundLight.intensity = 5 + Math.min(15, Math.sin(angle) * 5);
    } else {
        // At night, decrease sky / ground light intensity
        skyLight.intensity = 5 + Math.sin(angle) * 3;
        groundLight.intensity = 5 + Math.sin(angle) * 3;
    }

    // night sky
    let fogDensity = scene.fog.density;
    let skyStarOpacity = getStarOpacity(angle, fogDensity);
    // stars rotation
    const earthAxisRad = 1.160644;
    let earthAxis = new THREE.Vector3(0, Math.sin(earthAxisRad), Math.cos(earthAxisRad));
    earthAxis.normalize();
    var starq = new THREE.Quaternion();
    starq.setFromAxisAngle(earthAxis, starSpeed);
    starPoints.quaternion.multiply(starq);

    // star twinkling
    // starPoints.material.opacity = starOpacity;
    const starSizes = starPoints.geometry.attributes.size;
    const starOpacity = starPoints.geometry.attributes.opacity;
    for (let i = 0; i < starSizes.array.length; i++) {
        starSizes.array[i] = starSizeArray[i] * (1 + Math.sin(0.1 * i + angle * 8) / 16);
        starOpacity.array[i] = skyStarOpacity;
    }
    starSizes.needsUpdate = true;
    starOpacity.needsUpdate = true;

    // generate & animate shooting stars
    if (Math.random() < shootingstarLikelihood) {
        let lineMesh = generateShootingStarLine();
        lineMeshes.push(lineMesh);
        scene.add(lineMesh);
    }
    for (let i = 0; i < lineMeshes.length;) {
        lineMeshes[i].material.opacity = skyStarOpacity;
        if (lineMeshes[i].material.uniforms.dashOffset.value >= -0.05 * 30) {
            lineMeshes[i].material.uniforms.dashOffset.value -= 0.05;
            i++
        }
        else {
            scene.remove(lineMeshes[i]);
            lineMeshes.splice(i, 1);
        }
    }
    // night sky end

    // Increase angle to simulate the movement of the sun / moon
    angle += 0.002;

    updateFog();
    

    if (fogDensity > 0.09){
        if (sandactive == false){
            createSandParticles();
            sandactive = true;
        }
        animateSandParticles();
    }else{
        clearSandParticles();
    }

    renderer.render(scene, camera);
}

// Function to update fog effect
function updateFog() {
    if (fogActive) {
        fogTimer -= 1;

        if (fogTimer > 0) {
            if (scene.fog.density < fogMaxDensity) {
                scene.fog.density += fogChangeSpeed;
            } else {
                // Calculate the fluctuation
                let fluctuation = fogMaxDensity + foglevel * fogMaxDensity * Math.sin(fogTimer * 0.03);

                // Apply the fluctuation in a controlled way
                if (Math.abs(scene.fog.density - fluctuation) > fogChangeSpeed) {
                    scene.fog.density += fogChangeSpeed * Math.sign(Math.sin(fogTimer));
                } else {
                    scene.fog.density = fluctuation;
                }
            }
        } else {
            if (scene.fog.density > 0) {
                scene.fog.density -= fogChangeSpeed;
            } else {
                fogActive = false;
            }
        }
    } else {
        if (Math.random() < fogLikelihood) {
            fogActive = true;
            foglevel = Math.random();
            fogTimer = foglevel * 120 + 300;
            scene.fog.density = 0;
        }
    }
}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function readHipparcosCSV() {
    hipColor = getHipparcosCSVdata('./hip_constellation_line_star.csv');
    hipA = getHipparcosCSVdata('./hip_lite_a.csv');
    hipB = getHipparcosCSVdata('./hip_lite_b.csv');
    hipArray = hipA.concat(hipB);

    starsNumber = 0;
    for (let i = 0; i < hipArray.length; i++) {
        if (hipArray[i][8] < starGrade) {
            starsNumber++;
        }
    }

    function getHipparcosCSVdata(url) {
        const xhr = new XMLHttpRequest();
        xhr.open('get', url, false);
        xhr.send();
        const arr = xhr.responseText.split('\n');
        const res = [];
        for (let i = 0; i < arr.length; i++) {
            res[i] = arr[i].split(',');
            for (let j = 0; j < res[i].length; j++) {
                if (res[i][j].match(/\-?\d+(.\d+)?(e[\+\-]d+)?/)) {
                    res[i][j] = parseFloat(res[i][j].replace('"', ''));
                }
            }
        }
        return res;
    }
}

function getStarColor(HIP_Num) {
    // search same HIP number
    for (let i = 0; i < hipColor.length; i++) {
        if (HIP_Num == hipColor[i][0]) {
            const bv = hipColor[i][11]; // B-V color index
            const t = 9000 / (bv + 0.85); // surface temperature

            // chromaticity coordinates
            let c_x, c_y;
            if (1667 <= t && t <= 4000) {
                c_x = -0.2661239 * Math.pow(10, 9) / Math.pow(t, 3) - 0.2343580 * Math.pow(10, 6) / Math.pow(t, 2) + 0.8776956 * Math.pow(10, 3) / t + 0.179910;
            }
            else if (4000 < t && t <= 25000) {
                c_x = -3.0258469 * Math.pow(10, 9) / Math.pow(t, 3) + 2.1070379 * Math.pow(10, 6) / Math.pow(t, 2) + 0.2226347 * Math.pow(10, 3) / t + 0.240390;
            }

            if (1667 <= t && t <= 2222) {
                c_y = -1.1063814 * Math.pow(c_x, 3) - 1.34811020 * Math.pow(c_x, 2) + 2.18555832 * c_x - 0.20219683;
            }
            else if (2222 < t && t <= 4000) {
                c_y = -0.9549476 * Math.pow(c_x, 3) - 1.37418593 * Math.pow(c_x, 2) + 2.09137015 * c_x - 0.16748867;
            }
            else if (4000 < t && t <= 25000) {
                c_y = 3.0817580 * Math.pow(c_x, 3) - 5.87338670 * Math.pow(c_x, 2) + 3.75112997 * c_x - 0.37001483;
            }

            // transform to XYZ coordinates
            const y = 1.0;
            const x = (y / c_y) * c_x;
            const z = (y / c_y) * (1 - c_x - c_y);

            // transform to RGB
            let r = (3.240970 * x) - (1.537383 * y) - (0.498611 * z);
            let g = (-0.969244 * x) + (1.875968 * y) + (0.041555 * z);
            let b = (0.055630 * x) + (0.203977 * y) + (1.056972 * z);

            // color calibration
            const rgbMax = Math.max(r, g, b);
            /*
            if (1 < rgbMax) {
                r = r / rgbMax;
                g = g / rgbMax;
                b = b / rgbMax;
            }
            */
            return [r, g, b];
        }
    }
    return [Math.random() * 0.1 + 0.9, Math.random() * 0.1 + 0.9, Math.random() * 0.1 + 0.9];
}

function getStarPoints() {
    const vertexShader = `
        precision mediump float;
 
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
 
        attribute vec3 position;
        attribute vec3 customColor;
        attribute float size;
        attribute float opacity;
 
        varying vec4 vColor;
 
        void main(){
            vec4 mvPosition = modelViewMatrix * vec4(position,1.0);
            gl_PointSize = size * (1.0 / length(mvPosition.xyz));
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
            vColor = vec4(customColor, opacity);
        }
    `;

    const fragmentShader = `
        precision mediump float;
 
        uniform sampler2D texture;
        varying vec4 vColor;
 
        void main(){
            vec4 texcel = texture2D(texture,gl_PointCoord);
            gl_FragColor = vColor * texcel;
        }
    `;

    // read csv data for stars
    readHipparcosCSV();

    // Set up stars
    const skyRadius = 12.4;
    starSizeArray = [];
    const starGeometry = new THREE.BufferGeometry();
    const starPosition = new Float32Array(starsNumber * 3);
    const starColor = new Float32Array(starsNumber * 3);
    const starSize = new Float32Array(starsNumber);
    const starOpacity = new Float32Array(starsNumber);

    let j = 0;
    for (let i = 0; i < hipArray.length; i++) {
        if (hipArray[i][8] < starGrade) {
            // get right ascension & declination
            const a = (hipArray[i][1] + (hipArray[i][2] + hipArray[i][3] / 60) / 60) * 15 * Math.PI / 180;
            const f = (hipArray[i][4] == 0) ? -1 : 1;
            const c = f * (hipArray[i][5] + (hipArray[i][6] + hipArray[i][7] / 60) / 60) * Math.PI / 180;

            // transform to XYZ coordinates
            starPosition[j * 3] = skyRadius * Math.cos(a) * Math.cos(c);
            starPosition[j * 3 + 1] = skyRadius * Math.sin(a) * Math.cos(c);
            starPosition[j * 3 + 2] = skyRadius * Math.sin(c);

            // set star size
            let size = 1 / hipArray[i][8] * 4;
            const max_size = 3;
            if (max_size < size) size = max_size; // largest size value
            if (hipArray[i][8] < 0) size = max_size;

            starSize[j] = size * 55;
            starSizeArray.push(starSize[j]);
            starOpacity[j] = 1.0;

            // set star color
            let star_rgb = getStarColor(hipArray[i][0]);
            starColor[j * 3] = star_rgb[0];
            starColor[j * 3 + 1] = star_rgb[1];
            starColor[j * 3 + 2] = star_rgb[2];

            j++;
        }
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPosition, 3));
    starGeometry.setAttribute('customColor', new THREE.BufferAttribute(starColor, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(starSize, 1));
    starGeometry.setAttribute('opacity', new THREE.BufferAttribute(starOpacity, 1));

    const starUniforms = { texture: { type: 't', value: new THREE.TextureLoader().load('./textures/star.png') } };
    const starMaterial = new THREE.RawShaderMaterial({
        uniforms: starUniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: true
    });

    let points = new THREE.Points(starGeometry, starMaterial);
    return points;
}

function generateShootingStarLine() {
    // shooting stars
    const radius = 12;
    let theta = Math.random() * Math.PI / 2;
    theta = Math.PI / 2 - Math.random() * Math.PI / 4;
    let phi = Math.random() * Math.PI * 2;
    let direction = new THREE.Vector3(Math.sin(phi + Math.PI / 2), 1, Math.cos(phi + Math.PI / 2));
    direction.normalize();
    const points = [];
    for (let i = 0; i < 10; i++) {
        points.push(new THREE.Vector3(
            radius * Math.sin(theta) * Math.sin(phi) - i * direction.x * 0.5,
            radius * Math.cos(theta) - i * direction.y * 0.5,
            radius * Math.sin(theta) * Math.cos(phi) - i * direction.z * 0.5
        ));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new MeshLine();
    line.setGeometry(geometry);
    const material = new MeshLineMaterial({
        transparent: true,
        lineWidth: 0.02,
        color: new THREE.Color('#FFFFFF'),
        dashArray: 2,
        dashOffset: 0,
        dashRatio: 0.75,
        alphaTest: 0.5,
        opacity: 1.0
    });

    return new THREE.Mesh(line, material);
}

function getStarOpacity(angle, fogDensity) {
    let baseOpacity = -Math.sin(angle) * starTiming + 1;
    if (baseOpacity > 1) baseOpacity = 1;

    const fogEffect = Math.min(fogDensity / 0.05, 1);
    let opacity = baseOpacity * (1 - fogEffect); 

    return opacity;
}

init();
