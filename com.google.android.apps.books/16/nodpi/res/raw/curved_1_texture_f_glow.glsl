// Fragment shader for a curved page with one texture in glow shadow mode

precision mediump float;

uniform sampler2D uTexture1;
uniform vec3 uNightLightV3;
uniform float uOpacity;

varying vec2 vTexture1Coord;
varying float vIllumination;

void main() {
    lowp vec4 col1 = texture2D(uTexture1, vTexture1Coord);

    // In night mode, we apply glow rather than shadow, by interpolating between original
    // image and night light adjusted white.
    col1.rgb = mix(vec3(1.0), col1.rgb, vIllumination) * uNightLightV3;

    gl_FragColor = col1 * uOpacity;
}
