import { readFile} from "./fileReader";
import * as THREE from 'three';
import { Lut } from './myLut'
import {TextGeometry} from "three/examples/jsm/geometries/TextGeometry.js";
import {createTitle, placeText, generateFancySprite} from "./legendUtils";

const fileName = 'data/TCf25.bin';
const minTemp = -78;
const maxTemp = 30;

// geometry parameters
const planeSize = 100;
const vertexCount = 100;
const lut = new Lut('rainbow', 512);
const isoStep = 10;

// placement parameters
const angle = 0.5*Math.PI;
const axisMulti = [5, 5, 1];
const vectorOrientation = [
    new THREE.Vector3(0, 1, 1),
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 0, 0)];

class CutPlane {
    constructor(scene, uiScene, gui, font, streamlineLegend) {
        console.log('^-^');

        this.scene = scene;
        this.uiScene = uiScene;
        this.uiGroup = new THREE.Group();
        this.uiScene.add ( this.uiGroup );
        this.uiGroup.position.set(0.01, 0, 0);
        this.slLegend = streamlineLegend;
        this.initCutPlane();
        this.planeGroup.visible = false;
        this.uiGroup.visible = false;

        this.isoStep = isoStep;
        this.isoValues = this.generateIsoValues(isoStep);
        this.initIsoLines();
        this.isoLine.visible = true;

        this.font = font;

        // load data
        readFile(fileName).then(floatArray => {
            this.data = floatArray;
            console.log('Temperature file loaded');
            const countString = document.querySelector('.loadedFiles')
            countString.textContent = Number(countString.textContent) + 1;

            this.initGui(gui);
            this.getColorPlane(2, 0);
            this.computeIsoLines(this.param.orientation, this.geometryGroup.position.z);
            this.createLegend();
        });
    }

    initGui(guiParent) {
        const gui = guiParent.addFolder( 'Cutplane');

        this.param = {
            orientation: 2,
            position: 0,
            showCutPlane: this.planeGroup.visible,
            showContours: this.isoLine.visible,
            isoStep: isoStep};

        // cutplane
        gui.add(this.param, 'showCutPlane').name('Show cut plane').onChange(val =>{
            this.planeGroup.visible = val;
            this.uiGroup.visible = val;
            this.slLegend.position.set(val ? 0.152 : 0.01, 0, 0);
        });

        gui.add(this.param, 'orientation', {X: 0, Y:1, Z:2 }).name('Orientation').onChange(val => {
            this.planeGroup.rotation.set(
                vectorOrientation[val].x * angle,
                vectorOrientation[val].y * angle,
                vectorOrientation[val].z * angle);
            this.planeGroup.scale.y = val === 2 ? 5 : 1;
            this.planeGroup.scale.z = 1 - (val % 2) * 2;
            this.geometryGroup.position.z = this.param.position * axisMulti[val];
            this.aboveSeaElem.hidden = val !== 2;
            this.getColorPlane(val, this.param.position);
            this.computeIsoLines(val, this.param.position);
            this.redrawCutPlane();
        });

        gui.add(this.param, 'position', 0, 99).step(1).name('Position').onChange(val => {
            this.geometryGroup.position.z = val * axisMulti[this.param.orientation];
            if(this.param.orientation === 2){
                this.aboveSeaVal.textContent = (0.198 * val).toFixed(2);
            }
            this.getColorPlane(this.param.orientation, val);
            this.computeIsoLines(this.param.orientation, val);
            this.redrawCutPlane();
        });

        // contour lines
        gui.add(this.param, 'showContours').name('Show contours').onChange(val =>{
            this.isoLine.visible = val;
            this.redrawCutPlane();
        });

        gui.add(this.param, 'isoStep', 1, 20).step(1).name('Contours step').onChange(val => {
            this.isoStep = val;
            this.isoValues = this.generateIsoValues(val);
            this.computeIsoLines(this.param.orientation, this.param.position);
            this.redrawCutPlane();
        });

        const elem = document.getElementById('lil-gui-name-3').nextSibling;
        const p = document.createElement('p');
        p.innerHTML = '(<div class="aboveSea">0</div> km a.s.l.)';
        elem.append(p);
        this.aboveSeaVal = document.getElementsByClassName('aboveSea')[0];
        this.aboveSeaElem = p;
    }

    redrawCutPlane() {
        clearTimeout(this._redrawTimeout);
        this._redrawTimeout = setTimeout(() => {
            this.clearGroup(this.uiGroup);
            this.createLegend();
        }, 100);
    }

    clearGroup(obj) {
        obj.children.forEach((child) => {
            child.geometry.dispose();
            child.material.dispose();
        });

        obj.clear();
    }

    generateIsoValues(step){
        const adjustedMin = Math.ceil(minTemp / step) * step;
        const adjustedMax = Math.floor(maxTemp / step) * step;

        const result = [];
        for (let val = adjustedMin; val <= adjustedMax; val += step) {
            result.push(parseFloat(val.toFixed(10))); // Avoid floating point error
        }

        return result;
    }

    initCutPlane() {
        this.planeGroup = new THREE.Group();

        this.scene.add(this.planeGroup);
        this.geometryGroup = new THREE.Group();
        this.planeGroup.add(this.geometryGroup);
        this.planeGroup.scale.set(5, 5, 1);

        this.initGeometry();
    }

    initGeometry() {
        const geometry = new THREE.BufferGeometry();

        const positions = new Float32Array( vertexCount * vertexCount * 3);   // buffer arrray, position of 4 vertices
        const indices = 	new Uint32Array(((vertexCount-1) * (vertexCount-1) * 2) * 3);  // indices for 2 faces
        const colors = 	new Float32Array( vertexCount * vertexCount * 3);     // buffer arrray, 4 vertexColors * 3 color channels
        // generate positions
        const step = planeSize / vertexCount;
        for (let y = 0; y < vertexCount; y++) {
            for (let x = 0; x < vertexCount; x++) {
                let id = (x + y * vertexCount) * 3
                positions[id] = x * step;
                positions[id+1] = y;
                positions[id+2] = 0;

                colors[id] = 1;
                colors[id+1] = 1;
                colors[id+2] = 1;
            }
        }

        // generate indices
        for (let y = 0; y < vertexCount-1; y++) {
            for (let x = 0; x < vertexCount-1; x++) {
                let id1 = x + y * vertexCount;
                let id2 = (x + y * (vertexCount-1)) * 3 * 2
                // first face
                indices[id2  ] = id1;
                indices[id2+1] = id1 + 1;
                indices[id2+2] = id1 + vertexCount;
                //second face
                indices[id2+3] = id1 + vertexCount;
                indices[id2+4] = id1 + 1;
                indices[id2+5] = id1 + 1 + vertexCount;
            }
        }

        geometry.setIndex( new THREE.BufferAttribute( indices, 1 ) );
        geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ));
        geometry.setAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );
        this.colors = geometry.attributes.color;
        const material = new THREE.MeshBasicMaterial( { vertexColors: true, side: THREE.DoubleSide } );

        const mesh = new THREE.Mesh( geometry, material );
        this.geometryGroup.add( mesh );
    }

    getIntersectionPoints(v1, v2, t1, t2, isoValue) {
        const deltaT = t2 - t1;
        if (deltaT === 0) return null;

        const t = (isoValue - t1) / deltaT;
        if (t < 0 || t > 1) return null;

        return new THREE.Vector3().copy(v2).sub(v1).multiplyScalar(t).add(v1);
    }

    getIntersectionSquare(v1, t1, v2, t2, v3, t3, v4, t4){
        const result = [];

        for (const iso of this.isoValues) {
            const segments = [];

            // First triangle: v1-v2-v3
            const p1 = this.getIntersectionPoints(v1, v2, t1, t2, iso);
            const p2 = this.getIntersectionPoints(v1, v3, t1, t3, iso);
            const p3 = this.getIntersectionPoints(v3, v2, t3, t2, iso);
            const triangle1 = [p1, p2, p3].filter(Boolean);

            if (triangle1.length === 2) {
                segments.push(...triangle1);
            }

            // Second triangle: v4-v2-v3
            const p4 = this.getIntersectionPoints(v4, v2, t4, t2, iso);
            const p5 = this.getIntersectionPoints(v4, v3, t4, t3, iso);
            const p6 = this.getIntersectionPoints(v3, v2, t3, t2, iso); // duplicate of p3, optional
            const triangle2 = [p4, p5, p6].filter(Boolean);

            if (triangle2.length === 2) {
                segments.push(...triangle2);
            }

            result.push(...segments);
        }

        return result;
    }

    initIsoLines() {
        const material = new THREE.LineBasicMaterial({
            color: 0xffffff,
            depthTest: false
        });

        const geometry = new THREE.BufferGeometry();

        this.isoLine = new THREE.LineSegments( geometry, material);
        this.geometryGroup.add( this.isoLine );
    }

    computeIsoLines(axis, index){
        const points = [];

        const axisMap = {
            0: (i, j) => [index, i, j], // x-plane
            1: (i, j) => [i, index, j], // y-plane
            2: (i, j) => [i, j, index], // z-plane
        };

        const getCoord = axisMap[axis];

        for (let j = 0; j < vertexCount - 1; j++) {
            for (let i = 0; i < vertexCount - 1; i++) {
                const [x1, y1, z1] = getCoord(i, j);
                const [x2, y2, z2] = getCoord(i + 1, j);
                const [x3, y3, z3] = getCoord(i, j + 1);
                const [x4, y4, z4] = getCoord(i + 1, j + 1);

                const inter = this.getIntersectionSquare(
                    new THREE.Vector3(i, j, 0), this.getTemp(x1, y1, z1),
                    new THREE.Vector3(i + 1, j, 0), this.getTemp(x2, y2, z2),
                    new THREE.Vector3(i, j + 1, 0), this.getTemp(x3, y3, z3),
                    new THREE.Vector3(i + 1, j + 1, 0), this.getTemp(x4, y4, z4),
                );

                points.push(...inter);
            }
        }

        this.isoLine.geometry.dispose();
        this.isoLine.geometry = new THREE.BufferGeometry().setFromPoints(points);
    }

    getTemp(x, y, z) {
        const i = x + y * vertexCount + z * vertexCount * vertexCount;
        return this.data[i];
    }

    getColorPlane(axis, index) {
        const axisMap = {
            0: (i, j) => [index, i, j], // x-plane
            1: (i, j) => [i, index, j], // y-plane
            2: (i, j) => [i, j, index], // z-plane
        };

        const getCoord = axisMap[axis];
        this.min = 100000;
        this.max = 0;

        // Pre-calculate constants
        const tempRange = maxTemp - minTemp;
        const tempRangeInv = 1 / tempRange;

        for (let j = 0; j < vertexCount; j++) {
            for (let i = 0; i < vertexCount; i++) {
                const [x, y, z] = getCoord(i, j);
                const temp = this.getTemp(x, y, z);
                let alpha = (temp - minTemp) * tempRangeInv;
                
                // Clamp alpha to [0, 1] range
                alpha = Math.max(0, Math.min(1, alpha));
                
                const color = lut.getColor(alpha);
                const id = i + j * vertexCount;
                this.colors.setXYZ(id, color.r, color.g, color.b);

                this.min = Math.min(this.min, alpha);
                this.max = Math.max(this.max, alpha);
            }
        }

        this.colors.needsUpdate = true;
    }

    createText ( uiGroup, text, posX, posY, scaleX, rotZ ) {
        if (!this.font) {
            return;
        }

        const textGeometry = new TextGeometry ( text, {
            font: this.font,
            size: 0.02,
            depth: 1,
            curveSegments: 12,
            bevelEnabled: true,
            bevelThickness: 0,
            bevelSize: 0,
            bevelOffset: 0,
            bevelSegments: 1
        } );

        const textMaterial = new THREE.MeshBasicMaterial ( { color: 0xFFFFFF } );
        const textMesh = new THREE.Mesh( textGeometry, textMaterial );
        textMesh.rotation.set ( 0, 0, rotZ );
        textMesh.scale.set ( scaleX, 1, 1 );
        textMesh.position.set ( posX, posY, -1 )

        uiGroup.add ( textMesh );
    }

    createLegend() {
        const isoValues = this.generateIsoValues ( this.isoStep );
        let isoValuesNorm = []
        for ( let i = 0; i < isoValues.length; i ++ ) {
            isoValuesNorm.push ( ( isoValues[i] - minTemp ) / ( maxTemp - minTemp ) );
        }

        const isoLen = isoValuesNorm.length;
        const isoMin = isoValuesNorm[0];
        const isoMax = isoValuesNorm[isoLen - 1];
        const isoStep = ( isoMax - isoMin ) / ( isoLen - 1 );

        let min = this.min;
        let max = this.max;

        this.uiGroup.add(generateFancySprite(lut, -0.94, [min, max, isoMin, isoMax, isoStep, this.isoLine.visible]));

        // create "temperature" text
        this.uiGroup.add(createTitle('Temperature [°C]', this.font, -0.975));

        // min and max temps
        const minT = ( maxTemp - minTemp ) * min + minTemp;
        const maxT = ( maxTemp - minTemp ) * max + minTemp;
        this.uiGroup.add(placeText(minT.toFixed ( 1 ), this.font, -0.965, 0.42));
        this.uiGroup.add(placeText(maxT.toFixed ( 1 ), this.font, -0.965, 0.96));

        // create the numbers
        const minY = 0.44;
        const maxY = 0.94;

        // only take the iso values that are currently visible
        const visibleIso = [];
        const visibleIsoNorm = [];
        for ( let i = 0; i < isoValues.length; i ++ ) {
            if ( isoValuesNorm[i] >= min && isoValuesNorm[i] < max ) {
                visibleIso.push ( isoValues[i] );
                visibleIsoNorm.push ( isoValuesNorm[i] );
            }
        }

        // if contours are visible, align the values with them
        if ( this.isoLine.visible && visibleIsoNorm.length <= 10 ) {
            for ( let i = 0; i < visibleIsoNorm.length; i ++ ) {
                const pos = ( visibleIsoNorm[i] - min ) / ( max - min );
                const posY = minY + pos * ( maxY - minY );

                this.uiGroup.add(placeText(
                    visibleIso[i].toFixed ( 1 ),
                    this.font,
                    -0.9125, posY));
            }
        }
        else {
            const nums = 5;
            const step = ( maxT - minT ) / ( nums + 1 );
            const stepY = ( maxY - minY ) / ( nums + 1 );

            for ( let i = 0; i < nums; i ++ ) {
                const val = ( i + 1 ) * step + minT;
                const posY = ( i + 1 ) * stepY + minY;

                this.uiGroup.add(placeText(
                    val.toFixed ( 1 ),
                    this.font,
                    -0.9125, posY));
            }
        }
    }
}

export { CutPlane };
