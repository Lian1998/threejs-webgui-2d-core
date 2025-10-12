uniform sampler2D u_texture;
uniform vec4 u_color;
uniform float u_weigth;

varying vec2 v_texcoord;

void main() {
  // float dist = texture2D(u_texture, v_texcoord).r; // 有字形的地方是0

  // const vec3 glyphcolor = vec3(1.0, 0.0, 0.0);
  // float glyphDelta = 0.1;
  // float alpha = smoothstep(0.0, 0.1, dist);
  // vec4 clr = vec4(glyphcolor, alpha);

  // 开启描边
  // const vec3 glowcolor = vec3(0.2, 0, 1.0);
  // float delta = 0.1;
  // float finalalpha = smoothstep(0.5 - delta, 0.5 + delta, dist);
  // int glow = 1;
  // if (glow == 1) {
  //   clr.rgb = mix(glowcolor, glyphcolor, finalalpha);
  //   float alpha = smoothstep(0.0, 0.5 + (0.6 * (1. * 0.5)), sqrt(dist));
  //   clr.a = alpha;
  // }

  // gl_FragColor = clr;
  float dist = texture2D(u_texture, v_texcoord).a;
  const vec3 glyphcolor = vec3(1.0, 0.0, 0.0);
  const float glyphDelta = 0.5;
  float alpha = smoothstep(1.0 - glyphDelta, 1.0, dist);
  gl_FragColor = vec4(glyphcolor, alpha);

  // vec4 tColor = texture2D(u_texture, v_texcoord);
  // gl_FragColor = tColor;

  // gl_FragDepth = 1.0;
}