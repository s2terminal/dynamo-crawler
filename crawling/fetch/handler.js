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
var now = new Date();
var data = {
  "created_at" : now,
};


module.exports.handler = function(event, context, cb) {
  // ログイン
  var form  = {};
  docClient.get({
    TableName: "dynamo-crawler-form", Key: { "key": "username" }
  }, function(err, data) {
    form["username"] = data.Item.value;
    docClient.get({
      TableName: "dynamo-crawler-form", Key: { "key": "password" }
    }, function(err, data) {
      form["password"] = data.Item.value;

      request({
        url: "https://id.nintendo.net/login",
        method: 'POST',
        form: form
      }, function (error, response, body) {
        // ランキング
        request("https://splatoon.nintendo.net/ranking", function (error, response, body) {
          var $ = cheerio.load(body);
          data["score-regular"]   = $("#ranking").data("score-regular");
          data["score-gachi"]     = $("#ranking").data("score-gachi");
          data["score-festival"]  = $("#ranking").data("score-festival");

          // そうび
          request("https://splatoon.nintendo.net/profile", function (error, response, body) {
            var $ = cheerio.load(body);

            data['profile'] = {};
            data['profile']['name'] = $('.profile-username').text();
            data['profile']['rank'] = $('.typography-equip-rank').next('p').text();
            data['profile']['udemae'] = $('.typography-equip-udemae').next('p').text();
            data['profile']['equips'] = [];
            $('.equip-painted-rank .equip-painted-data').each(function(){
              var dataEquip = {};
              dataEquip['image'] = $(this).find('.equip-painted-weapon-img').data('retina-image');
              dataEquip['point'] = $(this).find('.equip-painted-point-number').text();
              data['profile']['equips'].push(dataEquip);
              console.log(dataEquip); // テスト出力
            });

            // ステージ情報
            request("https://splatoon.nintendo.net/schedule", function (error, response, body) {
              var $ = cheerio.load(body);
              data["schedule-map"] = {
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
                  data["schedule-gachi-rule"] = $(this).find(".match-rule").text();
                } else if ($(this).find(".match-type .icon-festival-match").length) {
                  // TODO 検証されていないコード
                  rule = "festival";
                }

                // ステージ名を取得
                $(this).find(".map-name").each(function(){
                  data["schedule-map"][rule].push($(this).text());
                  saved = true;
                });
              });

              console.log(data);
            });
          });
        });

      });
    });
  });

};