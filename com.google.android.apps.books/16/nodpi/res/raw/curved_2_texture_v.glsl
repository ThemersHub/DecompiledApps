// Copyright 2012 Google Inc. All Rights Reserved.

// Vertex shader for a curved page with two textures

uniform mat4 uMVPMatrix;
uniform float UNI_backFacing;

uniform mat3 uTransform1;
uniform mat3 uTransform2;

attribute vec4 aPosition;
attribute vec2 aTextureCoord;
attribute vec3 aNormal;

varying vec2 vTexture1Coord;
varying vec2 vTexture2Coord;
varying float vIllumination;

void main() {
    vec3 normal = aNormal;
    vec2 mirrorCorrectedCoord;
    if (UNI_backFacing > 0.5) {
        normal = -normal;
        mirrorCorrectedCoord = vec2(1.0-aTextureCoord.x, aTextureCoord.y);
    } else {
        mirrorCorrectedCoord = aTextureCoord;
    }
    gl_Position = uMVPMatrix * aPosition;

    float lightVal = dot(normal, vec3(0.25, 0.0, 1.5))*0.4 + 0.6;
    vIllumination = clamp(lightVal, 0.0, 1.0);

    gl_PointSize = 1.0;
    vTexture1Coord = (vec3(mirrorCorrectedCoord, 1) * uTransform1).xy;
    vTexture2Coord = (vec3(mirrorCorrectedCoord, 1) * uTransform2).xy;
}
