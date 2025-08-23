import * as THREE from '../node_modules/three/build/three.module.js';

// tornado sprite source:
// https://www.deviantart.com/duannian/art/Tornado-Sprite-sheet-NZC-effect-1031952550
const spritePath = 'data/tornado__sprite_sheet.png';
const tilesHoriz = 3;
const tilesVert = 3;
const totalTiles = 8;
const frameDuration = 100; //ms

class SpriteManager{
    constructor(scene, camera){
        this.scene = scene;
        this.camera = camera;

        this.currentTile = 0;
        this.lastFrameTime = 0;
        this.isActive = true;

        this.initGeometry();
    }

    initGeometry() {
        const textureLoader = new THREE.TextureLoader();
        this.spriteTexture = textureLoader.load(spritePath);
        this.spriteTexture.repeat.set(1 / tilesHoriz, 1 / tilesVert);  // 3x3 grid

        const geometry = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshBasicMaterial({
            map: this.spriteTexture,
            transparent: true,
            side: THREE.DoubleSide
        });

        this.plane = new THREE.Mesh(geometry, material);
        this.plane.scale.set(150,150,1);
        this.plane.position.set(275,245,75);

        this.scene.add(this.plane);

        this.updateSpriteSheet();
    }

    disposeGeometry(){
        this.isActive = false;

        this.scene.remove(this.plane);
        this.plane.geometry.dispose();
        this.plane.material.dispose();
        if (this.plane.material.map) {
            this.plane.material.map.dispose();
        }
        this.plane = null;
    }

    updateSpriteSheet(time) {
        if(this.isActive){
            requestAnimationFrame(this.updateSpriteSheet.bind(this));

            // animate sprite
            if (time - this.lastFrameTime > frameDuration) {
                const column = this.currentTile % tilesHoriz;
                const row = Math.floor(this.currentTile / tilesHoriz);

                this.spriteTexture.offset.x = column / tilesHoriz;
                this.spriteTexture.offset.y = 1 - (row + 1) / tilesVert;

                this.currentTile = (this.currentTile + 1) % totalTiles;
                this.lastFrameTime = time;
            }

            // make plane face camera
            const camPos = this.camera.position.clone();
            camPos.z = this.plane.position.z;
            this.plane.lookAt(camPos);

            // fix plane up vector
            const dx = this.camera.position.x - this.plane.position.x;
            const dy = this.camera.position.y - this.plane.position.y;

            const angle = Math.atan2(dy, dx);

            this.plane.rotation.set(0, 0, angle);
            this.plane.rotateX(Math.PI / 2);
            this.plane.rotateY(Math.PI / 2);
        }
    }
}

export { SpriteManager };