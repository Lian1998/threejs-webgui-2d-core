precision highp float;

uniform vec3 uColor;
uniform float uOpacity;
uniform vec2 uResolution;

uniform float uUseShadow;         // 是否启用打阴影线的模式
uniform float uShadowArray[2];    // 阴影间隔 

void main() {

  vec4 diffuseColor = vec4(uColor, uOpacity);

  if (uUseShadow == 1.0) {
    // gl_FragCoord: 0.5 ~ width * 0.5
    vec2 fragPos = gl_FragCoord.xy - vec2(0.5); // fragPos ∈ [0, width-1] × [0, height-1]; 左下角为 0, 0
    vec2 fragUv = gl_FragCoord.xy / uResolution; // fragUv ∈ [0, 1] × [0, 1]; 归一化到uv, 左下角为 0, 0

    float shadowLength = uShadowArray[0];
    float gapLength = uShadowArray[1];
    float period = shadowLength + gapLength;

    // 打45°斜线
    // float proj = fragPos.x - fragPos.y; // mod 在负数时不对称做如下处理, 使其保证永远在正数, mod时不会有跳跃
    float aspect = uResolution.x / uResolution.y;
    float proj = (fragPos.x + uResolution.y * aspect) - fragPos.y;

    // 归一化到 [0,1) 的周期位置
    float phase = mod(proj, period) / period;

    // 如果超出黑线区域, 舍弃片元
    if (phase > shadowLength / period) {
      discard;
    }
  }

  gl_FragColor = diffuseColor;
}
