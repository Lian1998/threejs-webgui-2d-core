import fs from "node:fs";
import path from "node:path";
import { once } from "node:events";
import { createInflate } from "node:zlib";

const DEFAULT_INPUT_V1TICKS = path.resolve("./assets/aimp.qinzhou.2025-06-16 18_30_00_2025-06-16 18_35_00.v1ticks");
const DEFAULT_OUTPUT_DIR = path.resolve("./output/.scripts/v1ticks/aimp.qinzhou.2025-06-16 18_30_00_2025-06-16 18_35_00/");
const DEFAULT_CHUNK_SIZE = 1000;

class ChunkQueueReader {
  constructor(stream) {
    this.iterator = stream[Symbol.asyncIterator]();
    this.chunks = [];
    this.available = 0;
    this.done = false;
  }

  async ensure(size) {
    while (this.available < size && !this.done) {
      const { value, done } = await this.iterator.next();
      if (done) {
        this.done = true;
        break;
      }
      const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
      if (!chunk.length) continue;
      this.chunks.push(chunk);
      this.available += chunk.length;
    }
    return this.available >= size;
  }

  async readUInt8() {
    const ok = await this.ensure(1);
    if (!ok) throw new Error("Unexpected EOF while reading msgpack byte");
    const chunk = this.chunks[0];
    const value = chunk[0];
    if (chunk.length === 1) this.chunks.shift();
    else this.chunks[0] = chunk.subarray(1);
    this.available -= 1;
    return value;
  }

  async readBytes(size) {
    const ok = await this.ensure(size);
    if (!ok) throw new Error(`Unexpected EOF while reading ${size} bytes`);

    const out = Buffer.allocUnsafe(size);
    let written = 0;
    while (written < size) {
      const chunk = this.chunks[0];
      const need = size - written;
      const take = Math.min(need, chunk.length);
      chunk.copy(out, written, 0, take);
      written += take;
      if (take === chunk.length) this.chunks.shift();
      else this.chunks[0] = chunk.subarray(take);
      this.available -= take;
    }
    return out;
  }

  async readUInt16BE() {
    return (await this.readBytes(2)).readUInt16BE(0);
  }

  async readInt16BE() {
    return (await this.readBytes(2)).readInt16BE(0);
  }

  async readUInt32BE() {
    return (await this.readBytes(4)).readUInt32BE(0);
  }

  async readInt32BE() {
    return (await this.readBytes(4)).readInt32BE(0);
  }

  async readFloatBE() {
    return (await this.readBytes(4)).readFloatBE(0);
  }

  async readDoubleBE() {
    return (await this.readBytes(8)).readDoubleBE(0);
  }

  async readBigUInt64BE() {
    return (await this.readBytes(8)).readBigUInt64BE(0);
  }

  async readBigInt64BE() {
    return (await this.readBytes(8)).readBigInt64BE(0);
  }

  async isEnded() {
    await this.ensure(1);
    return this.done && this.available === 0;
  }
}

class PagedJsonArrayWriter {
  constructor(outputDir, chunkSize) {
    this.outputDir = outputDir;
    this.chunkSize = chunkSize;
    this.pageIndex = 0;
    this.itemsInPage = 0;
    this.totalItems = 0;
    this.stream = null;
  }

  async writeRaw(text) {
    if (!this.stream) throw new Error("Writer stream is not initialized");
    if (!this.stream.write(text)) await once(this.stream, "drain");
  }

  async openPage() {
    this.pageIndex += 1;
    this.itemsInPage = 0;
    const filePath = path.join(this.outputDir, `ticks_${String(this.pageIndex).padStart(4, "0")}.json`);
    this.stream = fs.createWriteStream(filePath, { encoding: "utf8" });
    // Prefix UTF-8 BOM to avoid mojibake in Windows editors that guess ANSI/GBK.
    await this.writeRaw("\uFEFF[\n");
  }

  async closePage() {
    if (!this.stream) return;
    if (this.itemsInPage > 0) await this.writeRaw("\n");
    await this.writeRaw("]\n");
    await new Promise((resolve, reject) => {
      this.stream.on("error", reject);
      this.stream.end(() => resolve(undefined));
    });
    this.stream = null;
    this.itemsInPage = 0;
  }

  async writeItem(item) {
    if (!this.stream) await this.openPage();
    if (this.itemsInPage >= this.chunkSize) {
      await this.closePage();
      await this.openPage();
    }
    if (this.itemsInPage > 0) await this.writeRaw(",\n");
    await this.writeRaw(JSON.stringify(item));
    this.itemsInPage += 1;
    this.totalItems += 1;
  }

  async finalize() {
    if (!this.stream && this.pageIndex === 0) await this.openPage();
    await this.closePage();
  }
}

const toJsonCompatibleInteger = (v) => {
  if (typeof v === "bigint") {
    const max = BigInt(Number.MAX_SAFE_INTEGER);
    const min = BigInt(Number.MIN_SAFE_INTEGER);
    if (v <= max && v >= min) return Number(v);
    return v.toString();
  }
  return v;
};

const decodeUtf8 = (buffer) => buffer.toString("utf8");

const readMapHeader = async (reader) => {
  const head = await reader.readUInt8();
  if (head >= 0x80 && head <= 0x8f) return head & 0x0f;
  if (head === 0xde) return await reader.readUInt16BE();
  if (head === 0xdf) return await reader.readUInt32BE();
  throw new Error(`Expected msgpack map header, got 0x${head.toString(16)}`);
};

const readArrayHeader = async (reader) => {
  const head = await reader.readUInt8();
  if (head >= 0x90 && head <= 0x9f) return head & 0x0f;
  if (head === 0xdc) return await reader.readUInt16BE();
  if (head === 0xdd) return await reader.readUInt32BE();
  throw new Error(`Expected msgpack array header, got 0x${head.toString(16)}`);
};

const readMsgpackValue = async (reader, depth = 0) => {
  if (depth > 1024) throw new Error("MessagePack structure depth exceeded");
  const head = await reader.readUInt8();

  if (head <= 0x7f) return head;
  if (head >= 0xe0) return head - 0x100;

  if (head >= 0xa0 && head <= 0xbf) {
    const length = head & 0x1f;
    return decodeUtf8(await reader.readBytes(length));
  }

  if (head >= 0x90 && head <= 0x9f) {
    const size = head & 0x0f;
    const arr = new Array(size);
    for (let i = 0; i < size; i++) arr[i] = await readMsgpackValue(reader, depth + 1);
    return arr;
  }

  if (head >= 0x80 && head <= 0x8f) {
    const size = head & 0x0f;
    const obj = {};
    for (let i = 0; i < size; i++) {
      const key = await readMsgpackValue(reader, depth + 1);
      const value = await readMsgpackValue(reader, depth + 1);
      obj[String(key)] = value;
    }
    return obj;
  }

  switch (head) {
    case 0xc0:
      return null;
    case 0xc2:
      return false;
    case 0xc3:
      return true;
    case 0xc4: {
      const len = await reader.readUInt8();
      return (await reader.readBytes(len)).toString("base64");
    }
    case 0xc5: {
      const len = await reader.readUInt16BE();
      return (await reader.readBytes(len)).toString("base64");
    }
    case 0xc6: {
      const len = await reader.readUInt32BE();
      return (await reader.readBytes(len)).toString("base64");
    }
    case 0xc7: {
      const len = await reader.readUInt8();
      const extType = await reader.readUInt8();
      const payload = await reader.readBytes(len);
      return { __extType: extType, data: payload.toString("base64") };
    }
    case 0xc8: {
      const len = await reader.readUInt16BE();
      const extType = await reader.readUInt8();
      const payload = await reader.readBytes(len);
      return { __extType: extType, data: payload.toString("base64") };
    }
    case 0xc9: {
      const len = await reader.readUInt32BE();
      const extType = await reader.readUInt8();
      const payload = await reader.readBytes(len);
      return { __extType: extType, data: payload.toString("base64") };
    }
    case 0xca:
      return await reader.readFloatBE();
    case 0xcb:
      return await reader.readDoubleBE();
    case 0xcc:
      return await reader.readUInt8();
    case 0xcd:
      return await reader.readUInt16BE();
    case 0xce:
      return await reader.readUInt32BE();
    case 0xcf:
      return toJsonCompatibleInteger(await reader.readBigUInt64BE());
    case 0xd0: {
      const v = await reader.readUInt8();
      return v > 0x7f ? v - 0x100 : v;
    }
    case 0xd1:
      return await reader.readInt16BE();
    case 0xd2:
      return await reader.readInt32BE();
    case 0xd3:
      return toJsonCompatibleInteger(await reader.readBigInt64BE());
    case 0xd4:
      await reader.readUInt8();
      await reader.readBytes(1);
      return { __fixedExt: 1 };
    case 0xd5:
      await reader.readUInt8();
      await reader.readBytes(2);
      return { __fixedExt: 2 };
    case 0xd6:
      await reader.readUInt8();
      await reader.readBytes(4);
      return { __fixedExt: 4 };
    case 0xd7:
      await reader.readUInt8();
      await reader.readBytes(8);
      return { __fixedExt: 8 };
    case 0xd8:
      await reader.readUInt8();
      await reader.readBytes(16);
      return { __fixedExt: 16 };
    case 0xd9: {
      const len = await reader.readUInt8();
      return decodeUtf8(await reader.readBytes(len));
    }
    case 0xda: {
      const len = await reader.readUInt16BE();
      return decodeUtf8(await reader.readBytes(len));
    }
    case 0xdb: {
      const len = await reader.readUInt32BE();
      return decodeUtf8(await reader.readBytes(len));
    }
    case 0xdc: {
      const size = await reader.readUInt16BE();
      const arr = new Array(size);
      for (let i = 0; i < size; i++) arr[i] = await readMsgpackValue(reader, depth + 1);
      return arr;
    }
    case 0xdd: {
      const size = await reader.readUInt32BE();
      const arr = new Array(size);
      for (let i = 0; i < size; i++) arr[i] = await readMsgpackValue(reader, depth + 1);
      return arr;
    }
    case 0xde: {
      const size = await reader.readUInt16BE();
      const obj = {};
      for (let i = 0; i < size; i++) {
        const key = await readMsgpackValue(reader, depth + 1);
        const value = await readMsgpackValue(reader, depth + 1);
        obj[String(key)] = value;
      }
      return obj;
    }
    case 0xdf: {
      const size = await reader.readUInt32BE();
      const obj = {};
      for (let i = 0; i < size; i++) {
        const key = await readMsgpackValue(reader, depth + 1);
        const value = await readMsgpackValue(reader, depth + 1);
        obj[String(key)] = value;
      }
      return obj;
    }
    default:
      throw new Error(`Unsupported msgpack type: 0x${head.toString(16)}`);
  }
};

const normalizeTickObject = (source, entry) => {
  if (Array.isArray(entry) && entry.length >= 2) {
    return {
      source,
      timestamp: entry[0],
      responses: entry[1],
    };
  }
  if (entry && typeof entry === "object") return { source, entry };
  return null;
};

const parseArgs = () => {
  const args = process.argv.slice(2);

  let inputPath = args[0];
  let outputDir = args[1];
  let chunkSize = DEFAULT_CHUNK_SIZE;

  for (let i = 2; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--chunk-size=")) {
      const parsed = Number.parseInt(arg.slice("--chunk-size=".length), 10);
      if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`Invalid --chunk-size: ${arg}`);
      chunkSize = parsed;
    }
  }

  if (!inputPath || !outputDir) {
    inputPath = inputPath || DEFAULT_INPUT_V1TICKS;
    outputDir = outputDir || DEFAULT_OUTPUT_DIR;
  }

  if (!inputPath || !outputDir) {
    throw new Error("Missing required arguments. Usage: node ./.scripts/v1ticks/exports/unpackage.js <input.v1ticks> <outputDir> [--chunk-size=50000]");
  }

  return {
    inputPath: path.resolve(inputPath),
    outputDir: path.resolve(outputDir),
    chunkSize,
  };
};

const main = async () => {
  const { inputPath, outputDir, chunkSize } = parseArgs();
  fs.mkdirSync(outputDir, { recursive: true });

  const inputStream = fs.createReadStream(inputPath);
  const inflateStream = createInflate();
  inputStream.pipe(inflateStream);

  const reader = new ChunkQueueReader(inflateStream);
  const writer = new PagedJsonArrayWriter(outputDir, chunkSize);

  const stats = {
    parsed: 0,
    iticks: 0,
    ticks: 0,
    skipped: 0,
    malformed: 0,
    meta: {},
  };

  try {
    const topSize = await readMapHeader(reader);

    for (let i = 0; i < topSize; i++) {
      const keyRaw = await readMsgpackValue(reader);
      const key = String(keyRaw);

      // on_tickFileExport struct: { startTimeStamp, startTime, endTimeStamp, endTime, iticks, ticks }
      if (key === "iticks" || key === "ticks") {
        const length = await readArrayHeader(reader);
        for (let idx = 0; idx < length; idx++) {
          let entry;
          try {
            entry = await readMsgpackValue(reader);
          } catch (error) {
            stats.malformed += 1;
            console.error(`[malformed chunk] ${key}[${idx}] parse failed:`, error?.message ?? error);
            throw error;
          }

          const tickObject = normalizeTickObject(key, entry);
          if (!tickObject) {
            stats.skipped += 1;
            console.warn(`[skipped] ${key}[${idx}] has unexpected shape`);
            continue;
          }

          await writer.writeItem(tickObject);
          stats.parsed += 1;
          if (key === "iticks") stats.iticks += 1;
          else stats.ticks += 1;
        }
      } else {
        stats.meta[key] = await readMsgpackValue(reader);
      }
    }

    if (!(await reader.isEnded())) {
      console.warn("[warn] trailing bytes detected after top-level struct parse");
    }

    await writer.finalize();
    console.log("unpackage done", {
      input: inputPath,
      outputDir,
      chunkSize,
      pages: writer.pageIndex,
      parsed: stats.parsed,
      iticks: stats.iticks,
      ticks: stats.ticks,
      skipped: stats.skipped,
      malformed: stats.malformed,
      meta: stats.meta,
    });
    if (stats.skipped || stats.malformed) {
      console.log(`summary: skipped ${stats.skipped} malformed lines/chunks ${stats.malformed}`);
    }
  } finally {
    inputStream.destroy();
    inflateStream.destroy();
  }
};

main().catch((error) => {
  console.error("unpackage failed:", error?.stack ?? error);
  process.exitCode = 1;
});
