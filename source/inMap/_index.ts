import { Viewer2D } from "@core/Viewer2D";

type Context = {
  view: Viewer2D;
};

let contexts: Context[] = [
  {
    view: undefined,
  },
];

export const init = async () => {
  const context = contexts[0];

  const view = new Viewer2D({
    container: document.querySelector("viewport"),
    background: "#ffffff",
    scale: 12,
    maxDpr: 1,
    debug: { gui: true },
    onError: (err) => console.error(err),
  });

  context.view = view;

  const response = await fetch("/fonts/demo-coverage.txt");
  if (!response.ok) throw new Error("离线字体 coverage 文件不可用.");
  const coverage = [...new Set([...(await response.text())].filter((character) => character !== "\n" && character !== "\r"))];
  await Promise.all([
    view.resources.fonts.register({
      id: "demo",
      family: "Noto Sans SC Demo",
      url: "/fonts/NotoSansSC-demo.woff2",
      weight: "400",
      coverage,
    }),
    ...["body", "head", "ring", "dark", "dark-alpha"].map((id) => view.resources.sprites.register({ id, url: `/debug/${id}.svg` })),
  ]);
};
