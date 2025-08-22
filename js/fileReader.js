async function readFile(url) {
    // Fetch the binary file
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();

    // Create a DataView to read Big Endian floats
    const view = new DataView(arrayBuffer);
    const floatCount = arrayBuffer.byteLength / 4;
    const result = new Float32Array(floatCount);

    // Read each float manually in Big Endian
    for (let i = 0; i < floatCount; i++) {
        result[i] = view.getFloat32(i * 4, false); // false = big endian
    }

    return result;
}

export { readFile };
