// Web Worker for streamline generation
self.onmessage = function(e) {
    const { 
        seedPositions, 
        numIterations, 
        scaleFactor, 
        sizeX, 
        sizeY, 
        sizeZ, 
        X, 
        Y, 
        Z 
    } = e.data;
    
    const streamlinePoints = [];
    const streamlineMagnitudes = [];
    let maxMagnitude = 0;
    
    // Generate streamlines
    for (let i = 0; i < seedPositions.length; i++) {
        const pos = { x: seedPositions[i].x, y: seedPositions[i].y, z: seedPositions[i].z };
        const points = [];
        const vertexMagnitudes = [];
        
        for (let j = 0; j < numIterations; j++) {
            // Interpolate direction vector
            const direction = interpolate(pos, X, Y, Z, sizeX, sizeY);
            const magnitude = Math.sqrt(direction.x * direction.x + direction.y * direction.y + direction.z * direction.z);
            
            // Update position
            pos.x += direction.x * scaleFactor;
            pos.y += direction.y * scaleFactor;
            pos.z += direction.z * scaleFactor;
            
            // Check bounds
            if (Math.floor(pos.x) < 0 || Math.ceil(pos.x) >= sizeX ||
                Math.floor(pos.y) < 0 || Math.ceil(pos.y) >= sizeY ||
                Math.floor(pos.z) < 0 || Math.ceil(pos.z) >= sizeZ) {
                break;
            }
            
            points.push({ x: pos.x, y: pos.y, z: pos.z });
            vertexMagnitudes.push(magnitude);
            
            if (magnitude > maxMagnitude) {
                maxMagnitude = magnitude;
            }
        }
        
        if (points.length > 1) {
            streamlinePoints.push(points);
            streamlineMagnitudes.push(vertexMagnitudes);
        }
        
        // Report progress every 10%
        if (i % Math.max(1, Math.floor(seedPositions.length / 10)) === 0) {
            self.postMessage({
                type: 'progress',
                progress: (i / seedPositions.length) * 100
            });
        }
    }
    
    // Send results back
    self.postMessage({
        type: 'complete',
        streamlinePoints,
        streamlineMagnitudes,
        maxMagnitude
    });
};

function interpolate(pos, X, Y, Z, sizeX, sizeY) {
    const floorX = Math.floor(pos.x);
    const floorY = Math.floor(pos.y);
    const floorZ = Math.floor(pos.z);
    const ceilX = Math.ceil(pos.x);
    const ceilY = Math.ceil(pos.y);
    const ceilZ = Math.ceil(pos.z);
    
    const xCoeff = pos.x - floorX;
    const yCoeff = pos.y - floorY;
    const zCoeff = pos.z - floorZ;
    
    // Get vectors at corners
    const v000 = getVectorAt(floorX, floorY, floorZ, X, Y, Z, sizeX, sizeY);
    const v100 = getVectorAt(ceilX, floorY, floorZ, X, Y, Z, sizeX, sizeY);
    const v010 = getVectorAt(floorX, ceilY, floorZ, X, Y, Z, sizeX, sizeY);
    const v110 = getVectorAt(ceilX, ceilY, floorZ, X, Y, Z, sizeX, sizeY);
    const v001 = getVectorAt(floorX, floorY, ceilZ, X, Y, Z, sizeX, sizeY);
    const v101 = getVectorAt(ceilX, floorY, ceilZ, X, Y, Z, sizeX, sizeY);
    const v011 = getVectorAt(floorX, ceilY, ceilZ, X, Y, Z, sizeX, sizeY);
    const v111 = getVectorAt(ceilX, ceilY, ceilZ, X, Y, Z, sizeX, sizeY);
    
    // Trilinear interpolation
    const x1 = lerp(v000, v100, xCoeff);
    const x2 = lerp(v010, v110, xCoeff);
    const x3 = lerp(v001, v101, xCoeff);
    const x4 = lerp(v011, v111, xCoeff);
    
    const y1 = lerp(x1, x2, yCoeff);
    const y2 = lerp(x3, x4, yCoeff);
    
    return lerp(y1, y2, zCoeff);
}

function getVectorAt(x, y, z, X, Y, Z, sizeX, sizeY) {
    const index = x + y * sizeX + z * sizeX * sizeY;
    return {
        x: -Y[index],
        y: X[index],
        z: Z[index]
    };
}

function lerp(a, b, t) {
    return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: a.z + (b.z - a.z) * t
    };
}
