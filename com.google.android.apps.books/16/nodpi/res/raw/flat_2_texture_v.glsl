// Copyright 2012 Google Inc. All Rights Reserved.

// Vertex shader for a flat page with two textures.

uniform mat4 uMVPMatrix;

uniform mat3 uTransform1;
uniform mat3 uTransform2;

attribute vec4 aPosition;
attribute vec2 aTextureCoord;

varying vec2 vTexture1Coord;
varying vec2 vTexture2Coord;

void main() {
    gl_Position = uMVPMatrix * aPosition;
    gl_PointSize = 1.0;
    vTexture1Coord = (vec3(aTextureCoord, 1) * uTransform1).xy;
    vTexture2Coord = (vec3(aTextureCoord, 1) * uTransform2).xy;
}
