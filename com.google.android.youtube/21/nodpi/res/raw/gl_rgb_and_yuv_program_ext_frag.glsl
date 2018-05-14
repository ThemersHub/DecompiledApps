#ifndef ENABLE_YUV
#extension GL_OES_EGL_image_external : require
#endif

precision highp float;

#ifdef ENABLE_YUV
uniform sampler2D uTextureY;
uniform sampler2D uTextureU;
uniform sampler2D uTextureV;
uniform mat3 uColorConversion;
uniform sampler2D uLut;
uniform float uLutSize;

vec4 getColor(in vec2 texCrd) {
  vec3 yuv;
  yuv.x = texture2D(uTextureY, texCrd).r - 0.0625;
  yuv.y = texture2D(uTextureU, texCrd).r - 0.5;
  yuv.z = texture2D(uTextureV, texCrd).r - 0.5;
  vec3 rgb = uColorConversion * yuv;
  if (uLutSize > 0.0)
  {
    // The LUT is 2.5D, with width = uLutSize * uLutSize and height = uLutSize.
    // The x axis has R changing most rapidly followed by G.
    // The y axis is B.
    rgb = clamp(rgb, 0.0, 1.0);
    // We add half pixel to the X axis so the lookups rest in the centre of the
    // pixel and don't blend with the high R pixel on the left.
    float halfPixel = 0.5 / (uLutSize * uLutSize);
    // Reduce the range of R by 1 pixel so we can look up centre to centre.
    rgb.r *= (uLutSize - 1.0) / uLutSize;
    // Since B is the discontinuous color, take 2 snapshots and blend them
    // together.
    vec2 UV1 = vec2(halfPixel + rgb.r / uLutSize
        + floor(rgb.b * (uLutSize - 1.0)) / uLutSize, rgb.g);
    vec2 UV2 = vec2(halfPixel + rgb.r / uLutSize
        + ceil(rgb.b * (uLutSize - 1.0)) / uLutSize, rgb.g);
    float blend = fract(rgb.b * (uLutSize - 1.0));
    vec3 dcip31 = texture2D(uLut, UV1).rgb;
    vec3 dcip32 = texture2D(uLut, UV2).rgb;
    // Blend the 2 G snapshots.
    rgb = mix(dcip31, dcip32, blend);
  }
  return vec4(rgb, 1.0);
}
#else
// Note: lowp is required here for certain Adreno 3XX devices running SDK 17 and 18, otherwise
// shader compilation will fail.
uniform lowp samplerExternalOES uTexture;

vec4 getColor(in vec2 texCrd) {
  return texture2D(uTexture, texCrd);
}
#endif
