const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;
const { COPYFILE_EXCL } = fs.constants;
const watcher = require('./watcher'); // フォルダ監視用
const initialCheck = require('./initial_check');
const logger = require('./logger'); // ログ処理が必要
const config = require('./config.json');

// uploadだけの権限にする必要あり
const s3 = require('./s3');
const BUCKET = config.bucket;

// SES
const sesSendMail = require('./ses_mail');
const SES_TO = config.to;

const WATCHING_DIR = config.WATCHING_DIR; // 監視対象フォルダ
const DEST_DIR = config.DEST_DIR; // ローカルで保存するためのフォルダ

const main = async () => {
  try {
    await initialCheck(WATCHING_DIR, DEST_DIR);
    await logger.info('Directory Access Success!');
  } catch (error) {
    await errorState(error);
    return;
  }

  watcher.on('ready', async () => {
    await logger.info('Initial scan complete. Ready for changes');
    const watchedPaths = watcher.getWatched();
    await logger.info('watchedPaths :', watchedPaths);
    // スクリプト起動時に既存ファイルがaddイベントとして処理されるため不要な処理
    // const existingFiles = watchedPaths[WATCHING_DIR];
    // // すでに保管されているファイルの処理が必要
    // if (existingFiles.length) {
    //   await logger.info('既存ファイルの処理を開始', existingFiles);
    //   for (const file of existingFiles) {
    //     const filePath = path.join(WATCHING_DIR, file);
    //     await logger.info('Existing File processing: ', filePath);
    //     try {
    //       await fileCopyUploadDelete(filePath);
    //     } catch (error) {
    //       await errorState(error);
    //     }
    //   }
    // }
  });

  // ファイルの追加を検知
  watcher.on('add', async filePath => {
    await logger.info('add file: ', filePath);
    try {
      await fileCopyUploadDelete(filePath);
    } catch (error) {
      await errorState(error);
    }
  });
  watcher.on('error', async (error) => {
    await errorState(error);
    await watcher.close().then(() => logger.info('Watcher closed: watcher on error'));
  });
};

const fileCopyUploadDelete = async (filePath) => {
  const filenameParse = path.parse(filePath);
  // copyする前にYYYYMMのフォルダが存在するか確認して、存在しなければフォルダ作成する
  const sendPathThisMonthDir = await mkdirThisMonth();
  const destFilePath = path.join(sendPathThisMonthDir, filenameParse.base);
  await fsPromises.copyFile(filePath, destFilePath, COPYFILE_EXCL);
  await logger.info('File copy success!', filePath, destFilePath);
  // コピー失敗した場合は？ => 'EEXIST: file already exists, copyfile'のエラーメッセージthrow
  // COPYFILE_EXCLを指定しているためコピー先に同名ファイルがあった場合は上記エラー
  // renameメソッドでもファイル移動が可能だが、移動先に同名ファイルが存在する場合に上書きとなってしまうため利用せず

  const uploadParams = await createUploadParams(filePath, filenameParse);
  await logger.info('File Read Success', filePath);

  // AWSへ接続できない場合は？uploadメソッドは暗号化されているか？整合性チェックは？
  const data = await s3.upload(uploadParams).promise();
  await logger.info('Upload Success', data.Location);

  await fsPromises.unlink(filePath);
  await logger.info('File delete Success!', filePath);
  // DELETE失敗した場合は？ => ファイルが存在しないことがあるかもくらいなので無視
};

const createSESParams = (error) => {
  return {
    to: SES_TO,
    subject: error.message,
    body: error.name + ': ' + error.message + '\n' + 'Error Code: ' + error.code
  };
};

const errorState = async (error) => {
  await logger.error(error.message);
  console.error(error);
  // 管理者へメール配信
  const sesParams = createSESParams(error);
  await sesSendMail(sesParams).then((res) => {
    logger.info('管理者へメール配信', res);
  }).catch((error) => {
    logger.error('メール配信エラー', error);
  });
};

const createUploadParams = async (filePath, filenameParse) => {
  try {
    const body = await fsPromises.readFile(filePath, {'encoding': 'utf8'});
    const randomString = crypto.randomBytes(8).toString('hex');
    // ファイル名が重複しないようにする
    const key = filenameParse.name + '_' + randomString + filenameParse.ext;
    return {
      Bucket: BUCKET,
      Key: key,
      Body: body
    };
  } catch (error) {
    throw new Error(error);
  }
};

const mkdirThisMonth = async () => {
  try {
    const today = new Date();
    const yyyymm = today.getFullYear().toString() + (today.getMonth() + 1).toString();
    const dirPath = path.join(DEST_DIR, yyyymm);
    await fsPromises.mkdir(dirPath);
    logger.info('Make Directory', dirPath);
    return dirPath;
  } catch (error) {
    if (error.code === 'EEXIST') {
      logger.warn(error.message);
      return error.path;
    }
    throw new Error(error);
  }
};

main();
