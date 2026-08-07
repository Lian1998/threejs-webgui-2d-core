import { ycLayer } from "@2dmapv2/inMap/";
import { ycTrolleyLayer } from "@2dmapv2/inMap/";
import { ycInventoryLayer } from "@2dmapv2/inMap/";
import { resizeFactor } from "@2dmapv2/inMap/";
import { calculateTargetBaseScale } from "@2dmapv2/inMap/openlayerUtils";
import { setStyleByMoveKind } from "@2dmapv2/inMap/projectUtils";
import { getContainerGeometryYC } from "@2dmapv2/inMap/containerGeometry";

import { getColorString } from "@2dmapv2/classes/colorConfig";
import { getColorFill } from "@2dmapv2/classes/colorConfig";

import { YCMap } from "@2dmapv2/data/";
import { BlockMap } from "@2dmapv2/data/";

import tinycolor from "tinycolor2";

import ImageState from "ol/ImageState.js";
import IconP from "ol/style/IconP";
import IconImage from "ol/style/IconImage";
import Feature from "ol/Feature";
import Style from "ol/style/Style";
import Text from "ol/style/Text";
import Point from "ol/geom/Point";
import Polygon from "ol/geom/Polygon";

import { ycInfoCardRef } from "@2dmapv2/onMap";

const gantry_single_image_normal = new IconImage(null, "/v2/inmap/dachanwan_yc_gantry_single.png", null, ImageState.IDLE, getColorString("VARS.DEVICE_STATUS.NORMAL")); // prettier-ignore
const gantry_double_image_normal = new IconImage(null, "/v2/inmap/dachanwan_yc_gantry_double.png", null, ImageState.IDLE, getColorString("VARS.DEVICE_STATUS.NORMAL")); // prettier-ignore
const trolley_image_normal = new IconImage(null, "/v2/inmap/dachanwan_yc_trolley.png", null, ImageState.IDLE, tinycolor(getColorString("VARS.DEVICE_STATUS.NORMAL")).darken(25).toString()); // prettier-ignore

const defaultText = getColorFill("LABEL.YC.DEFAULT.TEXT");
const defaultTextBackground = getColorFill("LABEL.YC.DEFAULT.TEXT_BACKGROUND");
const selectedText = getColorFill("LABEL.YC.SELECTED.TEXT");
const selectedTextBackground = getColorFill("LABEL.YC.SELECTED.TEXT_BACKGROUND");

declare type PointerPoolInfer<T extends string> = T extends `${string}_feature` ? Feature<Point> | Feature<Polygon> : T extends `${string}_style` ? Style : T extends `${string}_point` ? Point : T extends `${string}_polygon` ? Polygon : T extends `${string}_icon` ? IconP : T extends `${string}_text` ? Text : never;

declare type PointerPool = {
  [K in `${string}_point` | `${string}_polygon` | `${string}_icon` | `${string}_text` | `${string}_feature` | `${string}_style`]: PointerPoolInfer<K>;
};

export class YCInstance {
  static _selected: string = undefined;

  initScale = {
    gantry: 0.0,
    trolley: calculateTargetBaseScale(87, 16),
  };

  defaultX = {
    gantry: 0.0,
  };

  defaultY = {
    gantry: 0.0,
    mt: 0.0,
  };

  trolleys = ["mt"];
  containers = ["mt"];

  gantry_image_normal = gantry_double_image_normal;

  id: string = undefined;
  blockItem: MapTypeV<typeof BlockMap> = undefined;
  locationXY: Array2<number> = [0.0, 0.0];
  pool: PointerPool = {};

  constructor(id: string) {
    const _id = id;
    this.id = _id;
    const ycLayer_source = ycLayer.getSource();
    const ycTrolleyLayer_source = ycTrolleyLayer.getSource();
    const ycInventoryLayer_source = ycInventoryLayer.getSource();

    // 初始化位置
    const ycItem = YCMap.get(id);
    let blockItem = BlockMap.get(ycItem.information["BLOCK_NAME"]); // 设备表定义的所在堆场
    const blockDefs = blockItem.defs; // 堆场定义(手动输入的)
    // if (blockDefs.crossStreet) blockItem = BlockMap.get(blockDefs.crossStreet); // 如果定义为可跨堆场, 就走跨堆场目标坐标
    this.blockItem = blockItem;
    this.defaultX.gantry = blockItem.positions[0];
    this.defaultY.gantry = (blockItem.positions[1] + blockItem.positions[3]) / 2;
    this.locationXY[0] = this.defaultX.gantry;
    this.locationXY[1] = this.defaultY.gantry;
    this.defaultY.mt = blockItem.positions[1] + 5.56 + (blockDefs.railPitch - 37) / 2;

    // {
    //   const randomIdOffset = Number.parseInt(id.slice(1)) % 3;
    //   const randomFactor = 360 * Math.random();
    //   const randomOffset = 360 * 0.33 * randomIdOffset + 0.33 * randomFactor;
    //   this.locationXY[0] = this.defaultX.gantry - randomOffset;
    //   this.locationXY[1] = this.defaultY.gantry;
    // }

    // 初始化图的大小
    this.initScale.gantry = calculateTargetBaseScale(1480, blockDefs.railPitch);
    // 判断是否单悬臂
    if (!blockDefs.doubleSide) this.gantry_image_normal = gantry_single_image_normal;

    // 大车图元
    const gantry_point = new Point(this.locationXY);
    const gantry_feature = new Feature({ geometry: gantry_point });
    gantry_feature.setId(_id);

    const gantry_style = new Style();
    const gantry_icon = new IconP({
      iconImage: this.gantry_image_normal,
      anchor: [0.5, 0.5],
      scale: this.initScale.gantry * resizeFactor.value,
    });
    gantry_style.setImage(gantry_icon);
    const gantry_text = new Text({
      text: _id.slice(1),
      font: "16px sans-serif",
      padding: [6.0, 12.0, 0.0, 12.0],
      fill: defaultText,
      backgroundFill: defaultTextBackground,
    });
    gantry_style.setText(gantry_text);
    gantry_feature.setStyle(gantry_style);
    ycLayer_source.addFeature(gantry_feature);

    // 吊具图元
    const trolley_style = new Style();
    const trolley_icon = new IconP({ iconImage: trolley_image_normal, anchor: [0.5, 0.5], scale: this.initScale.trolley });

    for (let i = 0; i < this.trolleys.length; i++) {
      const key = this.trolleys[i];
      const feature = new Feature<Point>();
      const point = new Point([this.locationXY[0], this.defaultY.mt]);
      feature.setGeometry(point);
      trolley_style.setImage(trolley_icon);
      feature.setStyle(trolley_style);
      ycTrolleyLayer_source.addFeature(feature);

      this.pool[`${key}_feature`] = feature;
      this.pool[`${key}_point`] = point;
      this.pool[`${key}_point`] = point;
    }

    // 集装箱
    for (let i = 0; i < this.containers.length; i++) {
      const key = this.containers[i];
      const feature = new Feature<Polygon>();
      const polygon = new Polygon([]);
      feature.setGeometry(polygon);
      const style = new Style();
      feature.setStyle(style);
      ycInventoryLayer_source.addFeature(feature);

      this.pool[`${key}Containers_feature`] = feature;
      this.pool[`${key}Containers_polygon`] = polygon;
      this.pool[`${key}Containers_style`] = style;
      setStyleByMoveKind("UNKNOWN", style);
    }

    // 绑定指针
    this.pool.gantry_feature = gantry_feature;
    this.pool.gantry_point = gantry_point;
    this.pool.gantry_icon = gantry_icon;
    this.pool.gantry_text = gantry_text;
    this.pool.trolley_icon = trolley_icon;

    // 绑定事件
    gantry_feature.set("resize", this.onResize);
    gantry_feature.set("selected", () => {
      YCInstance._selected = this.id;
      this.onFocus();

      if (ycInfoCardRef.value) {
        ycInfoCardRef.value.openInfoCard(this.id);
      }
    });
    gantry_feature.set("cancelSelected", () => {
      YCInstance._selected = undefined;
      this.onUnFocus();
    });
    gantry_feature.set("movein", this.onFocus);
    gantry_feature.set("moveout", this.onUnFocus);

    // {
    //   this.setMTPosition(Math.random() * 30.0 * 1000.0);
    //   this.setMTContainers(Math.floor(Math.random() * 10.0));
    // }
  }

  onResize = () => {
    this.pool.gantry_icon.setScale(this.initScale.gantry * resizeFactor.value);
    this.pool.gantry_feature.changed();

    this.pool.trolley_icon.setScale(this.initScale.trolley * resizeFactor.value);
    for (let i = 0; i < this.trolleys.length; i++) {
      const key = this.trolleys[i];
      const trolley_feature = this.pool[`${key}_feature`];
      if (trolley_feature) trolley_feature.changed();
    }
  };

  onFocus = () => {
    this.pool.gantry_text.setFill(selectedText);
    this.pool.gantry_text.setBackgroundFill(selectedTextBackground);
    this.pool.gantry_feature.changed();
  };

  onUnFocus = () => {
    if (YCInstance._selected === this.id) return;
    this.pool.gantry_text.setFill(defaultText);
    this.pool.gantry_text.setBackgroundFill(defaultTextBackground);
    this.pool.gantry_feature.changed();
  };

  /** 更新大车位置 */
  setGantryPosition = (value: number) => {
    this.locationXY[0] = this.defaultX.gantry - value / 1000.0;
    this.pool.gantry_point.setCoordinates(this.locationXY);
    this.pool.gantry_feature.changed();

    // 更新所有小车
    for (let i = 0; i < this.trolleys.length; i++) {
      const key = this.trolleys[i];
      this.setTrolleyPosition(key);
    }
  };

  /** 更新主小车位置 */
  setTrolleyPosition = (key: string, value?: number) => {
    if (!this.pool[`${key}_feature`]) return;

    const _coord = (this.pool[`${key}_point`] as Point).getCoordinates();
    _coord[0] = this.locationXY[0];
    if (value !== undefined) _coord[1] = this.defaultY[key] - value / 1000.0;
    this.pool[`${key}_point`].setCoordinates(_coord);
    this.pool[`${key}_feature`].changed();

    this.setContainers(key);
  };

  lastContainersStatus = {};

  /**
   * 更新集装箱
   * @param key
   * @param lock 1:Lock 2:Unlock
   * @param size 0:Null 1:Empty 2:Center20 3:Center40 4:Center45 5:Twin20 6:Center30 7:Changing 8:Left20 9:Right20
   * @param moveKind "装船" "卸船" "移箱" "未知" "提箱" "收箱"
   */
  setContainers = (key: string, lock?: number, size?: number, moveKind?: string) => {
    if (!this.pool[`${key}Containers_feature`]) return;

    if (lock !== undefined) this.lastContainersStatus[`${key}_lock`] = lock;
    if (size !== undefined) this.lastContainersStatus[`${key}_size`] = size;
    if (moveKind !== undefined) setStyleByMoveKind(moveKind, this.pool[`${key}Containers_style`]); // 更新箱子moveKind

    // 更新箱子几何
    const center = this.pool[`${key}_point`].getCoordinates() as Array2<number>;
    const _lock = this.lastContainersStatus[`${key}_lock`];
    const _size = this.lastContainersStatus[`${key}_size`];
    if (_lock == 1) {
      this.pool[`${key}Containers_polygon`].setCoordinates(getContainerGeometryYC(center, _size));
    } else if (_lock == 2) {
      this.pool[`${key}Containers_polygon`].setCoordinates(getContainerGeometryYC(center, 0));
    }

    this.pool[`${key}Containers_feature`].changed();
  };
}
