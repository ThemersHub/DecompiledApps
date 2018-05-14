uniform mat4 uPreviewM;
uniform mat4 uTextureM;
attribute vec4 vPosition;

varying vec2 vTextureCoord;

void main() {
  vTextureCoord = (uTextureM * vec4((vPosition.xy + 1.0) * 0.5, 0, 1)).xy;
  gl_Position = uPreviewM * vPosition;
}
