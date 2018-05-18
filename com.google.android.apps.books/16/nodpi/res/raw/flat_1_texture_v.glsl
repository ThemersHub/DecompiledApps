// Copyright 2012 Google Inc. All Rights Reserved.

// Vertex shader for a flat page with one texture.

uniform mat4 uMVPMatrix;

uniform mat3 uTransform1;

attribute vec4 aPosition;
attribute vec2 aTextureCoord;
varying vec2 vTexture1Coord;

void main() {
    gl_Position = uMVPMatrix * aPosition;
    gl_PointSize = 1.0;
    vTexture1Coord = (vec3(aTextureCoord, 1) * uTransform1).xy;
}
