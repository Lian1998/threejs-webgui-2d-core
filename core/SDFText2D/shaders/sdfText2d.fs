uniform sampler2D uTexture;
uniform vec3 uTextColor;
uniform vec3 uOutlineColor;
uniform vec3 uBackgroundColor;
uniform float uBackgroundAlpha;

uniform float uThreshold; // 描边内边
uniform float uOutlineThreshold; // 描边外边
uniform float uSmoothing; // 描边过渡
uniform float opacity;

varying vec2 vUv;

void main() {

  // 这里给到的Texture是存在字体的地方高能量(1.0), 不存在字体的地方没有能量(0.0)
  // 字体内部 distance > threshold
  // 描边区 outlineDistance < distance < threshold
  // 背景区 distance < outlineDistance

  // 0 背景色
  // 0 ~ 1 描边过渡
  // 1 描边
  // 1 ~ 2 字体过渡
  // 2+ 字体

  float sdf = texture2D(uTexture, vUv).r;

  // 字体
  float textFactor = smoothstep(uThreshold - uSmoothing, uThreshold + uSmoothing, sdf);

  // 描边
  float outlineFactor = smoothstep(uOutlineThreshold - uSmoothing, uOutlineThreshold + uSmoothing, sdf);

  outlineFactor *= (1.0 - textFactor);

  // 背景
  float bgFactor = (1.0 - smoothstep(uOutlineThreshold - uSmoothing, uOutlineThreshold + uSmoothing, sdf));

  // 颜色混合
  vec3 color = uBackgroundColor * bgFactor +
    uOutlineColor * outlineFactor +
    uTextColor * textFactor;

  float finalAlpha = clamp(textFactor +
    outlineFactor +
    bgFactor * uBackgroundAlpha, 0.0, 1.0) * opacity;

  gl_FragColor = vec4(color, finalAlpha);
}