import { readFile } from "./fileReader";
import * as THREE from "../node_modules/three/build/three.module.js";
import { StreamlineTubeGeometry } from "./StreamlineTube.js";
import { Lut } from '../node_modules/three/examples/jsm/math/Lut.js'
import {generateSprite, createTitle, placeText} from "./legendUtils";
import { objectPool } from "./ObjectPool.js";

const fileNameY = 'data/Vf25_2_interp.bin';
const fileNameZ = 'data/Wf25_2_interp.bin';
const fileNameX = 'data/Uf25_2_interp.bin';

const lut = new Lut('grayscale', 512);
let numIterations = 300;
let numStreamlines = 750;
let scaleFactor = 0.03;
let radiusScaleFactor = 0.014;
let seedPositionRatio = 5/100;
let computingStreamlines = 0;
let sizeX = 250;
let sizeY = 250;
let sizeZ = 100;
let hurricaneEye = new THREE.Vector3 ( 138, 120, 0 );
let hurricaneEyeCylinderRadius = 25;

const maxNumStreamlines = 5000;
const maxNumIterations = 1000;

// Pre-allocated vectors for interpolation
const tempVector1 = new THREE.Vector3();
const tempVector2 = new THREE.Vector3();
const tempVector3 = new THREE.Vector3();
const tempVector4 = new THREE.Vector3();
const tempVector5 = new THREE.Vector3();
const tempVector6 = new THREE.Vector3();
const tempVector7 = new THREE.Vector3();
const tempVector8 = new THREE.Vector3();
const tempVector9 = new THREE.Vector3();
const tempVector10 = new THREE.Vector3();
const tempVector11 = new THREE.Vector3();
const tempVector12 = new THREE.Vector3();
const tempVector13 = new THREE.Vector3();
const tempVector14 = new THREE.Vector3();
const tempVector15 = new THREE.Vector3();
const tempVector16 = new THREE.Vector3();
const tempVector17 = new THREE.Vector3();
const tempVector18 = new THREE.Vector3();
const tempVector19 = new THREE.Vector3();
const tempVector20 = new THREE.Vector3();

class Streamlines {
    constructor(scene, uiScene, gui, font, spriteTornado, uiGroup) {
        console.log('ฅ^•ﻌ•^ฅ');

        this.spriteTornado = spriteTornado;
        this.gui = gui;
        this.scene = scene;
        this.uiGroup = uiGroup;
        this.uiGroup.visible = true;
        this.uiGroup.position.set(0.01,0,0);
        this.uiScene = uiScene;
        this.uiScene.add ( this.uiGroup );
        this.streamlineGroup = new THREE.Group();
        this.streamlineGroup.scale.set(2,2,1);
        this.scene.add ( this.streamlineGroup );
        this.geometryGroup = new THREE.Group();
        this.streamlineGroup.add ( this.geometryGroup );
        this.streamlineGroup.visible = true;
        this.font = font;

        readFile(fileNameX).then(floatArray => {
            this.X = floatArray;
            console.log ( "X data loaded" );
            const countString = document.querySelector('.loadedFiles');
            countString.textContent = Number(countString.textContent) + 1;

            readFile(fileNameY).then(floatArray => {
                this.Y = floatArray;
                console.log ( "Y data loaded" );
                countString.textContent = Number(countString.textContent) + 1;

                readFile(fileNameZ).then(floatArray => {
                    this.Z = floatArray;
                    console.log ( "Z data loaded" );

                    this.initGUI();
                    this.redrawStreamlines();
                });
            });
        });
    }

    initGUI() {
        const folder = this.gui.addFolder ( 'Streamlines' )

        let params = {
            switch: this.streamlineGroup.visible,
            count: numStreamlines,
            iterations: numIterations,
            factor: scaleFactor,
            radiusFactor: radiusScaleFactor,
            seedRatio: seedPositionRatio
        };
        folder.add(params, "switch").name("Show streamlines").onChange(val =>{
            this.streamlineGroup.visible = val;
            this.uiGroup.visible = val;
        })

        folder.add(params, "count", 0, maxNumStreamlines).step(10).name('Count').onChange(val => {
            numStreamlines = val;
            this.redrawStreamlines();
        });

        folder.add(params, "seedRatio", 0, 1).name('Seed position ratio').onChange(val => {
            seedPositionRatio = val;
            this.redrawStreamlines();
        });

        folder.add(params, "iterations", 0, maxNumIterations).name('Iterations').onChange(val => {
            numIterations = val;
            this.redrawStreamlines();
        });

        folder.add(params, "factor", 0.001, 0.1).name('Step length factor').onChange(val => {
            scaleFactor = val;
            this.redrawStreamlines();
        });

        folder.add(params, "radiusFactor", 0, 0.1).step(0.001).name('Radius factor').onChange(val => {
            radiusScaleFactor = val;
            this.redrawStreamlines();
            });
    }

    redrawStreamlines(){
        document.querySelector(".infoBox").hidden = false;
        document.querySelector(".infoBox").textContent = 'Computing streamlines.';
        if (this.spriteTornado) {
            this.spriteTornado.disposeGeometry();
            this.spriteTornado = null;
        }
        this.clearGroup(this.geometryGroup);

        clearTimeout(this._redrawTimeout);
        this._redrawTimeout = setTimeout(() => {
            this.generateStreamlines();
        }, 200);
    }

    clearGroup(obj) {
        obj.children.forEach((child) => {
            child.geometry.dispose();
            child.material.dispose();
        });

        obj.clear();
    }

    generateStreamlines() {
        computingStreamlines++;
        let maxMagnitude = 0;
        const streamlinePoints = [];
        const streamlineMagnitudes = [];

        let seedPositions = this.generateSeedPositions();

        // Pre-allocate reusable vectors
        const pos = objectPool.getVector3();
        const direction = objectPool.getVector3();
        const tempPos = objectPool.getVector3();

        // generate control points and calculate magnitudes
        for ( let i = 0; i < numStreamlines; i ++ ) {
            // streamline seed - reuse vector
            pos.copy(seedPositions[i]);

            // control points list
            const points = [];

            // vector magnitudes list
            const vertexMagnitudes = [];

            // generate control points
            for ( let j = 0; j < numIterations; j ++ ) {
                // trilinear interpolation of the direction vector at the current position
                this.interpolateOptimized(pos, direction);
                let magnitude = direction.length();
                direction.multiplyScalar(scaleFactor);
                tempPos.copy(pos).add(direction);
                pos.copy(tempPos);

                // position is outside the data rectangle -> stop streamline integration
                if ( Math.floor ( pos.x ) < 0 || Math.ceil ( pos.x ) >= sizeX
                  || Math.floor ( pos.y ) < 0 || Math.ceil ( pos.y ) >= sizeY
                  || Math.floor ( pos.z ) < 0 || Math.ceil ( pos.z ) >= sizeZ ) {
                    break;
                }

                points.push ( pos.clone() );
                vertexMagnitudes.push ( magnitude );

                if ( magnitude > maxMagnitude ) {
                    maxMagnitude = magnitude;
                }
            }

            // streamline is too short
            if ( points.length <= 1 ) {
                continue;
            }

            streamlinePoints.push ( points );
            streamlineMagnitudes.push ( vertexMagnitudes );
        }

        // Return vectors to pool
        objectPool.returnVector3(pos);
        objectPool.returnVector3(direction);
        objectPool.returnVector3(tempPos);

        // generate streamlines
        let i = 0;
        const batchSize = 10;

        const processStreamlines = () => {
            const end = Math.min(i + batchSize, streamlinePoints.length);

            for (; i < end; i++) {
                const curve = new THREE.CatmullRomCurve3(streamlinePoints[i]);
                const geometry = new StreamlineTubeGeometry(curve, streamlineMagnitudes[i], streamlinePoints[i].length, radiusScaleFactor, maxMagnitude);
                const material = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
                const mesh = new THREE.Mesh(geometry, material);
                this.geometryGroup.add(mesh);
            }

            if (i < streamlinePoints.length) {
                setTimeout(processStreamlines, 0); // allow a pause
            }
            else {
                computingStreamlines--;
                if (computingStreamlines === 0){
                    document.querySelector(".infoBox").hidden = true;
                }
            }
        };

        processStreamlines();

        // create legend sprite
        this.clearGroup(this.uiGroup);
        this.createLegend ( maxMagnitude );
    }

    generateSeedPositions() {
        const positions = []

        // generate seeds that are close to the eye of the hurricane
        for ( let i = 0; i < Math.ceil ( numStreamlines * seedPositionRatio ); ) {
            let x = hurricaneEye.x - hurricaneEyeCylinderRadius + Math.random() * ( 2 * hurricaneEyeCylinderRadius - 1 );
            let y = hurricaneEye.y - hurricaneEyeCylinderRadius + Math.random() * ( 2 * hurricaneEyeCylinderRadius - 1 );
            let z = Math.random() * ( sizeZ - 1 );
            let pos = new THREE.Vector3 ( x, y, z );

            // check if pos is within the cylinder
            let check = new THREE.Vector3 ( hurricaneEye.x, hurricaneEye.y, z );
            if ( check.distanceTo ( pos ) <= hurricaneEyeCylinderRadius ) {
                positions.push ( pos );
                i ++;
            }
        }

        // generate seeds in the whole available volume
        for ( let i = 0; i < Math.ceil ( numStreamlines * ( 1 - seedPositionRatio ) ); i ++ ) {
            let x = Math.random() * ( sizeX - 1 );
            let y = Math.random() * ( sizeY - 1 );
            let z = Math.random() * ( sizeZ - 1 );
            let pos = new THREE.Vector3 ( x, y, z );
            positions.push ( pos );
        }

        return positions;
    }

    interpolate ( pos ) {
        let floor = new THREE.Vector3 ( Math.floor ( pos.x ), Math.floor ( pos.y ), Math.floor ( pos.z ) );
        let ceil  = new THREE.Vector3 ( Math.ceil ( pos.x ), Math.ceil ( pos.y ), Math.ceil ( pos.z ) );

        let xCoeff = pos.x - floor.x;
        let yCoeff = pos.y - floor.y;
        let zCoeff = pos.z - floor.z;

        // linear on x axis
        let x1 = new THREE.Vector3();
        let x2 = new THREE.Vector3();
        let x3 = new THREE.Vector3();
        let x4 = new THREE.Vector3();

        x1 = x1.addVectors ( this.getVectorAt ( ceil.x, floor.y, floor.z ).multiplyScalar ( xCoeff ),
                             this.getVectorAt ( floor.x, floor.y, floor.z ).multiplyScalar ( 1 - xCoeff ) );
        x2 = x2.addVectors ( this.getVectorAt ( ceil.x, ceil.y, floor.z ).multiplyScalar ( xCoeff ),
                             this.getVectorAt ( floor.x, ceil.y, floor.z ).multiplyScalar ( 1 - xCoeff ) );
        x3 = x3.addVectors ( this.getVectorAt ( ceil.x, floor.y, ceil.z ).multiplyScalar ( xCoeff ),
                             this.getVectorAt ( floor.x, floor.y, ceil.z ).multiplyScalar ( 1 - xCoeff ) );
        x4 = x4.addVectors ( this.getVectorAt ( ceil.x, ceil.y, ceil.z ).multiplyScalar ( xCoeff ),
                             this.getVectorAt ( floor.x, ceil.y, ceil.z ).multiplyScalar ( 1 - xCoeff ) );

        // bilinear on y axis
        let y1 = new THREE.Vector3();
        let y2 = new THREE.Vector3();

        y1 = y1.addVectors ( x2.multiplyScalar ( yCoeff ), x1.multiplyScalar ( 1 - yCoeff ) );
        y2 = y2.addVectors ( x4.multiplyScalar ( yCoeff ), x3.multiplyScalar ( 1 - yCoeff ) );

        // trilinear on z
        let z = new THREE.Vector3();

        z = z.addVectors ( y2.multiplyScalar ( zCoeff ), y1.multiplyScalar ( 1 - zCoeff ) );

        return z;
    }

    interpolateOptimized(pos, result) {
        const floorX = Math.floor(pos.x);
        const floorY = Math.floor(pos.y);
        const floorZ = Math.floor(pos.z);
        const ceilX = Math.ceil(pos.x);
        const ceilY = Math.ceil(pos.y);
        const ceilZ = Math.ceil(pos.z);

        const xCoeff = pos.x - floorX;
        const yCoeff = pos.y - floorY;
        const zCoeff = pos.z - floorZ;
        const xCoeffInv = 1 - xCoeff;
        const yCoeffInv = 1 - yCoeff;
        const zCoeffInv = 1 - zCoeff;

        // Get vectors at corners (reuse temp vectors)
        const v000 = this.getVectorAtOptimized(floorX, floorY, floorZ, tempVector1);
        const v100 = this.getVectorAtOptimized(ceilX, floorY, floorZ, tempVector2);
        const v010 = this.getVectorAtOptimized(floorX, ceilY, floorZ, tempVector3);
        const v110 = this.getVectorAtOptimized(ceilX, ceilY, floorZ, tempVector4);
        const v001 = this.getVectorAtOptimized(floorX, floorY, ceilZ, tempVector5);
        const v101 = this.getVectorAtOptimized(ceilX, floorY, ceilZ, tempVector6);
        const v011 = this.getVectorAtOptimized(floorX, ceilY, ceilZ, tempVector7);
        const v111 = this.getVectorAtOptimized(ceilX, ceilY, ceilZ, tempVector8);

        // Linear interpolation on x axis
        tempVector9.copy(v100).multiplyScalar(xCoeff).add(tempVector10.copy(v000).multiplyScalar(xCoeffInv));
        tempVector11.copy(v110).multiplyScalar(xCoeff).add(tempVector12.copy(v010).multiplyScalar(xCoeffInv));
        tempVector13.copy(v101).multiplyScalar(xCoeff).add(tempVector14.copy(v001).multiplyScalar(xCoeffInv));
        tempVector15.copy(v111).multiplyScalar(xCoeff).add(tempVector16.copy(v011).multiplyScalar(xCoeffInv));

        // Bilinear interpolation on y axis
        tempVector17.copy(tempVector11).multiplyScalar(yCoeff).add(tempVector18.copy(tempVector9).multiplyScalar(yCoeffInv));
        tempVector19.copy(tempVector15).multiplyScalar(yCoeff).add(tempVector20.copy(tempVector13).multiplyScalar(yCoeffInv));

        // Trilinear interpolation on z axis
        result.copy(tempVector19).multiplyScalar(zCoeff).add(tempVector17.multiplyScalar(zCoeffInv));
    }

    getVectorAt ( x, y, z ) {
        // (X, Y, Z) = (-Y, X, Z) in actual data
        let index = x + y * sizeX + z * sizeX * sizeY;
        return new THREE.Vector3 ( -this.Y[index], this.X[index], this.Z[index]);
    }

    getVectorAtOptimized(x, y, z, result) {
        // (X, Y, Z) = (-Y, X, Z) in actual data
        const index = x + y * sizeX + z * sizeX * sizeY;
        result.set(-this.Y[index], this.X[index], this.Z[index]);
        return result;
    }

    createLegend ( maxMagnitude ) {
        if (!this.font) {
            return;
        }

        this.uiGroup.add(generateSprite(lut, -0.94));
        this.uiGroup.add(createTitle('Wind speed [m/s]', this.font, -0.975));

        // create the numbers
        let val = 0.0;
        let nums = 5;
        for ( let i = 0; i < nums + 1; i ++ ) {
            this.uiGroup.add ( placeText(val.toFixed ( 1 ), this.font, -0.9125, 0.455 + i*0.0945));
            val = maxMagnitude / nums * ( i + 1 );
        }
    }
}

export { Streamlines }
