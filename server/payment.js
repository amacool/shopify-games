const dotenv = require('dotenv');
dotenv.config();

const { API_VERSION, TUNNEL_URL } = process.env;
const Shop = require('../models/Shop');
const { deparam, getCookie } = require('../utils/util');

async function processPayment(ctx, next) {
    var shop = ctx.cookies.get('shopOrigin');
    ctx.cookies.set("shopOrigin", shop, { httpOnly: false });
    var appSetting = await Shop.findOne({ name: shop });
    var accessToken = '';
    if (appSetting) {
        accessToken = appSetting.accessToken;
    }
    if (ctx.query.charge_id) {
        const chargeUrl = `admin/api/${API_VERSION}/recurring_application_charges`;
        const options = {
            credentials: 'include',
            headers: {
                'X-Shopify-Access-Token': accessToken,
                'Content-Type': 'application/json'
            }
        };
        const optionsWithGet = { ...options, method: 'GET' };
        const optionsWithPost = { ...options, method: 'POST' };
        await fetch(
            `https://${shop}/${chargeUrl}/${ctx.query.charge_id}.json`,
            optionsWithGet
        )
            .then(response => response.json())
            .then(myJson => {
                if (myJson.recurring_application_charge.status === 'accepted') {
                    const stringifyMyJSON = JSON.stringify(myJson);
                    const optionsWithJSON = { ...optionsWithPost, body: stringifyMyJSON };
                    fetch(`https://${shop}/${chargeUrl}/${ctx.query.charge_id}/activate.json`, optionsWithJSON)
                        .then((response) => response.json())
                        .then((json) => {
                            const id = json.recurring_application_charge.id;
                            appSetting.chargeId = id;
                            appSetting.pricingPlan = 1;
                            appSetting.save();
                            return ctx.redirect(json.recurring_application_charge.return_url);
                        })
                        .catch((error) => console.log('error', error));
                } else { return ctx.redirect('/'); }
            });
        return ctx.redirect('/');
    } else if (ctx.query.hmac) {
        var param = deparam(ctx.request.url);
        shop = param.shop;
        if (shop && shop.length > 0) {
            ctx.cookies.set('shopOrigin', shop, { httpOnly: false });
        }
        // await next();
        return ctx.redirect('/dashboard');
    } else {
        return ctx.redirect('/loading');
    }
}

async function freeMembership(ctx, next) {
    var param;
    var shop = '';
    if (ctx.request.header.referer) {
        param = deparam(ctx.request.header.referer);
        shop = param.shop;
    } else {
        shop = getCookie('shopOrigin', ctx.request.header.cookie);
    }
    ctx.cookies.set("shopOrigin", shop, { httpOnly: false });
    var appSetting = await Shop.findOne({ name: shop });
    const accessToken = appSetting.accessToken;
    const options = {
        method: 'DELETE',
        credentials: 'include',
        headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
        }
    }

    await fetch(`https://${shop}/admin/api/${API_VERSION}/recurring_application_charges/${appSetting.charge_id}`, options)
        .then((response) => {
            appSetting.pricingPlan = 0;
            appSetting.chargeId = '';
            appSetting.save();
        })
        .catch((error) => console.log('error', error));

    ctx.body = { success: true };
}

async function premiumMembership(ctx, next) {
    var param;
    var shop = '';
    if (ctx.request.header.referer) {
        param = deparam(ctx.request.header.referer);
        shop = param.shop;
    } else {
        shop = getCookie('shopOrigin', ctx.request.header.cookie);
    }
    var appSetting = await Shop.findOne({ name: shop });
    const accessToken = appSetting.accessToken;
    ctx.cookies.set("shopOrigin", shop, { httpOnly: false });
    const stringifiedBillingParams = JSON.stringify({
        recurring_application_charge: {
            name: 'Recurring charge',
            price: 19.99,
            return_url: TUNNEL_URL,
            test: true,
        },
    });

    const options = {
        method: 'POST',
        body: stringifiedBillingParams,
        credentials: 'include',
        headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
        }
    };

    const confirmationURL = await fetch(
        `https://${shop}/admin/api/${API_VERSION}/recurring_application_charges.json`, options,
    )
        .then((response) => response.json())
        .then((jsonData) => {
            return jsonData.recurring_application_charge.confirmation_url;
        })
        .catch((error) => console.log('error', error));
    ctx.body = { url: confirmationURL };
}

module.exports.processPayment = processPayment;
module.exports.freeMembership = freeMembership;
module.exports.premiumMembership = premiumMembership;