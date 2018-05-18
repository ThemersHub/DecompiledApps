// Copyright 2012 Google Inc. All Rights Reserved.

// Legacy fragment shader for an image with one texture. Used for FPS debugging display.

precision mediump float;

varying vec2 vTextureCoord;
uniform sampler2D uTexture;
uniform float uOpacity;

void main() {
    gl_FragColor = texture2D(uTexture, vTextureCoord) * uOpacity;
}
