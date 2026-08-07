import { igvLayer } from "@2dmapv2/inMap/";
import { igvInventoryLayer } from "@2dmapv2/inMap/";
import { igvIdLayer } from "@2dmapv2/inMap/";
import { igvLockAreaLayer } from "@2dmapv2/inMap/";
import { igvRouteLayer } from "@2dmapv2/inMap/";
import { igvInfoLayer } from "@2dmapv2/inMap/";
import { resizeFactor } from "@2dmapv2/inMap/";
import { calculateTargetBaseScale } from "@2dmapv2/inMap/openlayerUtils";
import { setStyleByMoveKind } from "@2dmapv2/inMap/projectUtils";
import { coordinateTrans_mm_x } from "@2dmapv2/inMap/coordinateTrans";
import { coordinateTrans_mm_y } from "@2dmapv2/inMap/coordinateTrans";
import { coordinateTrans_mm } from "@2dmapv2/inMap/coordinateTrans";
import { coordinateTrans_cm_x } from "@2dmapv2/inMap/coordinateTrans";
import { coordinateTrans_cm_y } from "@2dmapv2/inMap/coordinateTrans";
import { getContainerGeometryQC } from "@2dmapv2/inMap/containerGeometry";

import { igvInfoCardRef } from "@2dmapv2/onMap";

import { getColorString } from "@2dmapv2/classes/colorConfig";
import { getColorFill } from "@2dmapv2/classes/colorConfig";
import tinycolor from "tinycolor2";

import ImageState from "ol/ImageState.js";
import IconP from "ol/style/IconP";
import IconImage from "ol/style/IconImage";
import Feature from "ol/Feature";
import Style from "ol/style/Style";
import Stroke from "ol/style/Stroke";
import Text from "ol/style/Text";
import Point from "ol/geom/Point";
import Polygon from "ol/geom/Polygon";
import LineString from "ol/geom/LineString";
import { rotate } from "ol/geom/flat/transform";
import { getAccValue } from "@2dmapv2/classes/DataHelper";

const body_image_normal = new IconImage(null, "/v2/inmap/IGV_AA_BASE.png", null, ImageState.IDLE, getColorString("VARS.DEVICE_STATUS.NORMAL")); // prettier-ignore
// const body_image_offline = new IconImage(null, "/v2/inmap/IGV_AA_BASE.png", null, ImageState.IDLE, getColorString("VARS.DEVICE_STATUS.OFFLINE")); // prettier-ignore
// const body_image_arrived = new IconImage(null, "/v2/inmap/IGV_AA_BASE.png", null, ImageState.IDLE, getColorString("VARS.DEVICE_STATUS.ARRIVED")); // prettier-ignore
// const body_image_fault = new IconImage(null, "/v2/inmap/IGV_AA_BASE.png", null, ImageState.IDLE, getColorString("VARS.DEVICE_STATUS.FAULT")); // prettier-ignore
const header_image = new IconImage(null, "/v2/inmap/IGV_AA_HEADER.png", null, ImageState.IDLE, null); // prettier-ignore

const defaultText = getColorFill("LABEL.IGV.DEFAULT.TEXT");
const defaultTextBackground = getColorFill("LABEL.IGV.DEFAULT.TEXT_BACKGROUND");
const selectedText = getColorFill("LABEL.IGV.SELECTED.TEXT");
const selectedTextBackground = getColorFill("LABEL.IGV.SELECTED.TEXT_BACKGROUND");

const lockArea_style = new Style({ fill: getColorFill("IGV.LOCK_AREA.FILL") });

const routeTerminal_feature = new Feature<Point>();
const routeTerminal_point = new Point([]);
routeTerminal_feature.setGeometry(routeTerminal_point);
const routeTerminal_style = new Style();
const routeTerminal_icon = new IconP({ anchor: [0.3, 0.8], scale: 0.25, iconImage:  new IconImage(null, "/v2/inmap/IGV_T.png", null, ImageState.IDLE, getColorString("IGV.ROUTE.TERMINAL")), }); // prettier-ignore
routeTerminal_style.setImage(routeTerminal_icon);
const routeTerminal_hidden_style = new Style();
routeTerminal_feature.setStyle(routeTerminal_hidden_style);

declare type PointerPoolInfer<T extends string> = T extends `${string}_feature`
  ? Feature<Point> | Feature<Polygon> | Feature<LineString>
  : T extends `${string}_style`
    ? Style
    : T extends `${string}_point`
      ? Point
      : T extends `${string}_lineString`
        ? LineString
        : T extends `${string}_polygon`
          ? Polygon
          : T extends `${string}_icon`
            ? IconP
            : T extends `${string}_text`
              ? Text
              : never;

declare type PointerPool = {
  [K in `${string}_point` | `${string}_lineString` | `${string}_polygon` | `${string}_icon` | `${string}_text` | `${string}_feature` | `${string}_style`]: PointerPoolInfer<K>;
};

export class IGVInstance {
  static showRouteTerminal: boolean = true;
  static _sequence: number = 0;
  static _selected: string = undefined;
  static _hover: string = undefined;
  static initScale = {
    body: calculateTargetBaseScale(150, 15),
    header: calculateTargetBaseScale(150, 15),
    igvId: 0.3,
    igvIdHover: 0.6,
  };
  static routeWidth = {
    default: {
      current: 1.5,
      pass: 1.5,
    },
    selected: {
      current: 5,
      pass: 3,
    },
  };

  containers = ["front", "behind"];
  routes = ["pass", "current"];

  id: string = undefined;
  sequence: number = undefined;
  locationXY: Array2<number> = [0.0, 0.0];
  rotation: number = 0.0;
  pool: PointerPool = {};

  static {
    const igvInfoLayer_source = igvInfoLayer.getSource();
    if (IGVInstance.showRouteTerminal) {
      igvInfoLayer_source.addFeature(routeTerminal_feature);
    }
  }

  constructor(id: string) {
    IGVInstance._sequence += 1;
    this.sequence = IGVInstance._sequence;
    const _id = id;
    this.id = _id;
    const igvLayer_source = igvLayer.getSource();
    const igvInventoryLayer_source = igvInventoryLayer.getSource();
    const igvLockAreaLayer_source = igvLockAreaLayer.getSource();
    const igvRouteLayer_source = igvRouteLayer.getSource();
    const igvIdLayer_source = igvIdLayer.getSource();

    // 车身
    const body_style = new Style();
    const body_icon = new IconP({
      iconImage: body_image_normal,
      anchor: [0.5, 0.5],
      scale: IGVInstance.initScale.body * resizeFactor.value,
      rotation: this.rotation,
    });
    body_style.setImage(body_icon);

    // 车头
    const header_style = new Style();
    const header_icon = new IconP({
      iconImage: header_image,
      anchor: [0.5, 0.5],
      scale: IGVInstance.initScale.header * resizeFactor.value,
      rotation: this.rotation,
    });
    header_style.setImage(header_icon);

    // 车
    const igv_feature = new Feature<Point>();
    const igv_point = new Point(this.locationXY);
    igv_feature.setGeometry(igv_point);
    igv_feature.setId(_id);
    igv_feature.setStyle([body_style, header_style]);
    igvLayer_source.addFeature(igv_feature);

    // 车ID
    const igvId_feature = new Feature<Point>();
    const igvId_point = new Point([0.0, 0.0]);
    igvId_feature.setGeometry(igvId_point);
    const igvId_text = new Text({
      text: _id.slice(1),
      font: "bold 14px sans-serif",
      scale: IGVInstance.initScale.igvId * resizeFactor.value,
      fill: defaultText,
      backgroundFill: defaultTextBackground,
    });
    const igvId_style = new Style();
    igvId_style.setZIndex(this.sequence);
    igvId_style.setText(igvId_text);
    igvId_feature.setStyle(igvId_style);
    igvId_feature.setId(id);
    igvIdLayer_source.addFeature(igvId_feature);

    // 集装箱
    for (let i = 0; i < this.containers.length; i++) {
      const key = this.containers[i];
      const feature = new Feature<Polygon>();
      const polygon = new Polygon([]);
      feature.setGeometry(polygon);
      const style = new Style();
      feature.setStyle(style);
      igvInventoryLayer_source.addFeature(feature);

      this.pool[`${key}Containers_feature`] = feature;
      this.pool[`${key}Containers_polygon`] = polygon;
      this.pool[`${key}Containers_style`] = style;
      setStyleByMoveKind("UNKNOWN", style);
    }

    // 锁闭区
    const lockArea_feature = new Feature<Polygon>();
    const lockArea_polygon = new Polygon([]);
    lockArea_feature.setGeometry(lockArea_polygon);
    lockArea_feature.setStyle(lockArea_style);
    igvLockAreaLayer_source.addFeature(lockArea_feature);

    // 路径
    for (let i = 0; i < this.routes.length; i++) {
      const key = this.routes[i];
      const feature = new Feature<LineString>();
      const lineString = new LineString([]);
      feature.setGeometry(lineString);
      const style = new Style();
      style.setZIndex(999 + this.sequence);
      const stroke = new Stroke({
        color: getColorString(`IGV.ROUTE.DEFAULT.${key.toUpperCase()}`),
        width: IGVInstance.routeWidth.default[key],
        lineDash: [4, 6],
      });
      style.setStroke(stroke);
      feature.setStyle(style);
      igvRouteLayer_source.addFeature(feature);

      this.pool[`${key}Routes_feature`] = feature;
      this.pool[`${key}Routes_lineString`] = lineString;
      this.pool[`${key}Routes_style`] = style;
    }

    // 绑定指针
    this.pool.igv_feature = igv_feature;
    this.pool.igv_point = igv_point;
    this.pool.body_style = body_style;
    this.pool.header_style = header_style;
    this.pool.igvId_point = igvId_point;
    this.pool.igvId_text = igvId_text;
    this.pool.igvId_feature = igvId_feature;
    this.pool.body_icon = body_icon;
    this.pool.header_icon = header_icon;
    this.pool.lockArea_feature = lockArea_feature;
    this.pool.lockArea_polygon = lockArea_polygon;

    this.updateLabelIdMatrixes();

    // 绑定事件
    igv_feature.set("resize", this.onResize);
    igv_feature.set("selected", this.onSelected);
    igv_feature.set("cancelSelected", this.onCancelSelected);
    igv_feature.set("movein", this.onFocus);
    igv_feature.set("moveout", this.onUnFocus);

    igvId_feature.set("selected", this.onSelected);
    igvId_feature.set("cancelSelected", this.onCancelSelected);
    igvId_feature.set("movein", this.onMoveIn);
    igvId_feature.set("moveout", this.onMoveOut);

    this.pool.currentRoutes_feature.set("selected", this.onSelected);
    this.pool.currentRoutes_feature.set("cancelSelected", this.onCancelSelected);
    this.pool.currentRoutes_feature.set("movein", this.onFocus);
    this.pool.currentRoutes_feature.set("moveout", this.onUnFocus);
  }

  updateLabelIdMatrixes = () => {
    const coordinates1 = [this.locationXY[0] - 10.5, this.locationXY[1]];
    rotate(coordinates1, 0, 2, 2, -this.rotation, this.locationXY, coordinates1);
    this.pool.igvId_point.setCoordinates(coordinates1);
    this.pool.igvId_feature.changed();
  };

  onSelected = () => {
    IGVInstance._selected = this.id;
    this.onFocus();

    // 计算路径终点
    const coodinates = this.pool.currentRoutes_lineString.getCoordinates();
    if (coodinates.length) {
      const routeTerminalCoordinates = coodinates[coodinates.length - 1];
      routeTerminal_point.setCoordinates(routeTerminalCoordinates);
      routeTerminal_feature.setStyle(routeTerminal_style);
      routeTerminal_feature.changed();
    }

    if (igvInfoCardRef.value) {
      igvInfoCardRef.value.openInfoCard(this.id);
    }
  };

  onCancelSelected = () => {
    IGVInstance._selected = undefined;
    this.onUnFocus();

    routeTerminal_feature.setStyle(routeTerminal_hidden_style);
    routeTerminal_feature.changed();
  };

  onMoveIn = () => {
    IGVInstance._hover = this.id;
    this.onFocus();
  };

  onMoveOut = () => {
    IGVInstance._hover = undefined;
    this.onUnFocus();
  };

  onResize = () => {
    this.pool.body_icon.setScale(IGVInstance.initScale.body * resizeFactor.value);
    this.pool.header_icon.setScale(IGVInstance.initScale.header * resizeFactor.value);
    this.pool.igv_feature.changed();

    if (IGVInstance._hover === this.id) {
      this.pool.igvId_text.setScale(IGVInstance.initScale.igvIdHover * resizeFactor.value);
    } else {
      this.pool.igvId_text.setScale(IGVInstance.initScale.igvId * resizeFactor.value);
    }
    this.pool.igvId_feature.changed();
  };

  onFocus = () => {
    this.pool.igvId_text.setFill(selectedText);
    this.pool.igvId_text.setBackgroundFill(selectedTextBackground);
    this.pool.igvId_feature.changed();
    this.pool.igvId_text.setScale(IGVInstance.initScale.igvIdHover * resizeFactor.value);
    this.pool.igvId_feature.changed();

    for (let i = 0; i < this.routes.length; i++) {
      const key = this.routes[i];
      const stroke = this.pool[`${key}Routes_style`].getStroke();
      stroke.setWidth(IGVInstance.routeWidth.selected[key]);
      stroke.setColor(getColorString(`IGV.ROUTE.SELECTED.${key.toUpperCase()}`));
      this.pool[`${key}Routes_feature`].changed();
    }
  };

  onUnFocus = () => {
    if (IGVInstance._selected === this.id) return;
    this.pool.igvId_text.setFill(defaultText);
    this.pool.igvId_text.setBackgroundFill(defaultTextBackground);
    this.pool.igvId_feature.changed();
    this.pool.igvId_text.setScale(IGVInstance.initScale.igvId * resizeFactor.value);
    this.pool.igvId_feature.changed();

    for (let i = 0; i < this.routes.length; i++) {
      const key = this.routes[i];
      const stroke = this.pool[`${key}Routes_style`].getStroke();
      stroke.setWidth(IGVInstance.routeWidth.default[key]);
      stroke.setColor(getColorString(`IGV.ROUTE.DEFAULT.${key.toUpperCase()}`));
      this.pool[`${key}Routes_feature`].changed();
    }
  };

  /** 更新位置 */
  setPosition = (x?: number, y?: number) => {
    if (x !== undefined) this.locationXY[0] = coordinateTrans_cm_x(x);
    if (y !== undefined) this.locationXY[1] = coordinateTrans_cm_y(y);

    this.pool.igv_point.setCoordinates(this.locationXY);
    this.pool.igv_feature.changed();
    this.updateLabelIdMatrixes();
    this.setContainersInformationAndView();
  };

  /** 更新旋转 */
  setRotation = (value?: number) => {
    if (value === undefined) return;

    this.rotation = value;
    this.pool.body_icon.setRotation(this.rotation);
    this.pool.header_icon.setRotation(this.rotation);
    this.pool.igv_feature.changed();
    this.updateLabelIdMatrixes();
    this.setContainersInformationAndView();
  };

  containerInformation = undefined;
  /** 更新集装箱 */
  setContainersInformationAndView = (containerInformation?: Record<string, any>) => {
    if (containerInformation !== undefined) {
      this.containerInformation = containerInformation;
    }

    const containerSize1 = getAccValue(this.containerInformation, "containerSize1");
    const containerSize2 = getAccValue(this.containerInformation, "containerSize2");
    // 0:Null 1:Empty 2:Center20 3:Center40 4:Center45 5:Twin20 6:Center30 7:Changing 8:Left20 9:Right20

    let status = 0;
    if (containerSize1 == 40 || containerSize1 == 45) {
      status = 3;
    } else if (containerSize1 == 20) {
      status = 8;
      if (containerSize2 == 20) {
        status = 5;
      }
    } else {
      if (containerSize2 == 20) {
        status = 9;
      }
    }

    // 集装箱几何
    const containerGeometries = getContainerGeometryQC(this.locationXY, status);
    for (let i = 0; i < this.containers.length; i++) {
      const key = this.containers[i];
      if (containerGeometries[i] === undefined) continue;
      const feature = this.pool[`${key}Containers_feature`];
      const polygon = this.pool[`${key}Containers_polygon`];
      polygon.setCoordinates([containerGeometries[i]]);
      polygon.rotate(-this.rotation, this.locationXY);
      feature.changed();
    }

    // 集装箱颜色
    if (status === 3 || status === 5 || status === 8) {
      const feature = this.pool.frontContainers_feature;
      const style = this.pool.frontContainers_style;
      setStyleByMoveKind(getAccValue(this.containerInformation, "moveKind1"), style);
      feature.changed();
    }
    if (status === 5 || status === 9) {
      const feature = this.pool.behindContainers_feature;
      const style = this.pool.behindContainers_style;
      setStyleByMoveKind(getAccValue(this.containerInformation, "moveKind2"), style);
      feature.changed();
    }
  };

  /** 更新锁闭区域 */
  setLockAreaPoints = (polygons: Array4<Array2<number>>[]) => {
    const rects = [];
    try {
      for (let i = 0; i < polygons.length; i++) {
        const polygon = polygons[i];
        const rect = [];
        const point1 = coordinateTrans_mm(polygon[0][0], polygon[0][1]);
        const point2 = coordinateTrans_mm(polygon[1][0], polygon[1][1]);
        const point3 = coordinateTrans_mm(polygon[2][0], polygon[2][1]);
        const point4 = coordinateTrans_mm(polygon[3][0], polygon[3][1]);
        rect.push(point1, point2, point3, point4, point1);
        rects.push(rect);
      }

      if (rects.length >= 2) {
        const firstRect = rects[0];
        const lastRect = rects[rects.length - 1];
        rects.push(firstRect);
        rects.push(lastRect);
      }
    } catch (err) {}

    try {
      this.pool.lockArea_polygon.setCoordinates(rects);
      this.pool.lockArea_feature.changed();
    } catch (err) {}
  };

  /** 更新路径 */
  setRoutePoints = (points: Array2<number>[], currentIndex: number) => {
    try {
      for (let j = 0; j < points.length; j++) {
        const point = points[j];
        point[0] = coordinateTrans_mm_x(point[0]);
        point[1] = coordinateTrans_mm_y(point[1]);
      }
    } catch (err) {}

    try {
      this.pool.passRoutes_lineString.setCoordinates(points.slice(0, currentIndex));
      this.pool.passRoutes_feature.changed();
    } catch (err) {}

    try {
      if (currentIndex < points.length) {
        this.pool.currentRoutes_lineString.setCoordinates(points.slice(currentIndex, points.length));
        this.pool.currentRoutes_feature.changed();
      }
    } catch (err) {}
  };
}
