/// <reference lib="WebWorker" />

self.onmessage = (e) => {
  console.log("收到worker结果:", e.data);
};
