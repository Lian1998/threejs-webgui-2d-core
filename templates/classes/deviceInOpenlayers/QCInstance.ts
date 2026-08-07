import { qcLayer } from "@2dmapv2/inMap/";
import { qcTrolleyLayer } from "@2dmapv2/inMap/";
import { qcInventoryLayer } from "@2dmapv2/inMap/";
import { resizeFactor } from "@2dmapv2/inMap/";
import { calculateTargetBaseScale } from "@2dmapv2/inMap/openlayerUtils";
import { setStyleByMoveKind } from "@2dmapv2/inMap/projectUtils";
import { LOGIC_CENTER } from "@2dmapv2/inMap/coordinateTrans";
import { getContainerGeometryQC } from "@2dmapv2/inMap/containerGeometry";

import { qcInfoCardRef } from "@2dmapv2/onMap";

import { getColorString } from "@2dmapv2/classes/colorConfig";
import { getColorFill } from "@2dmapv2/classes/colorConfig";
import tinycolor from "tinycolor2";

import ImageState from "ol/ImageState.js";
import IconP from "ol/style/IconP";
import IconImage from "ol/style/IconImage";
import Feature from "ol/Feature";
import Style from "ol/style/Style";
import Text from "ol/style/Text";
import Point from "ol/geom/Point";
import Polygon from "ol/geom/Polygon";

const gantry_image_normal = new IconImage(null, "/v2/inmap/dachanwan_qc_gantry1.png", null, ImageState.IDLE, getColorString("VARS.DEVICE_STATUS.NORMAL")); // prettier-ignore
const trolley_image_normal = new IconImage(null, "/v2/inmap/dachanwan_qc_trolley.png", null, ImageState.IDLE, tinycolor(getColorString("VARS.DEVICE_STATUS.NORMAL")).darken(25).toString()); // prettier-ignore

const defaultText = getColorFill("LABEL.QC.DEFAULT.TEXT");
const defaultTextBackground = getColorFill("LABEL.QC.DEFAULT.TEXT_BACKGROUND");
const selectedText = getColorFill("LABEL.QC.SELECTED.TEXT");
const selectedTextBackground = getColorFill("LABEL.QC.SELECTED.TEXT_BACKGROUND");

declare type PointerPoolInfer<T extends string> = T extends `${string}_feature` ? Feature<Point> | Feature<Polygon> : T extends `${string}_style` ? Style : T extends `${string}_point` ? Point : T extends `${string}_polygon` ? Polygon : T extends `${string}_icon` ? IconP : T extends `${string}_text` ? Text : never;

declare type PointerPool = {
  [K in `${string}_point` | `${string}_polygon` | `${string}_icon` | `${string}_text` | `${string}_feature` | `${string}_style`]: PointerPoolInfer<K>;
};

export class QCInstance {
  static _selected: string = undefined;
  static initScale = {
    gantry: calculateTargetBaseScale(580, 30),
    trolley: calculateTargetBaseScale(87, 16),
  };

  defaultX = {
    gantry: 484871.47432564414, // 老版本QC的移动逻辑起点为逻辑中心点x轴 LOGIC_CENTER[0],
  };

  defaultY = {
    gantry: 2493686.983488278, // (2493683.0089464504 + 2493652.958030105) / 2.0 + 19; // 大车初始位置
    mtws: 2493652.8457227224 + 2 - 26, // 下轨道向下走20m
    pt: 2493652.8457227224 + 2 - 26,
    pfws: 2493652.8457227224 + 2,
    pfls: 2493652.8457227224 - 2,
  };

  trolleys = ["mtws", "pt"];
  containers = ["mtws", "pt", "pfws", "pfls"];

  id: string = undefined;
  locationXY: Array2<number> = [this.defaultX.gantry, this.defaultY.gantry];
  pool: PointerPool = {};

  constructor(id: string) {
    const _id = id;
    this.id = _id;
    const qcLayer_source = qcLayer.getSource();
    const qcTrolleyLayer_source = qcTrolleyLayer.getSource();
    const qcInventoryLayer_source = qcInventoryLayer.getSource();

    // 大车图元
    const gantry_point = new Point(this.locationXY);
    const gantry_feature = new Feature<Point>();
    gantry_feature.setGeometry(gantry_point);
    gantry_feature.setId(_id);
    const gantry_style = new Style();
    const gantry_icon = new IconP({
      iconImage: gantry_image_normal,
      anchor: [0.5, 0.5],
      scale: QCInstance.initScale.gantry * resizeFactor.value,
    });
    gantry_style.setImage(gantry_icon);
    const gantry_text = new Text({
      text: _id.slice(2),
      font: "16px sans-serif",
      padding: [6.0, 12.0, 0.0, 12.0],
      offsetY: -35 * resizeFactor.value,
      fill: defaultText,
      backgroundFill: defaultTextBackground,
    });
    gantry_style.setText(gantry_text);
    gantry_feature.setStyle(gantry_style);
    qcLayer_source.addFeature(gantry_feature);

    // 吊具图元
    const trolley_style = new Style();
    const trolley_icon = new IconP({ iconImage: trolley_image_normal, anchor: [0.5, 0.5], scale: QCInstance.initScale.trolley });

    for (let i = 0; i < this.trolleys.length; i++) {
      const key = this.trolleys[i];
      const feature = new Feature<Point>();
      const point = new Point([this.locationXY[0], this.defaultY[key]]);
      feature.setGeometry(point);
      trolley_style.setImage(trolley_icon);
      feature.setStyle(trolley_style);
      qcTrolleyLayer_source.addFeature(feature);

      this.pool[`${key}_feature`] = feature;
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
      qcInventoryLayer_source.addFeature(feature);

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
      QCInstance._selected = this.id;
      this.onFocus();

      if (qcInfoCardRef.value) {
        qcInfoCardRef.value.openInfoCard(this.id);
      }
    });
    gantry_feature.set("cancelSelected", () => {
      QCInstance._selected = undefined;
      this.onUnFocus();
    });
    gantry_feature.set("movein", this.onFocus);
    gantry_feature.set("moveout", this.onUnFocus);
  }

  onResize = () => {
    this.pool.gantry_icon.setScale(QCInstance.initScale.gantry * resizeFactor.value);
    this.pool.gantry_feature.changed();

    this.pool.trolley_icon.setScale(QCInstance.initScale.trolley * resizeFactor.value);
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
    if (QCInstance._selected === this.id) return;
    this.pool.gantry_text.setFill(defaultText);
    this.pool.gantry_text.setBackgroundFill(defaultTextBackground);
    this.pool.gantry_feature.changed();
  };

  /**
   * 更新大车位置
   * @param value
   */
  setGantryPosition = (value: number) => {
    this.locationXY[0] = this.defaultX.gantry + value / 100.0;
    this.pool.gantry_point.setCoordinates(this.locationXY);
    this.pool.gantry_feature.changed();

    // 更新所有小车
    for (let i = 0; i < this.trolleys.length; i++) {
      const key = this.trolleys[i];
      this.setTrolleyPosition(key);
    }
  };

  /**
   * 更新小车位置
   * @param key
   * @param value
   * @returns
   */
  setTrolleyPosition = (key: string, value?: number) => {
    if (!this.pool[`${key}_feature`]) return;

    const _coord = (this.pool[`${key}_point`] as Point).getCoordinates();
    _coord[0] = this.locationXY[0];
    if (value !== undefined) _coord[1] = this.defaultY[key] + value / 1000.0;
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
    let center = undefined;
    // 平台
    if (key.includes("pf")) center = [this.locationXY[0], this.defaultY[key]];
    // 吊具
    else center = this.pool[`${key}_point`].getCoordinates() as Array2<number>;

    const _lock = this.lastContainersStatus[`${key}_lock`];
    const _size = this.lastContainersStatus[`${key}_size`];
    if (_lock === 1) {
      this.pool[`${key}Containers_polygon`].setCoordinates(getContainerGeometryQC(center, _size));
    } else if (_lock === 2) {
      this.pool[`${key}Containers_polygon`].setCoordinates(getContainerGeometryQC(center, 0));
    }

    this.pool[`${key}Containers_feature`].changed();
  };
}
