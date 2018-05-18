// Fragment shader for a curved page with two textures in glow shadow mode.
// Texture 1 is forced to be completely opaque

precision mediump float;

uniform sampler2D uTexture1;
uniform sampler2D uTexture2;
uniform float uFadeToTexture2;
uniform vec3 uNightLightV3;

varying vec2 vTexture1Coord;
varying vec2 vTexture2Coord;
varying float vIllumination;

void main() {
    vec4 col1 = texture2D(uTexture1, vTexture1Coord);
    vec4 col2 = texture2D(uTexture2, vTexture2Coord);

    // Overlay two textures before transforming the final image.
    vec3 mixColor = mix(col1.rgb, col2.rgb, uFadeToTexture2 * col2.a);

    // In night mode, we apply glow rather than shadow, by interpolating between original
    // image and night light adjusted white.
    gl_FragColor.rgb = mix(vec3(1.0), mixColor, vIllumination) * uNightLightV3;
    gl_FragColor.a = 1.0;
}
