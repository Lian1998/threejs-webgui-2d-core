// https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Workers_API

// import TestWorker from "./testWorker?worker";
// const testWorker = new TestWorker();

export const initialization = () => {
  const testWorker = new Worker(new URL("./TestWorker.ts", import.meta.url), {
    type: "module",
  });

  testWorker.postMessage(10);
};
