precision highp float;

uniform vec3 cameraPosition;
uniform vec3 uColor;
uniform float uOpacity;
uniform vec2 uResolution;
uniform float uLineWidth;

uniform float uUseDash;
uniform vec2 uDashArray;

uniform float uUseBox;
uniform vec2 uBoxArray;

in vec2 vUv;
in float vCounter;
in float vLineDistance;
in float vLineBreakPoint;
#if defined(USE_PICK_BUFFER_ATTRIBUTE) || defined(USE_PICK_BUFFER_UNIFORM)
flat in vec3 vPickColor;
#endif

out vec4 outColor;

void main() {
  if (vLineBreakPoint > 1e-6) {
    discard;
  }

#ifdef USE_PICK_BUFFER
  outColor = vec4(vPickColor, 1.0);
  return;
#endif

  vec4 diffuseColor = vec4(uColor, uOpacity);

  if (uUseDash == 1.0) {
    float dashLength = max(uDashArray.x, 0.0);
    float gapLength = max(uDashArray.y, 0.0);
    float period = max(dashLength + gapLength, 1e-6);
    float phase = fract(vLineDistance / period) * period;

    if (phase > dashLength) {
      diffuseColor.a = 0.0;
    }
  } else if (uUseBox == 1.0) {
    float axisYFactor = abs(vUv.y - 0.5) * 2.0;
    float boxLineWidth = max(uBoxArray.x, 0.0);
    float lineLimit = boxLineWidth / max(uLineWidth, 1e-6);
    float connectorLength = uBoxArray.y / 3.0 * 4.0;
    float boxStepLength = uBoxArray.y;
    float period = max(connectorLength + boxStepLength, 1e-6);
    float stripeXFactor = fract(vLineDistance / period) * period;
    float boxMask = step(connectorLength, stripeXFactor);

    if (boxMask < 1e-6) {
      float edge1 = lineLimit / 2.0;
      float mask1 = 1.0 - smoothstep(edge1 - axisYFactor, edge1 + axisYFactor, axisYFactor);
      diffuseColor.a *= mask1;
    } else {
      float edge1 = 1.0 - (lineLimit / 2.0);
      float mask1 = 1.0 - smoothstep(edge1 - axisYFactor, edge1 + axisYFactor, axisYFactor);

      float edge2 = lineLimit;
      float mask2 = smoothstep(period, period - edge2, stripeXFactor);
      float mask3 = 1.0 - smoothstep(connectorLength + edge2, connectorLength, stripeXFactor);
      float mask4 = mask1 * mask2 * mask3;

      diffuseColor.a *= 1.0 - mask4;
    }
  }

  if (diffuseColor.a <= 0.0) {
    discard;
  }

  outColor = diffuseColor;
}
