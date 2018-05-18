// Copyright 2012 Google Inc. All Rights Reserved.

// Fragment shader for a curved page with two textures.
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
    gl_FragColor.rgb = mix(col1.rgb, col2.rgb, uFadeToTexture2 * col2.a)
            * uNightLightV3 * vIllumination;
    gl_FragColor.a = 1.0;
}
