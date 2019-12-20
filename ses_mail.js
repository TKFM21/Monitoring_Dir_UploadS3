const AWS = require("aws-sdk");
const mailFrom = require('./config.json').mailFrom;

// 米国東部（バージニア北部)
const ses = new AWS.SES({ region: "us-east-1" });

const sesSendMail = async ({ to, subject, body }) => {
  const params = {
    Destination: {
      ToAddresses: to
    },
    Message: {
      Body: {
        Text: {
          Data: body,
          Charset: "utf-8"
        }
      },
      Subject: {
        Data: subject,
        Charset: "utf-8"
      }
    },
    // From
    Source: mailFrom
  };

  try {
    const res = await ses.sendEmail(params).promise();
    return res;
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = sesSendMail;
