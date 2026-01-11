uniform vec3 uColor;
uniform float uUseShadow;
uniform float uOpacity;

float hatchSpacing = 8.0; // 像素间距，例如 8.0
float hatchWidth = 1.0;   // 线宽，例如 1.0
float hatchAngle = 3.14 / 8.0;   // 弧度，例如 radians(45.0)
float hatchAlpha = 0.4;   // 阴影线强度 0~1

void main() {

  if (uUseShadow == 1.0) {
    // 屏幕空间坐标
    vec2 coord = gl_FragCoord.xy;

    // 旋转坐标（控制线方向）
    float c = cos(hatchAngle);
    float s = sin(hatchAngle);
    vec2 rotated = vec2(c * coord.x - s * coord.y, s * coord.x + c * coord.y);

    // 生成周期线
    float line = abs(fract(rotated.x / hatchSpacing) - 0.5);

    // 控制线宽
    float mask = smoothstep(0.5 * hatchWidth / hatchSpacing, 0.5 * hatchWidth / hatchSpacing + 0.01, line);

    // mask: 0 是线，1 是底色
    vec3 color = mix(uColor * (1.0 - hatchAlpha), uColor, mask);

    gl_FragColor = vec4(color, uOpacity);
  }

  gl_FragColor = vec4(uColor, 1.0);
}