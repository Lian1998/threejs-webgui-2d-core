precision highp float;

uniform vec3 uColor;
uniform float uOpacity;
uniform vec2 uResolution;

uniform float uUseShadow; // 是否启用打阴影线的模式
uniform float uShadowArray[2];    // 阴影间隔 default: 4

void main() {

  vec4 diffuseColor = vec4(uColor, uOpacity);

  if (uUseShadow == 1.0) {
    // gl_FragCoord: 0.5 ~ width * 0.5
    vec2 fragPos = gl_FragCoord.xy - vec2(0.5);
    vec2 fragPosNormal = (gl_FragCoord.xy - vec2(0.5)) / uResolution;

    float uShadowStep = uShadowArray[0] + uShadowArray[1];
    float fm = mod(fragPos.x - fragPos.y, uShadowStep);
    // float fmk = step(fm, 0.0);
    if (fm > uShadowArray[1]) {
      discard;
    }
  }

  gl_FragColor = diffuseColor;
}
