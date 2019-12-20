const chokidar = require("chokidar"); // フォルダ監視用
const WATCHING_DIR = require("./config.json").WATCHING_DIR;

// Initialize watcher.
const watcher = chokidar.watch(WATCHING_DIR, {
  ignored: /[\/\\]\./,
  persistent: true,
  usePolling: true,
  interval: 10000
});

module.exports = watcher;
