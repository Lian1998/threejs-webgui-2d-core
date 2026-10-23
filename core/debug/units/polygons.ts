import { unit } from "./harness";
import { Viewer2D } from "../../Viewer2D";
import { triangulatePolygonGeometry } from "../../primitives/polygons/triangulate";

const page = unit("多边形", "只测试孔洞, 独立区域及几何更新.");
void page.run(async () => {
  const view = page.own(
    new Viewer2D({
      container: page.container,
      onError: page.fail,
      scale: 16,
      controls: false,
    }),
  );
  const geometry = {
    type: "Polygon" as const,
    polygon: {
      outer: [
        [-5, -5],
        [5, -5],
        [5, 5],
        [-5, 5],
      ] as [number, number][],
      holes: [
        [
          [-2, -2],
          [2, -2],
          [2, 2],
          [-2, 2],
        ] as [number, number][],
      ],
    },
  };
  const triangles = triangulatePolygonGeometry(geometry, true);
  let area = 0;
  for (let i = 0; i < triangles.indices.length; i += 3) {
    const [a, b, c] = triangles.indices.slice(i, i + 3).map((index) => triangles.vertices[index]);
    area += Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2;
  }
  page.check(Math.abs(area - 84) < 1e-6, "三角剖分面积扣除孔洞");
  const handle = view.primitives.addPolygon({
    layer: "default",
    geometry,
    fill: "#63c5db",
  });
  view.flush();
  page.check(!view.picking.pickAt(view.viewport.worldToScreen([0, 0])), "孔洞内无填充像素");
  page.check(view.picking.pickAt(view.viewport.worldToScreen([4, 0]))?.primitiveId === handle.id, "外环内可拾取");
  handle.setGeometry({
    type: "MultiPolygon",
    polygons: [
      geometry.polygon,
      {
        outer: [
          [8, -2],
          [11, -2],
          [11, 2],
          [8, 2],
        ],
      },
    ],
  });
  view.flush();
  page.check(view.picking.pickAt(view.viewport.worldToScreen([9, 0]))?.primitiveId === handle.id, "独立区域仍属于同一逻辑图元");
  page.observe(view);
});
