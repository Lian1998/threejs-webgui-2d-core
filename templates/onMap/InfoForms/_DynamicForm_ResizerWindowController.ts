import { DOMElements } from "@2dmapv2/onMap/index";
import type { TableProps } from "ant-design-vue";

/**
 * 注册到拥有 DynamicForm 弹窗的上下文
 * 此控制类可以使得 DynamicFomr 弹窗具有可拖拽缩放的特性
 *
 * 1. 在弹窗内缩放操控按钮上按下
 * 2. 弹出 2dmapv2.onmap.mask 蒙层
 * 3. 在蒙层上监听 mousemove, moseup 事件
 * 4. 弹窗默认最小长宽为初始化时设置值, 最大长宽与当前浏览器相关
 * 5. 设置 弹窗内表格的最大高度, 设置弹窗的最大宽度
 * 6. 当拖拽时, 会用canvas2d在蒙层上绘制一个白色的矩形提示框以提示当前拖拽大小
 */
export class ResizerWindowController {
  static isInitialized = false;
  static maskEl: HTMLDivElement = undefined;
  static tipCanvasEl: HTMLCanvasElement = undefined;
  static tipCanvasElContext: CanvasRenderingContext2D = undefined;
  static maxWidth = 0;
  static maxHeight = 0;

  // 来自组件的指针
  containerEl: HTMLElement = undefined;
  resizerEl: HTMLElement = undefined;
  tableEl: HTMLElement = undefined;
  antTableBodyEl: HTMLElement = undefined;
  scrollProp: TableProps["scroll"] = undefined;

  // 需要计算记录的值
  origined = false;
  originWidth = 0; // 设置值最小宽度
  originHeight = 0; // 设置值最小高度
  heightDiff = 0; // 高度显示值与提示值的差值

  settingWidth = 0; // 当前设置值的宽度
  settingHeight = 0; // 当前设置值的高度
  targetWidth = 0; // 目的值的宽度
  targetHeight = 0; // 目的值的高度

  leftTop = { x: 0, y: 0 };
  startClientPoint = { x: 0, y: 0 }; // 按下鼠标时的位置
  startClientPointDiff = { x: 0, y: 0 };

  constructor({ containerEl, resizerEl, tableEl }, scrollProp: TableProps["scroll"]) {
    // 此类的初始化监听
    if (!ResizerWindowController.isInitialized) {
      ResizerWindowController.isInitialized = true;
      const maskEl = DOMElements.mask as HTMLDivElement;
      ResizerWindowController.maskEl = maskEl;

      // 生成一个用于提示当前拖拽框的虚线矩形框, 因此需要一个canvas2d上下文
      const tipCanvasEl = document.createElement("canvas");
      ResizerWindowController.tipCanvasEl = tipCanvasEl;
      ResizerWindowController.tipCanvasElContext = tipCanvasEl.getContext("2d");
      maskEl.appendChild(tipCanvasEl);
      const resize = () => {
        tipCanvasEl.width = window.innerWidth;
        tipCanvasEl.height = window.innerHeight;
        ResizerWindowController.maxWidth = window.innerWidth - 80;
        ResizerWindowController.maxHeight = window.innerHeight - 300;
      };
      window.addEventListener("resize", resize);
      resize();
    }

    // 绑定指针
    this.containerEl = containerEl;
    this.resizerEl = resizerEl;
    this.tableEl = tableEl.$el;
    this.scrollProp = scrollProp;
    this.antTableBodyEl = this.tableEl.getElementsByClassName("ant-table-body").item(0) as HTMLDivElement;

    // 为 resizerEl 绑定按下事件监听
    resizerEl.addEventListener("mousedown", this.startResize);
  }

  startResize = (e: MouseEvent) => {
    // 如果是第一次拖拽并进入此类, 需要初始化默认高度
    if (!this.origined) {
      this.origined = true;
      const { width: cWidth, height: cHeight } = this.containerEl.getBoundingClientRect();
      this.originWidth = cWidth;
      this.originHeight = this.scrollProp.y as number;
      this.heightDiff = cHeight - this.originHeight;
    }

    // 保存当前窗口的位置信息
    const { x, y } = this.containerEl.getBoundingClientRect();
    this.leftTop.x = x;
    this.leftTop.y = y;
    const { width: cWidth } = this.containerEl.getBoundingClientRect();
    this.settingWidth = cWidth;
    this.settingHeight = this.scrollProp.y as number;

    // 打开蒙层并在蒙层上监听移动事件
    const maskEl = ResizerWindowController.maskEl;
    maskEl.classList.add("active");
    maskEl.addEventListener("mousemove", this.handleResize);
    maskEl.addEventListener("mouseup", this.stopResize);

    // 按下时鼠标的位置
    this.startClientPoint.x = e.clientX;
    this.startClientPoint.y = e.clientY;
    this.startClientPointDiff.x = 0;
    this.startClientPointDiff.y = 0;
    this.drawRect();
  };

  drawRect = () => {
    // 清空图层之前生成的用于提示的框
    const tipCanvasEl = ResizerWindowController.tipCanvasEl;
    const tipCanvasElContext = ResizerWindowController.tipCanvasElContext;
    tipCanvasElContext.setLineDash([10, 5]); // 设置虚线样式，参数为 [线段长度, 间隙长度]
    tipCanvasElContext.clearRect(0, 0, tipCanvasEl.width, tipCanvasEl.height);
    tipCanvasElContext.strokeStyle = "white";

    // 计算目标宽度 targetWidth
    this.targetWidth = this.settingWidth + this.startClientPointDiff.x;
    if (this.targetWidth < this.originWidth) this.targetWidth = this.originWidth;
    if (this.targetWidth > ResizerWindowController.maxWidth) this.targetWidth = ResizerWindowController.maxWidth;
    // 计算目标高度 targetHeight
    this.targetHeight = this.settingHeight + this.startClientPointDiff.y;
    if (this.targetHeight < this.originHeight) this.targetHeight = this.originHeight;
    if (this.targetHeight > ResizerWindowController.maxHeight) this.targetHeight = ResizerWindowController.maxHeight;

    // 计算提示框宽度 tooltipWidth
    const tooltipWidth = this.targetWidth;
    // 计算提示框高度 tooltipHeight
    const toolTipHeight = this.targetHeight + this.heightDiff;

    // 绘制提示框
    tipCanvasElContext.strokeRect(this.leftTop.x, this.leftTop.y, tooltipWidth, toolTipHeight); // (x, y, width, height)
  };

  handleResize = (e: MouseEvent) => {
    // console.log("mousemove", e);

    // 将光标移动的差值记录到 startClientPointDiff
    this.startClientPointDiff.x = e.clientX - this.startClientPoint.x;
    this.startClientPointDiff.y = e.clientY - this.startClientPoint.y;

    // 调用绘制框函数
    this.drawRect();
  };

  stopResize = () => {
    // console.log("mouseup");

    // 取消图图层监听的事件
    const maskEl = ResizerWindowController.maskEl;
    maskEl.removeEventListener("mousemove", this.handleResize);
    maskEl.removeEventListener("mouseup", this.stopResize);

    // 将图层隐藏
    maskEl.classList.remove("active");

    // 将图层上绘制的之前的提示框清空
    const tipCanvasEl = ResizerWindowController.tipCanvasEl;
    const tipCanvasElContext = ResizerWindowController.tipCanvasElContext;
    tipCanvasElContext.setLineDash([10, 5]); // 设置虚线样式，参数为 [线段长度, 间隙长度]
    tipCanvasElContext.clearRect(0, 0, tipCanvasEl.width, tipCanvasEl.height);
    tipCanvasElContext.strokeStyle = "white";

    // 将 设置值 设置好
    this.containerEl.style.width = `${this.targetWidth}px`;
    this.scrollProp.y = this.targetHeight;
    this.antTableBodyEl.style.height = `${this.targetHeight}px`;
  };
}
