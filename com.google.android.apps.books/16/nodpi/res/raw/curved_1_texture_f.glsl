// Copyright 2012 Google Inc. All Rights Reserved.

// Fragment shader for a curved page with one texture

precision mediump float;

uniform sampler2D uTexture1;
uniform vec3 uNightLightV3;
uniform float uOpacity;

varying vec2 vTexture1Coord;
varying float vIllumination;

void main() {
    lowp vec4 col1 = texture2D(uTexture1, vTexture1Coord);
    col1.rgb *= vIllumination;
    col1.rgb *= uNightLightV3;
    gl_FragColor = col1 * uOpacity;
}
