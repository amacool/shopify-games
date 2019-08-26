const dotenv = require('dotenv');
const moment = require('moment');
const cheerio = require('cheerio');
const Entities = require('html-entities').XmlEntities;
dotenv.config();

const { API_VERSION, TUNNEL_URL } = process.env;
const Shop = require('../models/Shop');
const Discount = require('../models/Discount');
const Widget = require('../models/Widget');
const { jsUcfirst } = require('../utils/util');

async function checkout(ctx, next) {
    const {discount_codes, total_price_set} = ctx.state.webhook;
    discount_codes.map(discount_code => {
        var result = await Discount.findById(discount_code);
        if(result) {
            result.used = true;
            result.used_at = new Date().toISOString();
            result.used_amount = total_price_set.shop_money.amount;
            result.save();
        }
    })

    ctx.body = 'success';
}

async function getTotalEmail(ctx, next) {
    const {shop} = ctx.request.body;
    const shopInfo = await Shop.findOne({ name: shop });
    const discounts = await Discount.aggregate([
        {
            $match: {
                shop_id: shop
            }
        },
        {
            $group: {
                _id: '$email',
                count: {$sum: 1}
            }
        }
    ]);
    ctx.body = discounts.length;
}

async function conversionRate(ctx,next) {
    const { shop } = ctx.request.body;
    const shopInfo = await Shop.findOne({ name: shop });
    const totalDiscounts = await Discount.count({ shop_id: shopInfo.id});
    const usedDiscounts = await Discount.count({ shop_id: shopInfo.id, used: true});

    ctx.body = (totalDiscounts/usedDiscounts).toFixed(2) * 100;
}

async function exportEmail(ctx, next) {
    const { shop } = ctx.request.body;
    const shopInfo = await Shop.findOne({ name: shop });
    const discounts = await Discount.find({ shop_id: shopInfo.id });
    ctx.body = discounts
}

module.exports.checkout = checkout;
module.exports.getTotalEmail = getTotalEmail;
module.exports.conversionRate = conversionRate;
module.exports.exportEmail = exportEmail;