'use strict';
var cheerio = require('cheerio');
var request = require('request');
request = request.defaults({jar: true}); 

// AWSライブラリ準備
var aws = require("aws-sdk");
aws.config.update({region: 'ap-northeast-1'});
var dynamo = new aws.DynamoDB();
var docClient = new aws.DynamoDB.DocumentClient();

// データ準備
var created_at = new Date();
var data = {
  "created_at" : created_at.toISOString(),
  "profile"    : {}
};


module.exports.handler = function(event, context, cb) {
  // ログイン
  var form  = {};
  docClient.get({
    TableName: "dynamo-crawler-form", Key: { "key": "username" }
  }, function(err, result) {
    form["username"] = result.Item.value;
    docClient.get({
      TableName: "dynamo-crawler-form", Key: { "key": "password" }
    }, function(err, result) {
      form["password"] = result.Item.value;

      request({
        url: "https://id.nintendo.net/login",
        method: 'POST',
        form: form
      }, function (error, response, body) {
        // ランキング
        request("https://splatoon.nintendo.net/ranking", function (error, response, body) {
          var $ = cheerio.load(body);
          data["score_regular"]   = $("#ranking").data("score-regular");
          data["score_gachi"]     = $("#ranking").data("score-gachi");
          data["score_festival"]  = $("#ranking").data("score-festival"); // TODO: フェス中には取得できない。
          data["hash_id"]         = $("#ranking").data("my-hashed-id");

          // そうび
          request("https://splatoon.nintendo.net/profile", function (error, response, body) {
            var $ = cheerio.load(body);

            data['profile']['name'] = $('.profile-username').text();
            data['profile']['rank'] = $('.typography-equip-rank').next('p').text();
            data['profile']['udemae'] = $('.typography-equip-udemae').next('p').text();
            data['profile']['equips'] = [];
            $('.equip-painted-rank .equip-painted-data').each(function(){
              var dataEquip = {};
              dataEquip['image'] = $(this).find('.equip-painted-weapon-img').data('retina-image');
              dataEquip['point'] = $(this).find('.equip-painted-point-number').text();
              data['profile']['equips'].push(dataEquip);
            });

            // ステージ情報
            request("https://splatoon.nintendo.net/schedule", function (error, response, body) {
              var $ = cheerio.load(body);
              data["schedule_map"] = {
                "regular": [], "gachi": [], "festival": []
              }
              var saved = false;
              $('.contents').children().each(function() {
                // 直近の情報のみ保存
                if (saved && $(this).hasClass("stage-schedule")) {
                  return false;
                }

                // ルールを判定
                var rule = "";
                if ($(this).find(".match-type .icon-regular-match").length) {
                  rule = "regular";
                } else if ($(this).find(".match-type .icon-earnest-match").length) {
                  rule = "gachi";
                  data["schedule_gachi_rule"] = $(this).find(".match-rule").text();
                } else if ($(this).hasClass("festival-stage-list")) {
                  rule = "festival";
                }
                if (rule == "") {
                  return true;
                }

                // ステージ名を取得
                $(this).find(".map-name").each(function(){
                  data["schedule_map"][rule].push($(this).text());
                  saved = true;
                });
              });

              // フレンドリスト
              request("https://splatoon.nintendo.net/", function (error, response, body) {
                var $ = cheerio.load(body);

                // 正確な最終更新日時の取得
                created_at = new Date($("#last-update").data("last-update")*1000);
                if (created_at.toString() != "Invalid Date") {
                  data["created_at"] = created_at.toISOString();
                }

                // ブキ名の取得
                var weaponIdRegexp = new RegExp("/([^/]*)-.*.png$");
                for (var i = 0; i < data['profile']['equips'].length; i++) {
                  var elem = data['profile']['equips'][i];
                  var weaponId = elem["image"].match(weaponIdRegexp);
                  elem["name"] = $('[value="'+weaponId[1]+'"]').first().text();
                };

                // rankingのJSON部分
                request("https://splatoon.nintendo.net/ranking/index.json", function (error, response, body) {
                  var ranking = JSON.parse(body);

                  // 自分のフェスのスコアはJSONからしか取れない
                  for (var i = 0; i < ranking['festival'].length; i++) {
                    if (ranking['festival'][i]['hashed_id'] == data['hash_id']) {
                      data["score_festival"]  = ranking['festival'][i]['score'].join('');
                    }
                  }

                  docClient.put({ TableName : 'dynamo-crawler-fetched', Item: data }, function(err, data) {});
                });
              });
            });
          });
        });

      });
    });
  });

};
