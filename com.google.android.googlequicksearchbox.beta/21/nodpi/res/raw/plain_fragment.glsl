#extension GL_OES_EGL_image_external : enable
precision mediump float;

uniform samplerExternalOES sTexture;
varying vec2 vTextureCoord;

void main() {
    vec4 color = texture2D(sTexture, vTextureCoord);
    gl_FragColor = vec4(color.x, color.y, color.z, 1.0);
}
