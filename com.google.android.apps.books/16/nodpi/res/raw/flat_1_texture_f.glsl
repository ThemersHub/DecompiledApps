// Copyright 2012 Google Inc. All Rights Reserved.

// Fragment shader for a flat page with one texture

precision mediump float;

uniform sampler2D uTexture1;
uniform float uOpacity;
uniform vec3 uNightLightV3;

varying vec2 vTexture1Coord;

void main() {
    lowp vec4 col1 = texture2D(uTexture1, vTexture1Coord);
    col1.rgb *= uNightLightV3;
    gl_FragColor = col1 * uOpacity;
}
