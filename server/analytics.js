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
    discount_codes.map( async (discount_code) => {
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

async function getTotalEmail(shop, from_date, to_date) {
    const shopInfo = await Shop.findOne({ name: shop });
    var discounts;
    if(from_date == null && to_date == null) {
        discounts = await Discount.aggregate([
            {
                $match: {
                    shop_id: shopInfo.id,
                }
            },
            {
                $group: {
                    _id: '$email',
                    count: {$sum: 1}
                }
            }
        ]);
    } else {
        counts = await Discount.aggregate([
            {
                $match: {
                    shop_id: shopInfo.id,
                    created_at: { $gte: new Date(from_date).toISOString(), $lt: new Date(to_date).toISOString()}
                }
            },
            {
                $group: {
                    _id: '$email',
                    count: {$sum: 1}
                }
            }
        ]);
    }
    return discounts.length;
}

async function getTotalSales(shop, from_date, to_date) {
    const shopInfo = await Shop.findOne({name: shop});
    var discounts;
    if(from_date == null && to_date == null) {
        discounts = await Discount.aggregate([
            {
                $match: {
                    shop_id: shopInfo.id,
                    used: true,
                },
            },
            {
                $group: {
                    _id: null,
                    // count: { $sum: '$used_amount' }
                    count: { $sum: 1 }
                }
            }
        ]);
    } else {
        discounts = await Discount.aggregate([
            {
                $match: {
                    shop_id: shopInfo.id,
                    used: true,
                    used_at: { $gte: new Date(from_date).toISOString(), $lt: new Date(to_date).toISOString()}
                },
                $group: {
                    _id: null,
                    count: { $sum: '$used_amount' }
                }
            }
        ]);
    }
    console.log(discounts);
    var total = 0;
    discounts.map(discount => {
        total += discount.used_amount;
    })

    return total;
}

async function conversionRate(shop, from_date, to_date) {
    const shopInfo = await Shop.findOne({ name: shop });
    var totalDiscounts, usedDiscounts;
    if(from_date == null && to_date == null) {
        totalDiscounts = await Discount.count({ shop_id: shopInfo.id});
        usedDiscounts = await Discount.count({ shop_id: shopInfo.id, used: true});
    } else {
        totalDiscounts = await Discount.count({ shop_id: shopInfo.id, created_at: { $gte: new Date(from_date).toISOString(), $lt: new Date(to_date).toISOString()}});
        usedDiscounts = await Discount.count({ shop_id: shopInfo.id, used: true, used_at: { $gte: new Date(from_date).toISOString(), $lt: new Date(to_date).toISOString()}});
    }
    if(usedDiscounts == 0) {
        return 0;
    } else {
        return (totalDiscounts/usedDiscounts).toFixed(2) * 100;
    }
}

async function exportEmail(ctx, next) {
    const { shop } = ctx.request.body;
    const shopInfo = await Shop.findOne({ name: shop });
    const discounts = await Discount.find({ shop_id: shopInfo.id });
    ctx.body = discounts
}

async function getDashboardInfo(ctx, next) {
    const { shop, from_date, to_date } = ctx.request.body;
    const shopInfo = await Shop.findOne({ name: shop });
    var totalSales = await getTotalSales(shop, from_date, to_date);
    var totalEmail = await getTotalEmail(shop, from_date, to_date);
    var conversionRating = await conversionRate(shop, from_date, to_date);
    var graphData;
    if(from_date != null && to_date != null) {
        graphData = await Discount.aggregate([
            {
                $match: {
                    shop_id: shopInfo.id,
                    used: true,
                    used_at: { $gte: new Date(from_date).toISOString(), $lt: new Date(to_date).toISOString()}
                }
            },
            { $sort: { used_at: -1 } },
            {
                $project: {
                    year: { $year: used_at },
                    month: { $month: used_at },
                    dayOfMonth: { $dayOfMonth: used_at }
                }
            },
            {
                $group: {
                    _id: {
                        year: '$year',
                        month: '$month',
                        dayOfMonth: '$dayOfMonth'
                    },
                    totalEmail: { $sum: 1 },
                    totalSales: { $sum: '$used_amount' }
                }
            }])
    } else {
        graphData = await Discount.aggregate([
            {
                $match: {
                    shop_id: shopInfo.id,
                    used: true,
                }
            },
            { $sort: { used_at: -1 } },
            {
                $project: {
                    year: { $year: "$used_at" },
                    month: { $month: "$used_at" },
                    dayOfMonth: { $dayOfMonth: "$used_at" }
                }
            },
            {
                $group: {
                    _id: {
                        year: '$year',
                        month: '$month',
                        dayOfMonth: '$dayOfMonth'
                    },
                    totalEmail: { $sum: 1 },
                    totalSales: { $sum: '$used_amount' }
                }
            }])
    }
    var widgets = await Widget.find({shop_id: shopInfo.id}, null, { sort: '-created_at'});

    ctx.body = { totalSales, totalEmail, conversionRating, graphData, widgets };
}

module.exports.checkout = checkout;
module.exports.exportEmail = exportEmail;
module.exports.getDashboardInfo = getDashboardInfo;