// Copyright 2012 Google Inc. All Rights Reserved.

// Legacy vertex shader for a flat image with one texture.
// Still used for spine image and FPS debugging display.

uniform mat4 uMVPMatrix;
attribute vec4 aPosition;
attribute vec2 aTextureCoord;
varying vec2 vTextureCoord;

void main() {
    gl_Position = uMVPMatrix * aPosition;
    gl_PointSize = 1.0;
    vTextureCoord = aTextureCoord;
}

