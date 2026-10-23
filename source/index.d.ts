declare type MapTypeK<T> = T extends Map<infer K, any> ? K : never;
declare type MapTypeV<T> = T extends Map<any, infer V> ? V : never;
declare type RecordTypeK<T> = T extends Record<infer K, any> ? K : never;
declare type RecordTypeV<T> = T extends Record<any, infer V> ? V : never;

type ArrayLike = ArrayConstructor<T> | T[];
declare type Array2<T> = [T, T] | ArrayLike;
declare type Array3<T> = [T, T, T] | ArrayLike;
declare type Array4<T> = [T, T, T, T] | ArrayLike;
declare type Array5<T> = [T, T, T, T, T] | ArrayLike;

/** 通过工具类进行索引查找 */
declare type Findable = {
  title?: string;
  classify?: string; // 标记订阅系列
  subject?: string; // 订阅点标记索引
  description?: string; // 描述索引
  description_i18n?: string; // 国际化之后的描述
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

/** 弹窗生命周期参数  */
declare interface InfoCardOpenOptions {
  /** 组件注册的ref(expose内容) */
  infocardRef?: InfoCardReference;

  /** 挂载到的的dom对象 */
  rootElement?: HTMLDivElement;

  /** 当前弹窗在此弹窗类型中的索引 */
  instanceIndex?: number;

  /** 悬浮窗初始指针的窗口坐标；省略时使用最近捕获的指针位置 */
  pointer?: { clientX: number; clientY: number };

  /** 用于异步任务完成后判断设备是否已切换 */
  isCurrent?: () => boolean;
  [key: string]: any;
}

/** 弹窗(外部脚本可控制)的函数 */
declare interface InfoCardReference {
  /** 打开弹窗 */
  openInfoCard?: (data?: any, options?: InfoCardOpenOptions) => void | Promise<void>;

  /** 关闭弹窗 */
  closeInfoCard?: (instanceIndex?: number) => void;
}

/** 弹窗(用户外部指定)的生命周期函数回调 */
declare interface InfoCardDefaultSlot {
  /** 设置标题 */
  setTitle?: () => any;

  /** 打开弹窗时触发 */
  onOpenInfoCard?: (data: any, options?: InfoCardOpenOptions) => any;

  /** 关闭弹窗时触发 */
  onCloseInfoCard?: () => void;

  /** 缩放弹窗时触发 */
  onResizeInfoCard?: (size: { width: number; height: number }) => void;
}
