#extension GL_OES_EGL_image_external : enable
precision mediump float;

uniform samplerExternalOES sTexture;
varying vec2 vTextureCoord;

void main() {
    vec4 color = texture2D(sTexture, vTextureCoord);
    float luma = 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
    gl_FragColor = vec4(luma, luma, luma, luma);
}
