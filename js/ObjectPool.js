import * as THREE from '../node_modules/three/build/three.module.js';

class ObjectPool {
    constructor() {
        this.vector3Pool = [];
        this.vector3PoolSize = 1000;
        this.initVector3Pool();
    }
    
    initVector3Pool() {
        for (let i = 0; i < this.vector3PoolSize; i++) {
            this.vector3Pool.push(new THREE.Vector3());
        }
    }
    
    getVector3(x = 0, y = 0, z = 0) {
        if (this.vector3Pool.length > 0) {
            const vector = this.vector3Pool.pop();
            vector.set(x, y, z);
            return vector;
        }
        return new THREE.Vector3(x, y, z);
    }
    
    returnVector3(vector) {
        if (this.vector3Pool.length < this.vector3PoolSize) {
            this.vector3Pool.push(vector);
        }
    }
    
    // Batch return multiple vectors
    returnVector3Array(vectors) {
        vectors.forEach(vector => this.returnVector3(vector));
    }
}

// Global object pool instance
const objectPool = new ObjectPool();

export { objectPool };
