precision highp float;
precision highp sampler2DArray;

uniform sampler2DArray uAtlas;
uniform vec3 uTextColor;
uniform vec3 uOutlineColor;
uniform vec3 uBackgroundColor;
uniform float uBackgroundAlpha;

uniform float uThreshold;
uniform float uOutlineThreshold;
uniform float uSmoothing;
uniform float uBackgroundRadius;
uniform float uOpacity;
uniform float uVisible;

in vec2 vUv;
flat in int vPage;
flat in float vType;
in vec2 vLocalPos;
flat in float vLocalAspect;
#if defined(USE_PICK_BUFFER_ATTRIBUTE) || defined(USE_PICK_BUFFER_UNIFORM)
flat in vec3 vPickColor;
#endif

out vec4 outColor;

float roundedBoxSDF(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) - r;
}

// 1. 先将空间在 y 方向缩放 (p2, b2, r2)
// 2. 在缩放空间计算 SDF, 再将距离除以 aspect 还原
float roundedBoxSDF_aspect(vec2 p, vec2 b, float r, float aspect) {

  vec2 p2 = vec2(p.x, p.y * aspect);
  vec2 b2 = vec2(b.x, b.y * aspect);
  float r2 = r * aspect;

  vec2 q = abs(p2) - b2 + r2;
  float d = length(max(q, 0.0)) - r2;

  return d / aspect; // 把距离映射回原始空间
}

void main() {
  if (uVisible < 0.5) {
    discard;
  }

#ifdef USE_PICK_BUFFER
  outColor = vec4(vPickColor, 1.0);
  return;
#endif

  if (vType < 0.5) {
    vec2 halfSize = vec2(0.5); 
    // float rbmask = roundedBoxSDF(vLocalPos, halfSize, uBackgroundRadius);
    float rbmask = roundedBoxSDF_aspect(vLocalPos, halfSize, uBackgroundRadius, vLocalAspect);
    float edge = 0.005; // 控制边缘软硬
    float rbmaskF = 1.0 - smoothstep(0.0, edge, rbmask);

    outColor = vec4(uBackgroundColor, rbmaskF * uBackgroundAlpha * uOpacity);
    return;
  }

  // sample SDF from texture array (R channel)
  float sdfDist = texture(uAtlas, vec3(vUv, float(vPage))).r;

  // // smoothstep around threshold; note uSmoothing should be small (e.g. 0.02..0.08)
  // float alpha = smoothstep(uThreshold - uSmoothing, uThreshold + uSmoothing, dist);
  // outColor = vec4(vec3(dist), alpha);

  // 这里给到的Texture是存在字体的地方高能量(1.0), 不存在字体的地方没有能量(0.0)
  // 字体内部 distance > threshold
  // 描边区 outlineDistance < distance < threshold
  // 背景区 distance < outlineDistance

  // 0 SDF背景
  // 0 ~ 1 SDF描边过渡
  // 1 SDF描边
  // 1 ~ 2 SDF字体过渡
  // 2+ SDF字体

  // 字体
  float textAlpha = smoothstep(uThreshold - uSmoothing, uThreshold + uSmoothing, sdfDist);

  // 描边
  float outlineAlpha = smoothstep(uOutlineThreshold - uSmoothing, uOutlineThreshold + uSmoothing, sdfDist);
  outlineAlpha *= (1.0 - textAlpha);

  // 颜色混合
  vec3 color = uOutlineColor * outlineAlpha +
    uTextColor * textAlpha;

  outColor = vec4(color, textAlpha + outlineAlpha);

  outColor.a *= uOpacity;

}
