import * as THREE from "../node_modules/three/build/three.module.js";
import {Lut} from "../node_modules/three/examples/jsm/math/Lut.js";

const radialSegments = 6;
const closed = false;
const lut = new Lut('grayscale', 512);


class StreamlineTubeGeometry extends THREE.BufferGeometry {

    constructor( path, vertexRadii = [], tubularSegments = 2, scaleFactor, maxMagnitude ) {
        super();

        this.type = 'StreamlineTubeGeometry';

        this.parameters = {
            path: path,
            tubularSegments: tubularSegments,
            scaleFactor: scaleFactor,
            maxMagnitude: maxMagnitude,
            radialSegments: radialSegments,
            closed: closed
        };

        const frames = path.computeFrenetFrames( tubularSegments, closed );

        // expose internals
        this.tangents = frames.tangents;
        this.normals = frames.normals;
        this.binormals = frames.binormals;

        // helper variables
        const vertex = new THREE.Vector3();
        const normal = new THREE.Vector3();
        const uv = new THREE.Vector2();
        let P = new THREE.Vector3();

        // buffer
        const vertices = [];
        const colors = [];
        const normals = [];
        const uvs = [];
        const indices = [];

        // create buffer data
        generateBufferData ( vertexRadii );

        // build geometry
        this.setIndex( indices );
        this.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
        this.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
        this.setAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );
        this.setAttribute( 'uv', new THREE.Float32BufferAttribute( uvs, 2 ) );

        function generateBufferData ( vertexRadii ) {
            for ( let i = 0; i < tubularSegments; i ++ ) {
                generateSegment( i, vertexRadii[i] );
            }

            // if the geometry is not closed, generate the last row of vertices and normals
            // at the regular position on the given path
            //
            // if the geometry is closed, duplicate the first row of vertices and normals (uvs will differ)
            generateSegment( ( closed === false ) ? tubularSegments : 0, vertexRadii[tubularSegments - 1] );

            // uvs are generated in a separate function.
            // this makes it easy compute correct values for closed geometries
            generateUVs();

            // finally create faces
            generateIndices();
        }

        function generateSegment( i, vertexRadius ) {
            // we use getPointAt to sample evenly distributed points from the given path
            P = path.getPointAt( i / tubularSegments, P );

            // retrieve corresponding normal and binormal
            const N = frames.normals[ i ];
            const B = frames.binormals[ i ];

            // generate normals and vertices for the current segment
            for ( let j = 0; j <= radialSegments; j ++ ) {

                const v = j / radialSegments * Math.PI * 2;

                const sin = Math.sin( v );
                const cos = - Math.cos( v );

                // normal
                normal.x = ( cos * N.x + sin * B.x );
                normal.y = ( cos * N.y + sin * B.y );
                normal.z = ( cos * N.z + sin * B.z );
                normal.normalize();

                normals.push( normal.x, normal.y, normal.z );

                // vertex
                vertex.x = P.x + vertexRadius * scaleFactor * normal.x;
                vertex.y = P.y + vertexRadius * scaleFactor * normal.y;
                vertex.z = P.z + vertexRadius * scaleFactor * normal.z;

                vertices.push ( vertex.x, vertex.y, vertex.z );

                const color = lut.getColor ( vertexRadius / maxMagnitude );
                colors.push ( color.r, color.g, color.b );
            }
        }

        function generateIndices() {
            for ( let j = 1; j <= tubularSegments; j ++ ) {
                for ( let i = 1; i <= radialSegments; i ++ ) {
                    const a = ( radialSegments + 1 ) * ( j - 1 ) + ( i - 1 );
                    const b = ( radialSegments + 1 ) * j + ( i - 1 );
                    const c = ( radialSegments + 1 ) * j + i;
                    const d = ( radialSegments + 1 ) * ( j - 1 ) + i;

                    // faces
                    indices.push( a, b, d );
                    indices.push( b, c, d );
                }
            }
        }

        function generateUVs() {
            for ( let i = 0; i <= tubularSegments; i ++ ) {
                for ( let j = 0; j <= radialSegments; j ++ ) {
                    uv.x = i / tubularSegments;
                    uv.y = j / radialSegments;

                    uvs.push( uv.x, uv.y );
                }
            }
        }
    }

    copy( source ) {
        super.copy( source );

        this.parameters = Object.assign( {}, source.parameters );

        return this;
    }
}

export { StreamlineTubeGeometry };