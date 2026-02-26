/** 支持项目生命周期回调 */
export interface IActor {
  /** 工程初始化阶段: 创建geometry/material/mesh, 注册事件, 申请资源, 添加到scene */
  onInit?(): void | Promise<void>;

  /** 帧循环阶段 */
  onUpdate?(deltaTime?: number, elapsedTime?: number): void;

  /** 销毁 */
  dispose(): void;
}
