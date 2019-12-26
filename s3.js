// uploadだけの権限にする必要あり
const AWS = require('aws-sdk');
const s3 = new AWS.S3({ apiVersion: '2006-03-01', region: 'ap-northeast-1' });
module.exports = s3;