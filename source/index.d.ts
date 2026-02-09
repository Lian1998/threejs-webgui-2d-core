declare type MapTypeK<T> = T extends Map<infer K, any> ? K : never;
declare type MapTypeV<T> = T extends Map<any, infer V> ? V : never;

declare type Array2<T> = [T, T];
declare type Array3<T> = [T, T, T];
declare type Array4<T> = [T, T, T, T];
declare type Array5<T> = [T, T, T, T, T];

/** 通过工具类进行索引查找 */
declare type Findable = {
  title?: string; // 标题内容
  subject?: string; // 订阅点标记索引
  description?: string; // 描述索引
};

/** 基础状态标签 */
declare type BaseStatusLabelItem = {
  index?: number; // 索引/顺序
  actived?: boolean; // 是否绑定数据逻辑
  currentStatus?: string; // 当前图标状态
  status: { off: string; on?: string } & Record<string, string>; // 图标状态及其对应的路径
  tipValue?: number | string; // 图标中心渲染文字
  title_i18n?: string; // 国际化之后的标题
  description_i18n?: string; // 国际化之后的描述
} & Findable;

/** 基础表格 */
declare type BaseInfoTableItem = {
  title: string; // 此row的标题
  value: (string | number) | (string | number)[]; // 此row的值, 可能是个数组
  isTableTitle?: boolean; // 是否为表格标题行
  isColumnCopyable?: boolean; // value是否支持快速复制
  clickEvent?: Function; // 点击事件的回调函数
  title_i18n?: string; // 国际化之后的标题
  description_i18n?: string; // 国际化之后的描述
} & Findable;

/** 弹框类抽象 */
declare interface InfoCardReference {
  openInfoCard?: (data?: any, options?: { [string]: any }) => void; // 打开弹窗API, 用于业务逻辑调用
  closeInfoCard?: () => void; // 关闭弹窗API
}

/** 弹框类抽象 内部插槽组件的Expose类型 */
declare interface InfoCardDefaultSlot {
  setTitle?: () => any;

  // 打开弹窗的回调函数
  onOpenInfoCard?: (data: any, options?: Partial<{ infocardRef: InfoCardReference; rootElement: HTMLDivElement; instanceIndex: number; [string]: any }>) => Promise<boolean> | any; // prettier-ignore

  // 关闭窗口时的回调函数
  onCloseInfoCard?: () => void;
}
