// A fragment shader that interpolates colors between vertices.
precision mediump float;

varying vec4 vColor;

void main() {
    gl_FragColor = vColor;
}