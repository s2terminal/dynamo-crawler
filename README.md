# ダイナモクローラーβ

Splatoon[イカリング](https://splatoon.nintendo.net/)のデータをDynamoDBに保存する。

[Serverless Framework](https://github.com/serverless/serverless)を用いてAWS上にLambda、API Gateway、DynamoDBを配置する。

## Installation

AWS CLIが使える状態にしておき、[Serverless Framework](https://github.com/serverless/serverless)をインストールしてデプロイする。
多分こんな感じ。

```
$ curl "https://bootstrap.pypa.io/get-pip.py" -o "get-pip.py"
$ sudo python get-pip.py
$ sudo pip install awscli
$ aws configure
$ git clone https://github.com/s2terminal/dynamo-crawler.git
$ cd dynamo-crawler
$ npm install --save
$ serverless dash deploy
```

## Usage

database/initialize でDynamoDBのテーブルを作成する。

dynamo-crawler-formテーブルに[イカリング](https://splatoon.nintendo.net/)のログイン情報を挿入しておく必要がある。
下記のような感じ

```javascript
docClient.put({
  "TableName": "dynamo-crawler-form",
  "Item": { "key":"username", "value": "ユーザ名" }
}, function(err, data) {});

docClient.put({
  "TableName": "dynamo-crawler-form",
  "Item": { "key":"password", "value": "パスワード" }
}, function(err, data) {});
```

crawling/fetch でデータを取得しDynamoDBに保存することができる。

## License

[MIT](https://opensource.org/licenses/MIT)
