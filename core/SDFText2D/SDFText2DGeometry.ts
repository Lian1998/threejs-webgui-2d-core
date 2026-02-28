import * as THREE from "three";

import { tinySDFAtlas } from "@core/SDFText2D/font-atlas/TinySdfAtlas";
import { ATLAS_TEXTURE_SIZE } from "@core/SDFText2D/font-atlas/TinySdfAtlas";
import { SDF_FONT_SIZE } from "@core/SDFText2D/font-atlas/tinySdfWrapper";
import { SDF_BUFFER } from "@core/SDFText2D/font-atlas/tinySdfWrapper";
import { SDF_SIZE } from "@core/SDFText2D/font-atlas/tinySdfWrapper";

interface SDFText2DGeometryParameters {
  text: string;
  fontSize?: number;
  fontSpacingFactor?: number;
  lineHeight?: number;
  padding?: number | number[];
}

/**
 * 根据输入字符串和设置创建网格（单一合并 mesh）
 *  每个 glyph 产生 4 顶点（一个 quad）
 */
export class SDFText2DGeometry extends THREE.BufferGeometry {
  constructor() {
    super();
  }

  /**
   * 根据输入字符串和设置创建网格（单一合并 mesh）
   * 说明：
   *  - 每个 glyph 产生 4 顶点（一个 quad）
   *  - 我们为每个顶点写 position(3), uv(2), aPage(1)
   */
  setFromText(parameters: SDFText2DGeometryParameters) {
    this.dispose();

    const _parameters: SDFText2DGeometryParameters = Object.assign({ fontSize: 4, lineHeight: 5, fontSpacingFactor: 1.0, padding: 0.0 }, parameters);
    const scale = _parameters.fontSize / SDF_FONT_SIZE; // fontAtlas贴图对应放大倍率
    const { text, fontSize, lineHeight, fontSpacingFactor, padding: parametersPaddig } = _parameters;
    const fontSpacing = Math.log2(SDF_FONT_SIZE) * scale * fontSpacingFactor; // 字符间距
    this.resolveParamtersPadding(_parameters); // 按css规则解析padding参数
    const padding = this.padding; // 背景padding间距

    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const pages: number[] = [];
    const types: number[] = [];
    const localPos: number[] = [];
    const localAspect: number[] = [];

    let cursorColumn = 0; // 当前光标在的column
    let cursorX = 0;
    let cursorZ = 0;
    let cursorX_max = 0.0;
    let cursorZ_max = 0.0;
    let indexOffset = 4;

    // 生成字形
    for (const ch of text) {
      if (ch === "\n") {
        cursorColumn = 0;
        cursorX = 0;
        cursorZ += lineHeight;
        continue;
      } else if (ch === "\t") {
        const glyphAtlas = tinySDFAtlas.getGlyphAtlas(" ");
        cursorX += glyphAtlas.glyph.width * scale * 4.0;
        continue;
      }

      const glyphAtlas = tinySDFAtlas.getGlyphAtlas(ch);
      console.warn(ch, glyphAtlas);

      const { page, glyph, u0, v0, u1, v1 } = glyphAtlas;
      const { data, width, height, glyphWidth, glyphHeight, glyphLeft, glyphTop, glyphAdvance } = glyph;
      const w = width * scale;
      const h = height * scale;
      const x = cursorX;
      const y = cursorZ - glyphTop * scale;

      positions.push(x, 0, y, x + w, 0, y, x + w, 0, y + h, x, 0, y + h); // vertex
      uvs.push(u0, v0, u1, v0, u1, v1, u0, v1); // uv
      indices.push(indexOffset, indexOffset + 2, indexOffset + 1, indexOffset, indexOffset + 3, indexOffset + 2);
      pages.push(page, page, page, page);
      types.push(1, 1, 1, 1);
      localPos.push(0, 0, 0, 0, 0, 0, 0, 0);
      localAspect.push(0, 0, 0, 0);
      indexOffset += 4;

      cursorColumn += 1;
      cursorX += glyphAdvance * scale + fontSpacing;
      cursorX_max = Math.max(cursorX_max, cursorX);
      cursorZ_max = Math.max(cursorZ_max, cursorZ);
    }

    // 生成背景
    const halfSDF = (SDF_SIZE * scale) / 2.0;
    const halfFont = fontSize / 2.0;
    const paddingTop = padding[0];
    const paddingRight = padding[1];
    const paddingBottom = padding[2];
    const paddingLeft = padding[3];
    const a1 = [0.0 - paddingLeft, 0.0, 0.0 - paddingBottom - halfSDF]; // 左下
    const a2 = [cursorX_max + paddingRight + halfFont, 0.0, 0.0 - paddingBottom - halfSDF];
    const a3 = [cursorX_max + paddingRight + halfFont, 0.0, cursorZ_max + paddingTop + halfSDF]; // 右上
    const a4 = [0.0 - paddingLeft, 0.0, cursorZ_max + paddingTop + halfSDF];
    const aspect = (cursorZ_max + paddingTop + halfSDF - (-paddingBottom - halfSDF)) / (cursorX_max + paddingRight + halfFont - (0.0 - paddingLeft)); // z / x
    // console.log(aspect);
    positions.unshift(...a1, ...a2, ...a3, ...a4);
    // console.log(...a1, ...a2, ...a3, ...a4);
    uvs.unshift(0, 0, 0, 0, 0, 0, 0, 0);
    indices.unshift(0, 2, 1, 0, 3, 2);
    pages.unshift(0, 0, 0, 0);
    types.unshift(0, 0, 0, 0);
    localPos.unshift(-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5);
    localAspect.unshift(aspect, aspect, aspect, aspect);

    // 绑定buffer
    this.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    this.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    this.setAttribute("aPage", new THREE.Float32BufferAttribute(pages, 1));
    this.setAttribute("aType", new THREE.Float32BufferAttribute(types, 1));
    this.setAttribute("aLocalPos", new THREE.Float32BufferAttribute(localPos, 2)); // 局部空间, 用于计算背景
    this.setAttribute("aLocalAspect", new THREE.Float32BufferAttribute(localAspect, 1)); // 局部空间, 用于计算背景
    this.setIndex(indices);

    // 几何体整体居中
    this.computeBoundingBox();
    this.translate(
      // 居中 XZ 轴 (避免改变 Y)
      -(this.boundingBox.max.x + this.boundingBox.min.x) / 2,
      0,
      -(this.boundingBox.max.z + this.boundingBox.min.z) / 2,
    );
  }

  private padding = [0.0, 0.0, 0.0, 0.0]; // top right bottom left
  private resolveParamtersPadding(parameters: SDFText2DGeometryParameters) {
    for (let i = 0; i < 4; i++) this.padding[i] = 0.0; // 清空状态

    // 直接设置
    if (typeof parameters.padding === "number") {
      this.padding[0] = this.padding[1] = this.padding[2] = this.padding[3] = parameters.padding;
      return;
    }
    // 按照css规则设置
    else if (Array.isArray(parameters.padding)) {
      // 上 右 下 左
      if ((parameters.padding.length = 4)) {
        for (let i = 0; i < 4; i++) this.padding[i] = parameters.padding[i];
        return;
      }
      // 上下 右左
      else if ((parameters.padding.length = 2)) {
        this.padding[0] = this.padding[2] = parameters.padding[0];
        this.padding[1] = this.padding[3] = parameters.padding[1];
        return;
      }
      //  上 右左 下
      else if ((parameters.padding.length = 3)) {
        this.padding[0] = parameters.padding[0];
        this.padding[1] = this.padding[3] = parameters.padding[1];
        this.padding[2] = parameters.padding[2];
        return;
      }
      // 上右下左
      else if ((parameters.padding.length = 1)) {
        this.padding[0] = this.padding[1] = this.padding[2] = this.padding[3] = parameters.padding[0];
        return;
      }
    }

    throw new Error(`SDFText2DGeometry: ${parameters.text} padding 参数设置有误`);
  }
}
