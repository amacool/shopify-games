const { registerWebhook } = require('@shopify/koa-shopify-webhooks');
const fs = require('fs');
const cheerio = require('cheerio');
const Entities = require('html-entities').XmlEntities;
const { API_VERSION, TUNNEL_URL } = process.env;
const AppSetting = require('../models/AppSetting');

async function installing(ctx) {
    const { shop, accessToken } = ctx.session;
    AppSetting.find({shop: shop}, (err, shops) => {
        if(err) {
            console.log(err);
            return;
        }
        if(shops.length > 0) {
            shops[0].accessToken = accessToken;
            shops[0].displaySetting = 'all';
            shops[0].timer = 0;
            shops[0].frequency = 'every';
            shops[0].displayFrequency = 0;
            shops[0].pricingPlan = 0;
            shops[0].chargeId = '';
            shops[0].save();
        } else {
            const newShop = new AppSetting();
            newShop.shop = shop;
            newShop.accessToken = accessToken;
            newShop.save();
        }
    });

    ctx.cookies.set("shopOrigin", shop, { httpOnly: false });

    var mainThemeId = await fetch(
        `https://${shop}/admin/api/${API_VERSION}/themes.json`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'X-Shopify-Access-Token': accessToken,
                'Content-Type': 'application/json'
            }
        },
    ).then((response) => response.json())
        .then((json) => {
            for (var i = 0; i < json.themes.length; i++) {
                if (json.themes[i].role == 'main') {
                    return json.themes[i].id;
                }
            }
        });

    await fetch(
        `https://${shop}/admin/api/${API_VERSION}/themes/${mainThemeId}/assets.json?asset[key]=layout/theme.liquid&theme_id=${mainThemeId}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'X-Shopify-Access-Token': accessToken,
                'Content-Type': 'application/json'
            }
        },
    ).then(resp => resp.json())
        .then(async function (json) {
            var body = json.asset.value;
            if (body && body.includes('tada-app-content')) {
                const entities = new Entities();
                const $ = cheerio.load(body);
                $('.tada-app-content').html(`<script>
                    (function () {
                        setTimeout(function () {
                            var checkReady = function (callback) {
                                if (window.jQuery) {
                                    callback(jQuery);
                                } else {
                                    window.setTimeout(function () {
                                        checkReady(callback);
                                    }, 100);
                                }
                            };
            
                            var runCode = function ($) {
                                //Code here
                                $(document).ready(function () {
                                    setTimeout(function () {
                                        $.ajax({
                                            url: 'https://app.trytada.com/getWidget',
                                            type: 'post',
                                            data: JSON.stringify({
                                                timeToken: getCookie('timeToken'),
                                shop: window.location.hostname
                                            }),
                                            contentType: 'application/json',
                                            success: function (content) {
                                                if (content != 'timeout') {
                                                    $('.tada-app-content').html(content);
                                                } else {
                                                    console.log('need to wait');
                                                }
                                            },
                                            error: function () {
                                                console.log('error');
                                            }
                                        });
            
                                    }, 100);
                                });
            
            
                            };
            
            
                            function getCookie(name) {
                                var nameEQ = name + "=";
                                var ca = document.cookie.split(';');
                                for (var i = 0; i < ca.length; i++) {
                                    var c = ca[i];
                                    while (c.charAt(0) == ' ') c = c.substring(1, c.length);
                                    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
                                }
                                return null;
                            }
            
            
                            if (typeof jQuery == "undefined") {
                                var script = document.createElement("SCRIPT");
                                script.src =
                                    'https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js';
                                script.type = 'text/javascript';
                                document.getElementsByTagName("head")[0].appendChild(script);
                                checkReady(function ($) {
                                    runCode($);
                                });
                            } else {
                                runCode(jQuery);
                            }
                        }, 1500);
                    })();
            
                </script>`);

            await fetch(
                `https://${shop}/admin/api/${API_VERSION}/themes/${mainThemeId}/assets.json`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: {
                        'X-Shopify-Access-Token': accessToken,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        "asset": {
                            "key": "layout/theme.liquid",
                            "value": entities.decode($.html())
                        }
                    })
                }).then(resp => resp.json())
                .then(json => {
                    return json;
                });
            } else {
                var index = body.indexOf('</body>');
                var additional = '';
                await fs.readFile(__dirname + '/../public/container.html','utf8', async function (err, html) {
                    if (err) {
                        console.log(err);
                        return '';
                    }
                    additional = html;
                    body = body.substring(0, index) + additional + body.substring(index, body.length);
                    await fetch(
                        `https://${shop}/admin/api/${API_VERSION}/themes/${mainThemeId}/assets.json`, {
                            method: 'PUT',
                            credentials: 'include',
                            headers: {
                                'X-Shopify-Access-Token': accessToken,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                "asset": {
                                    "key": "layout/theme.liquid",
                                    "value": body
                                }
                            })
                        }).then(resp => resp.json())
                        .then(json => {
                            return json;
                        });
                    });
            }
        });

    const registration = await registerWebhook({
        address: `app.trytada.com/webhooks/products/create`,
        topic: 'PRODUCTS_CREATE',
        accessToken,
        shop,
    });

    const uninstall = await registerWebhook({
        address: `app.trytada.com/webhooks/uninstall`,
        topic: 'APP_UNINSTALLED',
        accessToken,
        shop
    });

    console.log(uninstall);

    ctx.redirect('/');
}

module.exports = installing;
