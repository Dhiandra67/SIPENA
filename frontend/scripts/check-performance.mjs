import { readdir, readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const assetsDirectory = fileURLToPath(new URL("../dist/assets/", import.meta.url));
const assetNames = await readdir(assetsDirectory);
const javascriptFiles = assetNames.filter((name) => name.endsWith(".js"));
const stylesheetFiles = assetNames.filter((name) => name.endsWith(".css"));

if (javascriptFiles.length === 0 || stylesheetFiles.length === 0) {
  throw new Error("Build production harus menghasilkan file JavaScript dan CSS.");
}

async function measure(files) {
  const contents = await Promise.all(
    files.map((name) => readFile(new URL(`../dist/assets/${name}`, import.meta.url))),
  );
  return {
    raw: contents.reduce((total, content) => total + content.byteLength, 0),
    gzip: contents.reduce(
      (total, content) => total + gzipSync(content).byteLength,
      0,
    ),
  };
}

const javascript = await measure(javascriptFiles);
const stylesheet = await measure(stylesheetFiles);
const kibibytes = (bytes) => `${(bytes / 1024).toFixed(1)} KiB`;
const budgets = {
  javascriptRaw: 900 * 1024,
  javascriptGzip: 300 * 1024,
  stylesheetRaw: 120 * 1024,
};

console.log(
  `JavaScript: ${kibibytes(javascript.raw)} raw, ${kibibytes(javascript.gzip)} gzip`,
);
console.log(`CSS: ${kibibytes(stylesheet.raw)} raw`);

const exceeded = [];
if (javascript.raw > budgets.javascriptRaw) exceeded.push("JavaScript raw");
if (javascript.gzip > budgets.javascriptGzip) exceeded.push("JavaScript gzip");
if (stylesheet.raw > budgets.stylesheetRaw) exceeded.push("CSS raw");

if (exceeded.length > 0) {
  throw new Error(`Batas performa terlampaui: ${exceeded.join(", ")}.`);
}

console.log("Batas ukuran build production terpenuhi.");
