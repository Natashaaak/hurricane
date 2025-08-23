import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ViewHelper } from "./ViewHelper.js";
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js'
import { CutPlane} from "./CutPlane.js";
import { Streamlines } from "./streamlines.js";
import {SpriteManager} from "./SpriteManager.js";

let scene, uiScene, camera, orthoCamera, renderer, controls, helper, font;

const fontPath = './data/helvetiker_regular.typeface.json';

function main() {
    init();
    initScene();
    initLoop();
}

function init() {
    // Scene
    scene = new THREE.Scene();
    uiScene = new THREE.Scene();
    // Cameras
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.6, 5000);
    camera.position.set(400,400,550); // Set camera position
    camera.up.set(0,0,1);
    orthoCamera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 1, 2 );
    orthoCamera.position.set( 0, 0, 1 );
    // Renderer
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.autoClear = false;
    renderer.setClearColor("#233143"); // Set background colour
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement); // Add renderer to HTML as a canvas element

    // Make Canvas Responsive
    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight); // Update size
        camera.aspect = window.innerWidth / window.innerHeight; // Update aspect ratio
        camera.updateProjectionMatrix(); // Apply changes
    })

    //Trackball Controls for Camera
    controls = new OrbitControls(camera, renderer.domElement);
    controls.rotateSpeed = 4;
    controls.dynamicDampingFactor = 0.15;
    controls.minDistance = 5;
    controls.maxDistance = 1500;
    controls.target.set(250,250,0);
    
    // Add constraints to prevent movement below z=0
    controls.minPolarAngle = 0; // Prevent camera from going below horizontal
    controls.maxPolarAngle = Math.PI; // Allow full rotation above horizontal
    
    // Enhanced touch controls
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.screenSpacePanning = false;
    
    // Touch-friendly settings
    controls.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN
    };
    
    controls.update();
}

// Function to constrain camera position to prevent going below z=0
function constrainCameraZ() {
    // Constrain camera position
    if (camera.position.z < 0) {
        camera.position.z = 0;
    }
    
    // Constrain camera target to prevent looking below z=0
    if (controls.target.z < 0) {
        controls.target.z = 0;
    }
}

function initScene() {
    const gui = new GUI ( { title: 'Controls' } );
    const streamlineLegend = new THREE.Group();
    initEarthTexture(gui);
    initFont().then(() => {
        new CutPlane(scene, uiScene, gui, font, streamlineLegend);
        new Streamlines(scene, uiScene, gui, font, spriteTornado, streamlineLegend);
    });
    const spriteTornado = new SpriteManager(scene, camera);

    // Data borders
    const lineM = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true, opacity: 0.3
    });
    const points = [];
    points.push( new THREE.Vector3( 0, 0, 0 ) );
    points.push( new THREE.Vector3( 500, 0, 0 ) );
    points.push( new THREE.Vector3( 500, 500, 0 ) );
    points.push( new THREE.Vector3( 0, 500, 0 ) );
    points.push( new THREE.Vector3( 0, 0, 0 ) );
    points.push( new THREE.Vector3( 0, 0, 100 ) );
    points.push( new THREE.Vector3( 100, 0, 100 ) );
    points.push( new THREE.Vector3( 0, 0, 100 ) );
    points.push( new THREE.Vector3( 0, 100, 100 ) );

    const lineG = new THREE.BufferGeometry().setFromPoints( points );

    const line = new THREE.Line( lineG, lineM );
    scene.add( line );

    helper = new ViewHelper( camera, renderer.domElement );
}

function initFont() {
    if (font) return Promise.resolve(font); // already loaded

    return new Promise((resolve, reject) => {
        new FontLoader().load(fontPath, (f) => {
            font = f;
            resolve(f);
        }, undefined, reject);
    });
}

function initLoop() {
    // Rerender every time the page refreshes (pause when on another tab)
    requestAnimationFrame(initLoop);

    // Constrain camera to prevent movement below z=0
    constrainCameraZ();

    // Update trackball controls
    controls.update();
    renderer.clear();
    renderer.render(scene, camera);
    renderer.render( uiScene, orthoCamera );
    helper.render( renderer );
}

function initEarthTexture(gui){
    // Earth texture
    const loader = new THREE.TextureLoader();
    const earthTexture = loader.load('data/8k_earth_daymap_small.jpg');
    const countString = document.querySelector('.loadedFiles')
    countString.textContent = Number(countString.textContent) + 1;
    const geometry = new THREE.PlaneGeometry(1000, 1000, 1, 1);
    const material = new THREE.MeshBasicMaterial({ map: earthTexture, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(geometry, material);
    plane.position.set(250, 250, -1);
    plane.rotation.z = 0.5*Math.PI;
    scene.add(plane);

    // adjust u and v
    const uvControls = {
        show: plane.visible,
        uOffset: 0.482,
        vOffset: 0.575,
        uScale: 0.223,
        vScale: 0.216
    };

    const uvs = geometry.attributes.uv;
    for (let i = 0; i < uvs.count; i++) {
        const u = uvs.getX(i);
        const v = uvs.getY(i);
        uvs.setXY(i, u * uvControls.uScale + uvControls.uOffset, v * uvControls.vScale + uvControls.vOffset);
    }
    uvs.needsUpdate = true;

    gui.add(uvControls, 'show').name('Show bottom').onChange((val) => {
        plane.visible = val;
    })
}

main();
