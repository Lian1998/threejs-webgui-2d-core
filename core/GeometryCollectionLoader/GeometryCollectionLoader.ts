import * as THREE from "three";
import earcut from "earcut";
import { GeometryCollection } from "geojson";

import type { ThreejsGeometryCollection } from "./ThreejsGeometryCollection";

export class GeometryCollectionLoader extends THREE.Loader<ThreejsGeometryCollection, string> {
  constructor(manager: THREE.LoadingManager = THREE.DefaultLoadingManager) {
    super(manager);
  }

  /**
   * Begin loading from url and call the callback function with the parsed response content.
   * @param url A string containing the path/URL of the .geojson file.
   * @param onLoad A function to be called after the loading is successfully completed. The function receives the loaded JSON response returned from parse.
   * @param onProgress (optional) A function to be called while the loading is in progress. The argument will be the XMLHttpRequest instance, that contains .total and .loaded bytes. If the server does not set the Content-Length header; .total will be 0.
   * @param onError (optional) A function to be called if an error occurs during loading. The function receives error as an argument.
   */
  override load(url: string, onLoad: (data: ThreejsGeometryCollection) => void, onProgress?: (event: ProgressEvent) => void, onError?: (err: unknown) => void) {
    const scope = this;

    let _resourcePath: string = undefined;

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
      (data: string) => {
        try {
          // 用此类定义的parse函数解析json
          scope.parse(
            data,
            _resourcePath,
            (_data: ThreejsGeometryCollection) => {
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

  parse(data: string, path: string, onLoad: (data: ThreejsGeometryCollection) => void, onError: (err: unknown) => void) {
    console.log(data);
  }

  parseAsync(data: string, path: string) {
    const scope = this;

    return new Promise((resolve, reject) => {
      scope.parse(data, path, resolve, reject);
    });
  }
}
