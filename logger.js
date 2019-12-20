const log4js = require("log4js"); // ログ処理が必要

// ログの設定
log4js.configure({
  appenders: {
    logFile: {
      type: "dateFile",
      filename: "logs/monitoringLog.log",
      pattern: "-yyyy-MM-dd"
    },
    out: { type: "stdout" }
  },
  categories: {
    default: { appenders: ["logFile"], level: "info" },
    debug: { appenders: ["out"], level: "debug" }
  }
});
// const logger = log4js.getLogger('debug');
const logger = log4js.getLogger();

module.exports = logger;