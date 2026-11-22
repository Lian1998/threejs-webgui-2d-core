import "normalize.css";

export const channel = new BroadcastChannel("render-share");

export const initialization = () => {
  const canvas: HTMLCanvasElement = document.querySelector("#viewport");
  const ctx = canvas.getContext("bitmaprenderer"); // 支持直接渲染 ImageBitmap

  channel.onmessage = (e) => {
    console.warn("GpuPickManager Debug Visualization Listening to rendering");
    if (!e.data) return;
    if (!e.data.bitmap) return;
    const { width, height, bitmap } = e.data;
    ctx.canvas.width = width;
    ctx.canvas.height = height;
    ctx.transferFromImageBitmap(bitmap);
  };
};
