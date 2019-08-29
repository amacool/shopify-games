const dotenv = require('dotenv');
const cheerio = require('cheerio');
const Entities = require('html-entities').XmlEntities;
dotenv.config();

const { API_VERSION } = process.env;
const Shop = require('../models/Shop');
const Discount = require('../models/Discount');
const Widget = require('../models/Widget');
const { existsInArray } = require('../utils/util');

async function removeExpiredCode() {
    console.log('remove expired code');
    const shops = await Shop.find();

    if (shops && shops.length > 0) {
        shops.map(appSetting => {
            if (appSetting.install == 1) {
                const priceRuleUrl = `admin/api/${API_VERSION}/price_rules.json`;
                const options = {
                    credentials: 'include',
                    headers: {
                        'X-Shopify-Access-Token': appSetting.accessToken,
                        'Content-Type': 'application/json'
                    }
                };
                const optionsWithGet = { ...options, method: 'GET' };

                fetch(`https://${appSetting.name}/${priceRuleUrl}`, optionsWithGet)
                    .then(response => response.json())
                    .then(json => {
                        if (json.errors) {
                            return;
                        }

                        var price_rules = json.price_rules;
                        price_rules.map(price_rule => {
                            var ends_at = new Date(price_rule.ends_at);
                            var now = new Date();
                            if (ends_at < now) {
                                console.log('delete price rule');
                                var deleteUrl = `admin/api/${API_VERSION}/price_rules/${price_rule.id}.json`;
                                const optionsWithDelete = { ...options, method: 'DELETE' };

                                fetch(`https://${appSetting.name}/${deleteUrl}`, optionsWithDelete);
                            }
                        });
                    })
            }
        })
    }
}

async function pauseWidget(ctx, next) {
    const { widget_id } = ctx.request.body;
    var widget = await Widget.findOne({_id: widget_id});
    widget.pause = !widget.pause;

    widget.save();
    ctx.body = 'succss';
}

async function getWidgets(ctx, next) {
    const shop = ctx.request.body.shop;

    const shopSetting = await Shop.findOne({name: shop});
    var widgets = await Widget.find({shop_id: shopSetting.id}, null, { sort: '-created_at'});

    ctx.body = widgets;
}

async function getSetting(ctx, next) {
    var {id} = ctx.request.body
    var widget = await Widget.find({ _id: id });
    if (widget[0]) {
        ctx.body = {setting: widget[0]};
    } else {
        ctx.body = {error: true};
    }
}

async function saveSetting(ctx, next) {
    const { id } = ctx.request.body;
    var updateSetting = ctx.request.body.updateSetting;
    await Widget.find({ _id: id }, async (err, setting) => {
        if (err) {
            console.log(err);
            return;
        }
        if (setting[0]) {
            setting[0].displaySetting = updateSetting.displaySetting;
            setting[0].displayFrequency = updateSetting.displayFrequency;
            setting[0].timer = updateSetting.timer;
            setting[0].frequency = updateSetting.frequency;
            setting[0].exitIntent = updateSetting.exitIntent;
            setting[0].exitIntentTime = updateSetting.exitIntentTime;
            setting[0].created_at = new Date().toISOString();
            setting[0].save();
        }
    });
    ctx.body = 'success';
}

async function savePageSetting(ctx, next) {
    var id = ctx.request.body.id;
    await  Widget.find({ _id: id }, async (err, setting) => {
        if (err) {
            console.log(err);
            return;
        }
        console.log(setting[0]);
        if (setting[0]) {
            setting[0].pageSetting = ctx.request.body.updateSetting;
            setting[0].displaySetting = 'specific';
            setting[0].save();
        }
    });

    ctx.body = 'success';
}

async function getPageSetting(ctx, next) {
    const id = ctx.request.body.id;
    var setting = await Widget.findOne({_id: id});
    var shop = await Shop.findOne({_id: setting.shop_id});
    var pageSetting = JSON.parse(setting.pageSetting);
    var staticSetting = pageSetting.pages;
    var blogSetting = pageSetting.blogs;
    var productSetting = pageSetting.products;

    const getPageUrl = `https://${shop.name}/admin/api/${API_VERSION}/pages.json`;

    const options = {
        credentials: 'include',
        headers: {
            'X-Shopify-Access-Token': shop.accessToken,
            'Content-Type': 'application/json'
        }
    }

    const optionsWithGet = { ...options, method: 'GET' };

    var pages = await fetch(getPageUrl, optionsWithGet).then(resp => resp.json())
        .then(json => {
            var pages = json.pages;

            Object.keys(staticSetting).forEach(function (key) {
                if (key != "allPages") {
                    if (!existsInArray(key, pages)) {
                        delete staticSetting[key];
                    }
                }
            });
            pages = pages.map(page => {
                return {
                    title: page.title,
                    handle: page.handle
                }
            })
            return pages;
        });

    const getBlogUrl = `https://${shop.name}/admin/api/${API_VERSION}/blogs.json`;

    var blogs = await fetch(getBlogUrl, optionsWithGet).then(resp => resp.json())
        .then(json => {
            var blogs = json.blogs;
            Object.keys(blogSetting).forEach(function (key) {
                if (key != "allBlogs") {
                    if (!existsInArray(key, blogs)) {
                        delete blogSetting[key];
                    }
                }
            })
            blogs = blogs.map(blog => {
                return {
                    title: blog.title,
                    handle: blog.handle
                }
            });
            return blogs;
        })

    const getProductUrl = `https://${shop.name}/admin/api/${API_VERSION}/products.json`;

    var products = await fetch(getProductUrl, optionsWithGet).then(resp => resp.json())
        .then(json => {
            var products = json.products;
            if (json.errors) {
                return;
            }
            Object.keys(productSetting).forEach(function (key) {
                if (key != "allProducts") {
                    if (!existsInArray(key, products)) {
                        delete productSetting[key];
                    }
                }
            });
            products = products.map(product => {
                return {
                    title: product.title,
                    handle: product.handle
                }
            });
            return products;
        })

    pageSetting.pages = staticSetting;
    pageSetting.products = productSetting;
    pageSetting.blogs = blogSetting;

    setting.pageSetting = JSON.stringify(pageSetting);
    setting.save();

    ctx.body = JSON.stringify({
        pageSetting,
        pages,
        blogs,
        products
    });
}

async function deleteWidget(ctx, next) {
    const { widget_id } = ctx.request.body;
    await Widget.findByIdAndDelete(widget_id);

    ctx.body = 'success';
}

async function createWidget(ctx, next) {
    const { type, name, shop } = ctx.request.body;
    var shopObj = await Shop.findOne({ name: shop});
    var obj = await Widget.findOne({ name: name, type: type});
    if(obj) {
        ctx.body = {
            error: true,
            message: 'exist'
        };
    } else {
        var widget = new Widget();
        ctx.body = {
            success: true,
            id: widget.id
        };
        widget.type = type;
        widget.name = name;
        widget.created_at = new Date().toString();
        widget.shop_id = shopObj.id;
        await widget.save();
    }
}

async function updateDiscount(ctx, next) {
    const { discounts, id } = ctx.request.body;
    var obj = await Widget.findOne({_id: id});
    if(obj) {
        obj.discountType = JSON.stringify(discounts);
        obj.save();
        ctx.body = 'success';
    } else {
        ctx.body = 'error';
    }
}

async function getDiscounts(ctx, next) {
    const { id } = ctx.request.body;
    var obj = await Widget.findOne({_id: id});
    if(obj) {
        ctx.body = {
            discounts: obj.discountType
        }
    } else {
        ctx.body = {
            error: true
        }
    }
}

async function getStyle(ctx, next) {
    const { id } = ctx.request.body;
    var obj = await Widget.findOne({_id: id});
    if(obj) {
        ctx.body = {
            style: obj.style
        }
    } else {
        ctx.body = {
            error: true
        }
    }
}

async function updateStyle(ctx, next) {
    const { style, id } = ctx.request.body;
    var obj = await Widget.findOne({_id: id});
    if(obj) {
        obj.style = style;
        obj.save();
        ctx.body = 'success';
    } else {
        ctx.body = 'error';
    }
}

async function duplicateWidget(ctx, next) {
    const { widget_id, name } = ctx.request.body;
    var oldWidget = await Widget.findById(widget_id);
    var newWidget = new Widget();
    newWidget.type = oldWidget.type;
    newWidget.name = name;
    newWidget.pause = oldWidget.pause;
    newWidget.style = oldWidget.style;
    newWidget.shop_id = oldWidget.shop_id;
    newWidget.discountType = oldWidget.discountType;
    newWidget.couponExpire = oldWidget.couponExpire;
    newWidget.displaySetting = oldWidget.displaySetting;
    newWidget.pageSetting = oldWidget.pageSetting;
    newWidget.timer = oldWidget.timer;
    newWidget.frequency = oldWidget.frequency;
    newWidget.displayFrequency = oldWidget.displayFrequency;
    newWidget.exitIntent = oldWidget.exitIntent;
    newWidget.exitIntentTime = oldWidget.exitIntentTime;
    newWidget.description = oldWidget.description;
    newWidget.headline = oldWidget.headline;
    newWidget.button = oldWidget.button;
    newWidget.placeholder = oldWidget.placeholder;
    newWidget.created_at = oldWidget.created_at;
    newWidget.save();

    ctx.body = {id: newWidget.id};
}

module.exports.getSetting = getSetting;
module.exports.saveSetting = saveSetting;
module.exports.getPageSetting = getPageSetting;
module.exports.savePageSetting = savePageSetting;
module.exports.removeExpiredCode = removeExpiredCode;
module.exports.getWidgets = getWidgets;
module.exports.pauseWidget = pauseWidget;
module.exports.deleteWidget = deleteWidget;
module.exports.createWidget = createWidget;
module.exports.updateDiscount = updateDiscount;
module.exports.getDiscounts = getDiscounts;
module.exports.updateStyle = updateStyle;
module.exports.getStyle = getStyle;
module.exports.duplicateWidget = duplicateWidget;