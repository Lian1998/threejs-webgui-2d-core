uniform sampler2D uTexture;

uniform bool uUseMultipleColor;
uniform vec3 uColor;

uniform bool uUseWirteDepthBuffer;
uniform float uDepth;

varying vec2 vUv;

#include <dithering_pars_fragment>

vec3 toLinear(vec3 srgb) {
  return pow(srgb, vec3(2.2));
}

vec3 toSrgb(vec3 linear) {
  return pow(linear, vec3(1.0 / 2.2));
}

void main() {

  gl_FragColor = texture2D(uTexture, vUv);

  if (uUseMultipleColor) {
    gl_FragColor.r = gl_FragColor.r * uColor.r;
    gl_FragColor.g = gl_FragColor.g * uColor.g;
    gl_FragColor.b = gl_FragColor.b * uColor.b;
  }

  gl_FragColor = vec4(toSrgb(gl_FragColor.rgb), gl_FragColor.a);

  if (uUseWirteDepthBuffer) {
    gl_FragDepth = (uDepth - 100.0) / 100.0;
  }

	#include <dithering_fragment>
}