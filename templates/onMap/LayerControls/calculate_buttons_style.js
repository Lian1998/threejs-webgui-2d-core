//////////////////////////////////////////////////////
//
// 此脚本用于计算LayerControl类型的 旋出按钮的按钮样式
// 可以反复使用此脚本达成多层旋出按钮的效果
//
// 输出:
// cssStr1 active时按钮的样式
// cssStr2 deactive时按钮的样式
//
//////////////////////////////////////////////////////

let cssStr1 = "";
let cssStr2 = "";
const buttonNum = 6; // 有几个按钮
const polar = 35 + 10 + 30; // 圆心距
const anger = 360; // 占用角
const angerEach = anger / buttonNum; // 占用角(平分)

// 模型: { no: number, tx: string, ty: string, rotation: string }
const infos = [];

for (let i = 0; i < buttonNum; i++) {
  const start = -90; // 0为正右方
  const anger = start - angerEach * i;
  const rad = (anger * Math.PI) / 180;
  const tx = Math.cos(rad) * polar;
  const ty = Math.sin(rad) * polar;
  infos.push({
    no: i,
    tx: tx.toFixed(1),
    ty: ty.toFixed(1),
    rotation: (180 + Math.random() * 360).toFixed(1),
  });
}

for (let i = 0; i < infos.length; i++) {
  const info = infos[i];
  cssStr1 += /*css*/ `
.sub-button:nth-child(${info.no + 1}) {
  transform: translate(${info.tx}px, ${info.ty}px) rotateZ(0deg);
}`;
  cssStr2 += /*css*/ `
.sub-button:nth-child(${info.no + 1}) {
  transform: translate(0px, 0px) rotateZ(${info.rotation}deg);
  transition-duration: ${(0.15 + 0.05 * i).toFixed(1)}s;
}`;
}

console.log(cssStr2);
console.log(cssStr1);
