const fs = require('fs');
const fsPromises = fs.promises;

const initialCheck = async (WATCHING_DIR, DEST_DIR) => {
  try {
    await fsPromises.access(WATCHING_DIR, fs.constants.R_OK | fs.constants.W_OK);
    await fsPromises.access(DEST_DIR, fs.constants.R_OK | fs.constants.W_OK);
  } catch (error) {
    throw new Error('監視/管理フォルダへアクセスできない');
  }
};

module.exports = initialCheck;