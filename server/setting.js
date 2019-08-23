const dotenv = require('dotenv');
const cheerio = require('cheerio');
const Entities = require('html-entities').XmlEntities;
dotenv.config();

const { API_VERSION } = process.env;
const Shop = require('../models/Shop');
const Discount = require('../models/Discount');
const Widget = require('../models/Widget');

async function removeExpiredCode() {
    console.log('remove expired code');
    const shops = await Shop.find();

    if (shops && shops.length > 0) {
        shop.map(appSetting => {
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
    const { widget_id, pause } = ctx.request.body;
    var widget = await Widget.findfOne({_id: widget_id});
    widget.pause = pause;

    widget.save();
    ctx.body = 'succss';
}

async function getWidgets(ctx, next) {
    const shop = ctx.request.body.shop;

    const shopSetting = await Shop.findOne({name: shop});
    var widgets = await Widget.find({shop_id: shopSetting.id}, null, { sort: '-created_at'});

    ctx.body = widgets;
}

async function changeDisplaySetting(fromPage, toPage, shop, accessToken, id) {
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
            var pageContent = json.asset.value;
            pageContent = changeDisplayPage(pageContent, toPage, id);
            await fetch(
                `https://${shop}/admin/api/${API_VERSION}/themes/${mainThemeId}/assets.json`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: {
                        'X-Shopify-Access-Token': accessToken,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        asset: {
                            key: 'layout/theme.liquid',
                            value: pageContent
                        }
                    })
                }).then(resp => resp.json())
                .then(json => {
                    return json;
                })
        });
}

function changeDisplayPage(pageContent, toPage, id) {
    const entities = new Entities();
    const $ = cheerio.load(pageContent);

    if (toPage == 'product') {
        $('.tada-app-content').html(`<script>
        (function() {
            setTimeout(function () {
                var checkReady = function(callback) {
                    if (window.jQuery) {
                        callback(jQuery);
                    } else {
                        window.setTimeout(function() {
                            checkReady(callback);
                        }, 100);
                    }
                };
    
                var runCode = function($) {
                    //Code here
                    $(document).ready(function() {
                        setTimeout(function () {
                          var pathname = window.location.pathname;
                          if(pathname.indexOf('${toPage}') > -1) {
                              $.ajax({
                                url: 'https://app.trytada.com/getWidget',
                                type: 'post',
                                data: JSON.stringify({
                                  timeToken: getCookie('tada_${id}_timeToken'),
                  shop: window.location.hostname
                                }),
                                contentType: 'application/json',
                                success: function(content){
                                    if(content != 'timeout') {
                                        $('.tada-app-content').html(content);
                                    } else {
                                        console.log('need to wait');
                                    }
                                },
                                error: function(){
                                    console.log('error');
                                }
                            });
                          }
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
                    checkReady(function($) {
                        runCode($);
                    });
                } else {
                    runCode(jQuery);
                }
            }, 1500);
        })();
    
      </script>`);
    } else if (toPage == 'all') {
        $('.tada-app-content').html(`<script>
            
      (function() {
        setTimeout(function () {
            var checkReady = function(callback) {
                if (window.jQuery) {
                    callback(jQuery);
                } else {
                    window.setTimeout(function() {
                        checkReady(callback);
                    }, 100);
                }
            };
  
            var runCode = function($) {
                //Code here
                $(document).ready(function() {
                    setTimeout(function () {
                        $.ajax({
                            url: 'https://app.trytada.com/getWidget',
                            type: 'post',
                            data: JSON.stringify({
                              timeToken: getCookie('tada_${id}_timeToken'),
                  shop: window.location.hostname
                            }),
                            contentType: 'application/json',
                            success: function(content){
                                if(content != 'timeout') {
                                    $('.tada-app-content').html(content);
                                } else {
                                    console.log('need to wait');
                                }
                            },
                            error: function(){
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
                checkReady(function($) {
                    runCode($);
                });
            } else {
                runCode(jQuery);
            }
        }, 1500);
    })();
  
      </script>`);
    } else if (toPage == 'none') {
        $('.tada-app-content').html(``);
    } else {
        var pages = JSON.parse(toPage);
        var htmlWidget = `<script>
        (function() {
            setTimeout(function () {
                var checkReady = function(callback) {
                    if (window.jQuery) {
                        callback(jQuery);
                    } else {
                        window.setTimeout(function() {
                            checkReady(callback);
                        }, 100);
                    }
                };
  
                var runCode = function($) {
                    //Code here
                    $(document).ready(function() {
                        setTimeout(function () {
                          var pathname = window.location.pathname;
                          if(`;
        if (pages.homepage) {
            htmlWidget += `pathname == '/' ||`;
        }
        if (pages.products) {
            Object.keys(pages.products).forEach(function (key) {
                if (key != "allPages") {
                    if (pages.products[key].show) {
                        htmlWidget += ` pathname.indexOf('/${pages.products[key].handle}') > -1 ||`;
                    }
                }
            })
        }
        if (pages.blogs) {
            Object.keys(pages.blogs).forEach(function (key) {
                if (key != "allBlogs") {
                    if (pages.blogs[key].show) {
                        htmlWidget += ` pathname.indexOf('/${pages.blogs[key].handle}') > -1 ||`;
                    }
                }
            })
        }
        if (pages.pages) {
            Object.keys(pages.pages).forEach(function (key) {
                if (key != "allStatic") {
                    if (pages.pages[key].show) {
                        htmlWidget += ` pathname.indexOf('/${pages.pages[key].handle}') > -1 ||`;
                    }
                }
            })
        }
        if (pages.cart) {
            htmlWidget += ` pathname.indexOf('/cart') > -1 ||`;
        }
        if (pages.search) {
            htmlWidget += ` pathname.indexOf('/search') > -1 ||`;
        }

        htmlWidget = htmlWidget.substring(0, htmlWidget.length - 2);
        htmlWidget += `) {
                $.ajax({
                  url: 'https://app.trytada.com/getWidget',
                  type: 'post',
                  data: JSON.stringify({
                    timeToken: getCookie('tada_${id}_timeToken'),
          shop: window.location.hostname
                  }),
                  contentType: 'application/json',
                  success: function(content){
                      if(content != 'timeout') {
                          $('.tada-app-content').html(content);
                      } else {
                          console.log('need to wait');
                      }
                  },
                  error: function(){
                      console.log('error');
                  }
              });
            }
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
          checkReady(function($) {
          runCode($);
          });
          } else {
          runCode(jQuery);
          }
          }, 1500);
          })();
  
          </script>`;
        $('.tada-app-content').html(htmlWidget);
    }
    return entities.decode($.html());
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
    id = ctx.request.body.id;
    var updateSetting = ctx.request.body.updateSetting;
    await Widget.find({ _id: id }, (err, setting) => {
        if (err) {
            console.log(err);
            return;
        }
        if (setting[0]) {
            if (setting[0].displaySetting != updateSetting.displaySetting && updateSetting.displaySetting != 'specific') {
                const shop = await Shop.findOne({_id: setting[0].shop_id});
                changeDisplaySetting(setting[0].displaySetting, updateSetting.displaySetting, shop.name, shop.accessToken, setting[0].id);
            }
            setting[0].displaySetting = updateSetting.displaySetting;
            setting[0].displayFrequency = updateSetting.displayFrequency;
            setting[0].timer = updateSetting.timer;
            setting[0].frequency = updateSetting.frequency;
            setting[0].exitIntent = updateSetting.exitIntent;
            setting[0].exitIntentTime = updateSetting.exitIntentTime;
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
            const shop = await Shop.findOne({_id: setting[0].shop_id});
            changeDisplaySetting('', setting[0].pageSetting, shop.name, shop.accessToken, setting[0].id);
            setting[0].displaySetting = 'specific';
            setting[0].save();
        }
    });

    ctx.body = 'success';
}

async function getPageSetting(ctx, next) {
    var appSetting = await AppSetting.findOne();
    var pageSetting = JSON.parse(appSetting.pageSetting);
    var staticSetting = pageSetting.pages;
    var blogSetting = pageSetting.blogs;
    var productSetting = pageSetting.products;
    const getPageUrl = `https://${appSetting.shop}/admin/api/${API_VERSION}/pages.json`;

    const options = {
        credentials: 'include',
        headers: {
            'X-Shopify-Access-Token': appSetting.accessToken,
            'Content-Type': 'application/json'
        }
    }

    const optionsWithGet = { ...options, method: 'GET' };

    await fetch(getPageUrl, optionsWithGet).then(resp => resp.json())
        .then(json => {
            var pages = json.pages;

            Object.keys(staticSetting).forEach(function (key) {
                if (key != "allPages") {
                    if (!existsInArray(key, pages)) {
                        delete staticSetting[key];
                    }
                }
            });
            pages.map(page => {
                if (!staticSetting[page.id]) {
                    staticSetting[page.id] = {
                        title: page.title,
                        handle: page.handle
                    };
                    if (staticSetting.allPages) {
                        staticSetting[page.id].show = true;
                    } else {
                        staticSetting[page.id].show = false;
                    }
                }
            })
        });

    const getBlogUrl = `https://${appSetting.shop}/admin/api/${API_VERSION}/blogs.json`;

    await fetch(getBlogUrl, optionsWithGet).then(resp => resp.json())
        .then(json => {
            var blogs = json.blogs;
            Object.keys(blogSetting).forEach(function (key) {
                if (key != "allBlogs") {
                    if (!existsInArray(key, blogs)) {
                        delete blogSetting[key];
                    }
                }
            })
            blogs.map(blog => {
                if (!blogSetting[blog.id]) {
                    blogSetting[blog.id] = {
                        title: blog.title,
                        handle: blog.handle
                    };
                    if (blogSetting.allBlogs) {
                        blogSetting[blog.id].show = true;
                    } else {
                        blogSetting[blog.id].show = false;
                    }
                }
            });
        })

    const getProductUrl = `https://${appSetting.shop}/admin/api/${API_VERSION}/products.json`;

    await fetch(getProductUrl, optionsWithGet).then(resp => resp.json())
        .then(json => {
            var products = json.products;
            console.log(json);
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
            products.map(product => {
                if (!productSetting[product.id]) {
                    productSetting[product.id] = {
                        title: product.title,
                        handle: product.handle
                    }
                    if (productSetting.allProducts) {
                        productSetting[product.id].show = true;
                    } else {
                        productSetting[product.id].show = false;
                    }
                }
            })
        })

    pageSetting.pages = staticSetting;
    pageSetting.products = productSetting;
    pageSetting.blogs = blogSetting;

    appSetting.pageSetting = JSON.stringify(pageSetting);
    appSetting.save();

    ctx.body = JSON.stringify(pageSetting);
}

async function deleteWidget(ctx, next) {
    const { widget_id } = ctx.request.body;
    await Widget.findOne({id: widget_id}, (err, result) => {
        if(err) {
            console.log(err);
            return;
        }

        if(result) {
            result.remove();
        }
    })

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