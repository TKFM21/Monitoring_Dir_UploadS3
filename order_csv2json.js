const { once } = require('events');
const { createReadStream } = require('fs');
const { createInterface } = require('readline');
const iconv = require('iconv-lite');
let topIgnore = 0;
const bodyObject = { 'data': [] };
const KEYS = ['site', 'order_no', 'item_no', 'model', 'qty', 'date'];

const orderCsvToJson = async (file) => {
  try {
    const rl = createInterface({
      input: createReadStream(file),
      crlfDelay: Infinity
    });

    rl.on('line', row => {
      topIgnore++;
      if (topIgnore === 1) return;
      const rowArray = row.replace(/"/g, '').split(',');
      const rowObject = {};
      KEYS.forEach( (value, index) => {
        rowObject[value] = rowArray[index];
      });
      bodyObject.data.push(rowObject);
    });

    await once(rl, 'close');
    return JSON.stringify(bodyObject);
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = orderCsvToJson;
