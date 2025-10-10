// https://blog.csdn.net/qq_21476953/article/details/112991864
// https://github.com/mapbox/tiny-sdf
// https://github.com/mapbox/tiny-sdf/blob/main/index.js

import * as THREE from "three";

/**
 * 生成SDF标签
 */
class LabelSDF {
  constructor({ height, content }) {
    const bufferF = 8;

    // 影响生成文字图片的分辨率
    const fontSize = 256;

    const fontWidth = fontSize + (fontSize / bufferF) * 2;
    const width = height * content.length;
    this.textInfo = this.getSDF(content, fontSize, bufferF, fontWidth);
    const geo = this.getGeo(width, height, fontWidth, this.textInfo, content);
    const mat = this.getMat(this.textInfo);
    const mesh = new THREE.Mesh(geo, mat);
    this.mesh = setMeshAnchor({ anchorX: 1, anchorY: 0.5, mesh: mesh });
  }

  getMesh() {
    return this.mesh;
  }

  /**
   * 生成sdf文字
   */
  getSDF(content, fontSize, bufferF, fontWidth) {
    var chars = content || "矿工";
    let sdfs = {};
    // debug
    var canvas = document.getElementById("canvas");
    // var canvas = document.createElement('canvas');
    canvas.width = content.length * fontWidth;
    canvas.height = fontWidth;
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var fontSize = fontSize || 32;
    var fontWeight = 500;
    var buffer = fontSize / (bufferF || 8);
    // var radius = fontSize / 3;
    var radius = 0;
    var sdf = new TinySDF(fontSize, buffer, radius, null, null, fontWeight);

    for (var y = 0, i = 0; y + sdf.size <= canvas.height && i < chars.length; y += sdf.size) {
      for (var x = 0; x + sdf.size <= canvas.width && i < chars.length; x += sdf.size) {
        ctx.putImageData(makeRGBAImageData(sdf.draw(chars[i]), sdf.size, ctx), x, y);
        sdfs[chars[i]] = { x: x, y: y };
        i++;
      }
    }
    // console.error(sdfs);
    return {
      ctx: ctx,
      canvas: canvas,
      sdfs,
    };
  }

  getShader() {
    return {
      vs: `
        attribute vec2 a_texcoord;
        varying vec2 v_texcoord;

        void main() {
            v_texcoord = a_texcoord;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }`,
      fs: `
        uniform sampler2D u_texture;
        uniform vec4 u_color;
        uniform float u_weigth;

        varying vec2 v_texcoord;


        void main() {
            const vec3 glyphcolor = vec3(0.0, 1., 1.0);
            const vec3 glowcolor = vec3(0.2, 0, 1.0);
            float dist = texture2D(u_texture, v_texcoord).r;
            float delta = 0.1;
            float finalalpha = smoothstep(0.5-delta, 0.5+delta, dist);
            vec4 clr = vec4(glyphcolor, dist);

            // 开启描边
            int glow = 1;
            if(glow == 1) {
              clr.rgb = mix(glowcolor, glyphcolor, finalalpha);
              float alpha = smoothstep(0.0, 0.5+(0.6*(1.*0.5)), sqrt(dist));
              clr.a = alpha;
            }
            gl_FragColor = clr;
        }`,
    };
  }

  getMat(textInfo) {
    const Shader = this.getShader();
    const texture = new THREE.Texture(textInfo.canvas);
    texture.needsUpdate = true;
    let material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      // todo: 不明白为什么必须开启透明或者改变混合模式
      transparent: true,
      uniforms: {
        u_texsize: {
          value: new THREE.Vector2(textInfo.canvas.width, textInfo.canvas.height),
        },
        u_color: { value: new THREE.Vector4(0, 1, 0, 1) },
        u_texture: { value: texture, type: "t" },
        u_weigth: { value: 0.1, type: "f" },
      },
      vertexShader: Shader.vs,
      fragmentShader: Shader.fs,
    });

    return material;
  }

  getGeo(width, height, fontWidth, textInfo, content) {
    const count = content.length;
    const cHeight = textInfo.canvas.height;
    const cWidth = textInfo.canvas.width;
    let geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, height, 0, 0, 0, 0, width, 0, 0, width, height, 0], 3));
    geometry.setIndex([1, 2, 0, 2, 3, 0]);

    const textureElements = [];
    textureElements.push(
      0,
      1,

      0,
      1 - fontWidth / cHeight,

      (fontWidth * count) / cWidth,
      1 - fontWidth / cHeight,

      (fontWidth * count) / cWidth,
      1,
    );
    geometry.setAttribute("a_texcoord", new THREE.BufferAttribute(new Float32Array(textureElements), 2));
    return geometry;
  }
}

// this.textInfo = null;
// this.stage = new Stage("#app");
// this.stage.run();
// // todo,对英文间距大
// let label = new LabelSDF({ height: 100, content: "你好" });
// this.stage.scene.add(label.getMesh());
