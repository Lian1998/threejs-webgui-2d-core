import * as THREE from "three";
import { GeometryCollection } from "geojson";

/** GeoJSON输出格式读取器, 包含几何合并优化 */
export class GeoCollectionLoader extends THREE.Loader<GeometryCollection, string> {
  constructor(manager: THREE.LoadingManager = THREE.DefaultLoadingManager) {
    super(manager);
  }

  /**
   *
   * @param url 一个包含 .geojson 文件的url路径
   * @param onLoad 当文件请求成功时的回调函数; 这个函数入参为文件解析成的JSON报文
   * @param onProgress (可选) 请求过程中的回调; 这个函数的入参为 XMLHttpRequest 实例, 包含了 .total 和 .loaded 字节数量. 如果服务器的响应头没有设置 Content-Length; .total 会是 0.
   * @param onError (可选) 请求失败的回调
   */
  override load(url: string, onLoad: (data: GeometryCollection) => void, onProgress?: (event: ProgressEvent) => void, onError?: (err: unknown) => void) {
    const scope = this;

    let _resourcePath: string = undefined; // 根据全局配置等解析出的文件请求路径

    if (this.resourcePath !== "") {
      _resourcePath = this.resourcePath;
    } else if (this.path !== "") {
      const relativeUrl = THREE.LoaderUtils.extractUrlBase(url);
      _resourcePath = THREE.LoaderUtils.resolveURL(relativeUrl, this.path);
    } else {
      _resourcePath = THREE.LoaderUtils.extractUrlBase(url);
    }

    this.manager.itemStart(url);

    const _onError = (e: Error) => {
      if (onError) onError(e);
      else console.error(e);

      scope.manager.itemError(url);
      scope.manager.itemEnd(url);
    };

    const loader = new THREE.FileLoader(this.manager);

    loader.setPath(this.path);
    loader.setResponseType("json"); // "", "text", "arraybuffer", "blob", "document", "ms-stream"
    loader.setRequestHeader(this.requestHeader);
    loader.setWithCredentials(this.withCredentials);

    loader.load(
      url,
      (data: any) => {
        try {
          // 用此类定义的parse函数解析json
          scope.parse(
            data as GeometryCollection,
            _resourcePath,
            (_data: GeometryCollection) => {
              // onLoad(_data);
              scope.manager.itemEnd(url);
            },
            _onError,
          );
        } catch (e) {
          _onError(e);
        }
      },
      onProgress,
      _onError,
    );
  }

  parse(data: GeometryCollection, path: string, onLoad: (data: GeometryCollection) => void, onError: (err: unknown) => void) {}

  async parseAsync(data: GeometryCollection, path: string) {
    const scope = this;

    return new Promise((resolve, reject) => {
      scope.parse(data, path, resolve, reject);
    });
  }
}
