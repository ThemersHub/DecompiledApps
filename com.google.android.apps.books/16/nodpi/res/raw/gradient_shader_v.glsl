// A vertex shader that takes arrays of vertex positions and colors and allows
// OpenGL to interpolate colors in between vertices.

attribute vec4 aPosition;
attribute vec4 aColor;

uniform mat4 uMVPMatrix;
uniform float uOpacity;
uniform vec3 uNightLightV3;

varying vec4 vColor;

void main() {
    gl_Position = uMVPMatrix * aPosition;
    gl_PointSize = 1.0;

    vec4 color = aColor;
    color.rgb *= uNightLightV3;

    vColor = color * uOpacity;
}