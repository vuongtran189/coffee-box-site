/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = new Set(process.argv.slice(2));
const isBuild = args.has("--build");

const srcDir = __dirname;
const distDir = path.join(__dirname, "..", "dist");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyFile(from, to) {
  fs.copyFileSync(from, to);
}

if (isBuild) {
  ensureDir(distDir);
  copyFile(path.join(srcDir, "widget.js"), path.join(distDir, "widget.js"));
  copyFile(path.join(srcDir, "widget.css"), path.join(distDir, "widget.css"));
  console.log("Built widget to packages/widget/dist/");
} else {
  console.log("Widget package dev helper. Use `npm run build:widget` from repo root.");
}

