'use strict';
var aws = require("aws-sdk");
aws.config.update({region: 'ap-northeast-1'});
var dynamo = new aws.DynamoDB();
var docClient = new aws.DynamoDB.DocumentClient();

module.exports.handler = function(event, context, cb) {
  // ログイン情報テーブル定義
  dynamo.createTable({
    TableName : "dynamo-crawler-form",
    KeySchema: [
      { AttributeName: "key", KeyType: "HASH"},
    ],
    AttributeDefinitions: [
      { AttributeName: "key", AttributeType: "S" },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 1, WriteCapacityUnits: 1
    }
  }, errorHandler);
  // 取得データテーブル定義
  dynamo.createTable({
    TableName : "dynamo-crawler-fetched",
    KeySchema: [
      { AttributeName: "hash_id",     KeyType: "HASH"},
      { AttributeName: "created_at",  KeyType: "RANGE"},
    ],
    AttributeDefinitions: [
      { AttributeName: "hash_id",     AttributeType: "S" },
      { AttributeName: "created_at",  AttributeType: "S" },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 1, WriteCapacityUnits: 1
    }
  }, errorHandler);

  function errorHandler(err, data) {
    if (err) {
      console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
      console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
    }
  }
};
