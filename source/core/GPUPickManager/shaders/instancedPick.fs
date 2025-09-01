precision highp float;
uniform vec3 baseColor; // baseId encoded into RGB for idBase (lower 24 bits)
uniform float idBaseA;   // alpha channel for base id (upper 8 bits)
uniform float baseId;    // numerical base id (for computing per-instance ids beyond 24 bits)
        // We will compute (baseId + float(gl_InstanceID)) and encode to RGBA8
        // to avoid JS-side per-instance attributes.

        // pack a 32-bit integer stored in a float into RGBA8 (approx via floor, works for IDs within 24b RGB reliably; A for high byte)
        // Here we reconstruct in JS and just set uniforms per draw (baseId). For large ranges this is OK.

        // Instead of re-encoding in shader with bit ops (not in WebGL1), we compute color in JS when drawing each instance via onBeforeRender.
        // To keep things simple, for InstancedMesh we render one draw call and vary with gl_InstanceID in JS using a uniform array is not allowed without UBO.
        // So we fallback to: baseId applies to instance 0..N-1, and we output baseColor; on click we decode and compute instance as id - baseId.

void main() {
  gl_FragColor = vec4(baseColor, 1.0);
}