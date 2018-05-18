// Copyright 2012 Google Inc. All Rights Reserved.

// Fragment shader for a flat page with one texture

precision mediump float;

uniform vec3 uColorBg;
uniform sampler2D uTexture1;
uniform float uOpacity;
uniform vec3 uNightLightV3;

varying vec2 vTexture1Coord;

void main() {
    vec4 col1 = texture2D(uTexture1, vTexture1Coord);
    gl_FragColor.rgb = mix(uColorBg, col1.rgb, uOpacity * col1.a) * uNightLightV3;
    gl_FragColor.a = 1.0;
}
