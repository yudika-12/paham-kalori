#!/usr/bin/env node
// Tunggu server frontend siap, lalu buka browser otomatis.
// Dijalankan sebagai background process oleh scripts/dev.sh

const { exec } = require("child_process");
const net = require("net");

const url = process.env.OPEN_URL || "http://localhost:3000";
const parsed = new URL(url);
const port = Number(parsed.port) || 80;
const retries = Number(process.env.OPEN_RETRIES || 60);

function isReady(host, p) {
  return new Promise((resolve) => {
    const socket = net.connect(p, host);
    socket.setTimeout(2000);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function openBrowser(target) {
  const cmd =
    process.platform === "darwin"
      ? `open "${target}"`
      : process.platform === "win32"
        ? `start "" "${target}"`
        : `xdg-open "${target}"`;
  exec(cmd, (err) => {
    if (err) {
      console.log(`\n[open] Tidak bisa buka browser otomatis. Buka manual: ${target}\n`);
    } else {
      console.log(`\n[open] Membuka ${target} di browser...\n`);
    }
    process.exit(0);
  });
}

(async () => {
  for (let i = 0; i < retries; i++) {
    if (await isReady(parsed.hostname, port)) {
      openBrowser(url);
      return;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.log(`\n[open] ${url} tidak merespons. Buka manual di browser.\n`);
  process.exit(1);
})();
