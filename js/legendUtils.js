import * as THREE from "../node_modules/three/build/three.module.js";
import {TextGeometry} from "../node_modules/three/examples/jsm/geometries/TextGeometry.js";

const yPosSprite = 0.7;
const yPosTitle = 0.4875;

function generateFancySprite(lut, xPos, vals) {
    let sprite = new THREE.Sprite ( new THREE.SpriteMaterial ( {
        map: new THREE.CanvasTexture (
            lut.createCanvas (
                vals[0],
                vals[1],
                vals[2],
                vals[3],
                vals[4],
                vals[5]
            ) )
    } ) );
    sprite.material.map.colorSpace = THREE.SRGBColorSpace;
    sprite.scale.set ( 0.05, 0.5, 1 );
    sprite.position.set ( xPos, yPosSprite, 0 );

    return sprite;
}

function generateSprite(lut, xPos) {
    let sprite = new THREE.Sprite ( new THREE.SpriteMaterial ( {
        map: new THREE.CanvasTexture ( lut.createCanvas() )
    } ) );
    sprite.material.map.colorSpace = THREE.SRGBColorSpace;
    sprite.scale.set(0.05, 0.5, 1);
    sprite.position.set(xPos, yPosSprite, 0);

    return sprite;
}

function createTextMesh(text, font) {
    const textGeometry = new TextGeometry ( text, {
        font: font,
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
    return new THREE.Mesh( textGeometry, textMaterial );
}

function createTitle(text, font, xPos) {
    const textMesh = createTextMesh(text, font);
    textMesh.rotation.set ( 0, 0, Math.PI/2 );
    textMesh.scale.set ( 2, 1, 1 );
    textMesh.position.set ( xPos, yPosTitle, -1 );
    return textMesh;
}

function placeText(text, font, xPos, yPos) {
    const textMesh = createTextMesh(text, font);
    textMesh.scale.set ( 0.75, 1, 1 );
    textMesh.position.set ( xPos, yPos, -1 )
    return textMesh;
}

export { generateSprite, createTitle, placeText, generateFancySprite };