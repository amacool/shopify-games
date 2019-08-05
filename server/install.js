const { registerWebhook } = require('@shopify/koa-shopify-webhooks');
const fs = require('fs');
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
                return 'Already exist';
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
        address: `${TUNNEL_URL}/webhooks/products/create`,
        topic: 'PRODUCTS_CREATE',
        accessToken,
        shop,
    });

    ctx.redirect('/');
}

module.exports = installing;