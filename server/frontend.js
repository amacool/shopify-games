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

async function addDiscount(ctx, next) {
  var data = '';
  const { discount_value, discount_type, discount_code, widget_id } = ctx.request.body;
  const widgetSetting = await Widget.findOne({_id: widget_id});
  const shopSetting = await Shop.findOne({_id: widgetSetting.shop_id});

  var today = new Date();
  var expired_at = new Date(today.getTime() + widgetSetting.couponExpire*60000);
  if (discount_code && discount_type) {

    const priceRuleUrl = `admin/api/${API_VERSION}/price_rules.json`;
    var price_rule = {
      target_type: 'line_item',
      target_selection: 'all',
      allocation_method: 'across',
      customer_selection: 'all',
      starts_at: today.toISOString(),
      ends_at: expired_at.toISOString(),
      usage_limit: 1
    };

    if (discount_type == "percentage") {
      price_rule.title = discount_value + 'offTada';
      price_rule.value_type = discount_type;
      price_rule.value = '-' + discount_value + '.00';
    } else if (discount_type == 'fixed_amount') {
      price_rule.title = discount_value + 'CashTada';
      price_rule.value_type = discount_type;
      price_rule.value = '-' +  discount_value + '.00';
    } else if (discount_type == 'Free Shipping') {
      price_rule.target_type = 'shipping_line';
      price_rule.allocation_method = 'each';
      price_rule.value_type = 'percentage';
      price_rule.value = '-100.00';
      price_rule.title = 'FreeShippingTada';
    }
    var accessToken = '';
    accessToken = shopSetting.accessToken;
    const options = {
      credentials: 'include',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    }

    const optionsWithPost = { ...options, method: 'POST' };
    var optionsWithJSON = { ...optionsWithPost, body: JSON.stringify({ price_rule: price_rule }) };

    fetch(`https://${shopSetting.name}/${priceRuleUrl}`, optionsWithJSON)
      .then(response => response.json())
      .then(json => {
        if (json.errors) {
          return;
        }

        const discountUrl = `admin/api/${API_VERSION}/price_rules/${json.price_rule.id}/discount_codes.json`;
        const optionsDiscount = {
          ...optionsWithPost, body: JSON.stringify({
            'discount_code': {
              'code': discount_code
            }
          })
        };

        fetch(`https://${shopSetting.name}/${discountUrl}`, optionsDiscount);
        var discount = new Discount();
        discount.code = discount_code;
        discount.type = discount_type;
        discount.value = discount_value;
        discount.expired_at = expired_at.toString();
        discount.shopId = shopSetting.id;
        discount.save();
      });

    ctx.body = 'success';
  } else {
    ctx.body = 'error';
    ctx.status = 400;
  }
}

async function sendWidget(ctx, next) {
  const shop = ctx.request.body.shop;
  const path = ctx.request.body.path;
  var pathObject = getPathAndPageName(path);
  ctx.cookies.set("shopOrigin", shop, { httpOnly: false });
  const appSetting = await Shop.findOne({ name: shop });

  if (appSetting.install == 1) {
    var shop_id = appSetting.id;
    var widgetArray = [];
    var results = await Widget.find({ shop_id: shop_id, pause: false });
    if (results.length > 0) {
      for (var i = 0; i < results.length; i++) {
        const displaySetting = results[i].displaySetting;
        const pageSetting = JSON.parse(results[i].pageSetting);
        if(displaySetting == 'all') {
          widgetArray.push(results[i]);
        } else if(displaySetting == 'products') {
          if(pathObject.path == 'products') {
            widgetArray.push(results[i]);
          }
        } else if(displaySetting == 'blogs') {
          if(pathObject.path == 'blogs') {
            widgetArray.push(results[i]);
          }
        } else if(displaySetting == 'pages') {
          if(pathObject.path == 'pages') {
            widgetArray.push(results[i]);
          }
        } else {
          if (pathObject.path == 'homepage' || pathObject.path == 'cart' || pathObject.path == 'search') {
            if (pageSetting[pathObject.path]) {
              widgetArray.push(results[i]);
            }
          } else {
            if (pageSetting[pathObject.path]['all' + jsUcfirst(pathObject.path)]) {
              widgetArray.push(results[i]);
            } else if (pageSetting[pathObject.path][pathObject.pageName]) {
              widgetArray.push(results[i]);
            }
          }
        }
      }
    }

    console.log(widgetArray);
    if(widgetArray.length > 0) {
      var finalWidget = await checkPriority(widgetArray, pathObject.path, pathObject.pageName);
      console.log(finalWidget);
      ctx.body = await selectWidgetBySetting(finalWidget);
    } else {
      ctx.body = 'no widget';
    }
  } else {
    ctx.body = '';
  }
}

function getLength(discounts){
  var result = 0;
  Object.keys(discounts).map(key => {
    if (discounts[key].enable) {
      result++;
    }
  })
  return result;
}

function generateDiscountItems(widget) {
  var discountTypes = JSON.parse(widget.discountType);
  const colors = ['#eae56f', '#89f26e', '#e7706f','#89f26e', '#eae56f', '#89f26e', '#e7706f','#89f26e', '#eae56f', '#89f26e', '#e7706f','#89f26e'];
  var result = `theWheel = new Winwheel({
    'numSegments': ${getLength(discountTypes)},         // Number of segments
    'outerRadius': 180,       // The size of the wheel.
    'innerRadius': 70,
    'centerX': 180,       // Used to position on the background correctly.
    'centerY': 180,
    'pointerAngle': 90,
    'textFontSize': 13,        // Font size.
    'textOrientation': 'curved',
    'responsive': true,
    'textAligment': 'outer',
    'segments':            // Definition of all the segments.
        [`;

  var i = 0;
  Object.keys(discountTypes).map(key => {
    if(discountTypes[key].enable) {
      result += ` { 'fillStyle': '${colors[i]}', 'text': '${discountTypes[key].title}'},
                `;
      i++;
    }
  });

  result += `],
    'animation':               // Definition of the animation
    {
        'type': 'spinToStop',
        'duration': 3,
        'spins': 5,
        'callbackFinished': alertPrize
    }
    });`;

  return result;
}

function selectWidgetBySetting(widget) {
  var html = '';
  var theme_colors = [
    {
      'first': '#5d080d',
      'second': '#922c2c'
    },
    {
      'first': '#eea7ba',
      'second': '#ff65a1'
    },
    {
      'first': '#a98373',
      'second': '#f2bb8c'
    },
    {
      'first': '#066e42',
      'second': '#14c164'
    }
  ];
  var widget_url = `${TUNNEL_URL}/game`;
  var game_start_icon_position = 3;
  var game_theme_style = 1;
  var wheel_run_time = 5;
  var wheel_item = ["3% Discount", "40% Discount", "Not Luck Today", "10% Discount", "30% Discount", "FREE SHIPPING", "50% Discount", "3% Discount", "10% Discount", "20% Discount", "30% Discount"];
  var progress_bar = true;
  var popup_back_img_type = 1;
  var theme_first_color = game_theme_style === 3 ? theme_colors[1].first : theme_colors[game_theme_style].first;
  var theme_second_color = game_theme_style === 3 ? theme_colors[1].second : theme_colors[game_theme_style].second;

  if(widget.type === 0) {
    var id = widget.id;
    html = `
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <script>
      window.global_widget_url = "${widget_url}";
      window.game_start_icon_position = "${game_start_icon_position}";
      window.game_theme_style = "${game_theme_style}";
      window.wheel_run_time = "${wheel_run_time}";
      window.wheel_item = "${wheel_item}";
      window.theme_first_color = "${theme_first_color}";
      window.theme_second_color = "${theme_second_color}";
    </script>
    <link rel="stylesheet" href="${widget_url}/tadaMain.css"/>
    <script src="${widget_url}/tadaMain.js"></script>
    <div id="tada_app_widget">
    <div class="tada-wheel-wrapper">
      <div id="spinny_box" class="tada_start_icon_div" data-toggle="modal" data-target="#tada_full_modal">
        <div role='button' class='retro-btn'>
          <a class='btn tada-btn'>
            <span class='btn-inner'>
              <span class='content-wrapper'>
                <svg class='btn-content' id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 31 30"><defs><style>.cls-1{fill:#ff5c6c;}.cls-2{fill:${game_theme_style===1 ? '#ff5c6c' : '#8e52ce'};}.cls-3{fill:${game_theme_style===1 ? '#ff5c6c' : '#8e52ce'};}.cls-4{fill:#fbb03b;}.cls-5{fill:${game_theme_style===1 ? '#e82d1a' : '#8e52ce'};}.cls-6{fill:#f4a63d;}.cls-7{fill:#e59739;}</style></defs><title>Game1 - spin</title>
                  <path class="cls-1" d="M23.27,3.84c-0.86-1.62-1.9-2.43-3.08-2.43-1.35,0-2.76,1.11-4.18,3.29-0.18.28-.35,0.56-0.51,0.83C15.34,5.26,15.17,5,15,4.7c-1.42-2.19-2.83-3.29-4.18-3.29-1.18,0-2.21.82-3.08,2.43a2.5,2.5,0,0,0-.1,2.59C8.18,7.36,9.43,8,11.43,8.34a24.1,24.1,0,0,0,4,.32h0.14a24.1,24.1,0,0,0,4-.32c2-.36,3.25-1,3.8-1.91a2.51,2.51,0,0,0-.1-2.59h0Z"/>
                  <path class="cls-2" fill=${game_theme_style===3 ? theme_colors[0].second : theme_colors[game_theme_style].second} d="M28.19,13.08A1.21,1.21,0,0,0,27,11.87H4a1.21,1.21,0,0,0-1.21,1.21V27.39A1.21,1.21,0,0,0,4,28.59H27a1.21,1.21,0,0,0,1.21-1.21V13.08h0Z"/>
                  <path class="cls-3" fill=${game_theme_style===3 ? theme_colors[0].second : theme_colors[game_theme_style].second} d="M30,14.09a1.21,1.21,0,0,1-1.21,1.21H2.21A1.21,1.21,0,0,1,1,14.09v-6A1.21,1.21,0,0,1,2.21,6.84H28.79A1.21,1.21,0,0,1,30,8.05v6h0Z"/><polygon class="cls-4" points="12.48 6.84 18.52 6.84 18.52 15.3 12.48 15.3 12.48 6.84 12.48 6.84"/><polygon class="cls-5" points="2.81 16.5 28.19 18.8 28.19 15.34 2.81 15.34 2.81 16.5 2.81 16.5"/><polygon class="cls-6" points="12.48 15.3 18.52 15.3 18.52 28.59 12.48 28.59 12.48 15.3 12.48 15.3"/><polygon class="cls-7" points="12.48 17.38 18.52 17.93 18.52 15.34 12.48 15.34 12.48 17.38 12.48 17.38"/></svg>
              </span>
            </span>
          </a>
        </div>
      </div>
      <div class="tada-open-game-modal" data-toggle="modal" data-target="#tada_game_modal_2"></div>
      
      <div class="tada-floating-dialog scale-in-center" style="background-color: ${game_theme_style==3 ? theme_colors[game_theme_style].first:'white'}">
        <div class="d-flex">
          <p style="color: ${game_theme_style==3 ? 'white' : 'black'}">You've won</p> &nbsp;
          <p id="tada_floating-dialog_cashview" style="color: ${theme_colors[game_theme_style].first}"></p>
        </div>
        <div class="d-flex">
          <p style="color: ${game_theme_style==3 ? 'white' : 'black'}">and is reserved for</p>&nbsp;
          <p id='tada-floating-dialog-countdownTime' class="tada-expire-time">15m : 20s</p>
        </div>
        <div class="tada-floating-dialog-button-div">
          <button id="tada-floating-couponview-button" style="background-color: ${theme_colors[game_theme_style].second};
          color : ${game_theme_style ==3 ? 'black' : 'white'}; " data-toggle="modal" data-target="#gamestartmodal">SEE MY COUPON</button>
        </div>
      </div>
      
      <div class="tada_image_temp" style="background-image: ${game_theme_style == 2 ? 'url('+widget_url+'/success_mark_board.svg)' : 'url('+widget_url+'/success_mark_board2.svg)' }">
        <img src="${widget_url}/floating-bar-icon.svg"/>
      </div>
      
      <!--Flowers falling -->
      <div id="tada-flower-falling"></div>
      <!--RemainerBar -->
      <div class="tada_remaind_bar" style="background-color: ${theme_colors[game_theme_style].first}">
        <div class="d-flex tada_remaind_bar_children">
          <span>You've won</span>&nbsp;
          <span id="tada_notifi_cash_view"></span>&nbsp;
          <span>and is reserved for</span>&nbsp;
          <span id="tada_notifi_cash_remaind_time" class="tada-expire-time">15m : 20s</span>&nbsp;
        </div>
        <div class="tada-remained_notify_button_container">
          <button id="tada_ramaind_view_coupon_button" style="background-color: ${game_theme_style==3 ? theme_colors[0].second: theme_colors[game_theme_style].second}"
            data-toggle="modal" data-target="#gamestartmodal">SEE MY COUPON</button>
        </div>
        <button id="tada_remained_notify_close" class="close">
          <div class="tada-close-button-div">
              <span aria-hidden="true">&times;</span>
          </div>
        </button>
      </div>
      
      <!--Full screen popup modal-->
      <div class="modal fade tada-full-modal ${game_theme_style === 1 ? "tada-full-modal-theme-1" : "tada-full-modal-theme-2"}" id="tada_full_modal" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered tada-full-modal-content" role="document" style="display: ${game_theme_style === 1 ? "flex" : "block"}; background-image: url(${widget_url}/full-modal/popup-back-${popup_back_img_type}.png)">
          <div class="tada-full-modal-left">
            <div class="inner-wrapper">
              <div class="tada-full-modal-logo">
                <img id="tada-game-logo" src="${widget_url}/full-modal/popup-mark.png">
              </div>
              <div class="tada-full-modal-title">
                <h3>Want the internet's favorite items at 25% off?</h3>
                <p>You have a chance to win a nice big fat discount. Are you feeling lucky?</p>
              </div>
              <div class="tada-full-modal-form">
                <div id="snackbar">You have entered an invalid e-mail address. Please try again.</div>
                <input type="email" class="form-control" id="tada_full_modal_email" placeholder="Enter your email address" required>
                <div class="tada-custom-checkbox tada-game-modal-form-policy">
                  <div class="tada-custom-checkbox-overlay" style="border-color: ${theme_second_color}">
                    <svg fill="${theme_second_color}" version="1.1" class="tada-custom-checkbox-overlay-svg" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
                       viewBox="0 0 512 512" style="enable-background:new 0 0 512 512; display: none;" xml:space="preserve">
                      <g>
                        <g>
                          <path d="M504.502,75.496c-9.997-9.998-26.205-9.998-36.204,0L161.594,382.203L43.702,264.311c-9.997-9.998-26.205-9.997-36.204,0
                            c-9.998,9.997-9.998,26.205,0,36.203l135.994,135.992c9.994,9.997,26.214,9.99,36.204,0L504.502,111.7
                            C514.5,101.703,514.499,85.494,504.502,75.496z"/>
                        </g>
                      </g>
                    </svg>
                  </div>
                  <input type="checkbox" class="custom-control-input" id="tada_full_modal_agree_policy" style="display: none">
                  <label class="tada-custom-checkbox-label" for="tada_full_modal_agree_policy">
                    I agree to <a style="color: ${theme_second_color}">Terms</a> and I have read our <a style="color: ${theme_second_color}">Privacy policy</a>.
                  </label>
                </div>
                <div class="tada-full-modal-form-submit">
                  <button class="form-control tada_full_modal_btn_access" style="background-color: ${theme_first_color}">Access now</button>
                  <p style="text-decoration: underline; color: ${theme_second_color}" class="tada-full-modal-btn-no-thank-you">No, thank you</p>
                  <button class="tada-full-modal-btn-close" data-dismiss="modal" style="display: none;"></button>
                </div>
              </div>
            </div>
          </div>
          <div class="tada-full-modal-right" style="width: 67%"></div>
        </div>
      </div>
      
      <!--Game Modal-->
      <div class="modal fade tada-game-modal ${game_theme_style === 1 ? "tada-game-modal-theme-1" : "tada-game-modal-theme-2"}" id="tada_game_modal_2" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered tada-game-modal-container" role="document">
          <div class="tada-game-modal-content">
            <div class="tada-game-modal-top" style="background-color: ${theme_first_color}">
              <div class="tada-game-modal-left-blank"></div>
              <div class="tada-game-modal-right">
                <h3 class="tada-game-modal-heading-1">Spin to win a BIG prize right now!  🎁</h3>
                <p class="tada-game-modal-heading-2">You have a chance to win a nice big fat discount.<br/>Are you feeling lucky? Give it a spin. If you win, you can claim your coupon for 15 mins only!</p>
                <div class="tada-game-expire-in-wrapper" style="display: none">
                  <span>Expires in: </span>
                  <span style="font-weight: 600; color: ${theme_second_color}">01:56:34</span>
                </div>
              </div>
            </div>
            <div class="tada-game-modal-bottom">
              <div class="tada-game-modal-left-blank"></div>
              <div class="tada-game-modal-form tada-game-modal-right">
                <div class='counter-wrapper'></div>
                <div id="snackbar">You have entered an invalid e-mail address. Please try again.</div>
                <input type="email" class="form-control" id="tada_game_modal_email" placeholder="Enter your email address" required>
                <div class="tada-custom-checkbox tada-game-modal-form-policy">
                  <div class="tada-custom-checkbox-overlay" style="border-color: ${theme_second_color}">
                    <svg fill="${theme_second_color}" version="1.1" class="tada-custom-checkbox-overlay-svg" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
                       viewBox="0 0 512 512" style="enable-background:new 0 0 512 512; display: none;" xml:space="preserve">
                      <g>
                        <g>
                          <path d="M504.502,75.496c-9.997-9.998-26.205-9.998-36.204,0L161.594,382.203L43.702,264.311c-9.997-9.998-26.205-9.997-36.204,0
                            c-9.998,9.997-9.998,26.205,0,36.203l135.994,135.992c9.994,9.997,26.214,9.99,36.204,0L504.502,111.7
                            C514.5,101.703,514.499,85.494,504.502,75.496z"/>
                        </g>
                      </g>
                    </svg>
                  </div>
                  <input type="checkbox" class="custom-control-input" id="tada_game_modal_agree_policy" style="display: none">
                  <label class="tada-custom-checkbox-label" for="tada_game_modal_agree_policy">
                    I agree to <a style="color: ${theme_second_color}">Terms</a> and I have read our <a style="color: ${theme_second_color}">Privacy policy</a>.
                  </label>
                </div>
                <div class="tada-game-modal-form-submit">
                  <button class="form-control tada-game-modal-btn" id="tada_game_modal_btn_try" style="background-color: ${theme_second_color}">try your luck</button>
                  <div class="tada-progress-bar" style="display: ${progress_bar ? 'block' : 'none'}">
                    <div class="tada-progress-value" style="width:40%; background-color: ${game_theme_style==3 ? 'white' : theme_colors[game_theme_style].second};">
                    </div>
                  </div>
                  <p class="tada-progress-bar-text" style="display: ${progress_bar ? 'block' : 'none'}"><span id="tada-progressbar-percent-number">70</span>% offers claimed. Hurry up!</p>
                </div>

                <div class="tada-game-result-panel" style="display: none; background-image: url(${widget_url}/game-modal/result-back.svg)">
                  <p class="tada-game-result-text" style="color: ${theme_second_color};">$10 Cash</p>
                  <p class="tada-game-result-code-label">Code:</p>
                  <p class="tada-game-result-code">EZG37YVZ5Q2P</p>
                </div>
                <button class="form-control tada-game-modal-btn" id="tada_game_btn_apply_discount" style="background-color: ${theme_second_color}; display: none;">apply my discount</button>
              </div>
            </div>
            <div class="tada-game-modal-footer" style="background-color: ${theme_first_color}">
              <div class="tada-game-modal-left-blank"></div>
              <div class="tada-game-modal-right tada-game-modal-footer-right">
                No, I don't feel lucky 
                <button type="button" class="close tada-game-modal-btn-close-fake" aria-label="Close">
                  <div class="tada-dialog-btn-close-inner">
                    <span aria-hidden="true" style="color: ${theme_first_color}"> &times;</span>
                  </div>
                </button>
                <button class="tada-game-modal-btn-close" data-dismiss="modal" style="display: none;"></button>
              </div>
            </div>
          </div>
          <div class="tada-wheel-container">
            <canvas id="canvas1" width="500" height="500"></canvas>
            <canvas id="canvas" width="500" height="500"></canvas>
          </div>
        </div>
      </div>
    </div>
    `;
  }
  return html;
}

function getPathAndPageName(pathname) {
  var result = {
    path: '',
    pageName: ''
  };
  if (pathname == '/') {
    result.path = 'homepage';
  } else if (pathname == '/cart') {
    result.path = 'cart';
  } else if (pathname == '/search') {
    result.path = 'search';
  } else if (pathname.indexOf('/products/') > -1) {
    result.path = 'products';
  } else if (pathname.indexOf('/pages') > -1) {
    result.path = 'pages';
  } else if (pathname.indexOf('/blogs') > -1) {
    result.path = 'blogs';
  }

  var pathArray = pathname.split('/');
  result.pageName = pathArray[pathArray.length - 1];

  return result;
}

function checkPriority(widgetArray, path, pageName) {
  var result = widgetArray[0];
  if (widgetArray.length > 1) {
    for (var i = 1; i < widgetArray.length; i++) {
      var temp = widgetArray[i];
      if(result.displaySetting == 'all') {
        if(temp.displaySetting != 'all') {
          result = temp;
        } else {
          if (compareDate(result, widgetArray[i])) {
            result = temp;
          }
        }
      } else if(result.displaySetting != 'specific') {
        if(temp.displaySetting == result.displaySetting) {
          if (compareDate(result, widgetArray[i])) {
            result = temp;
          }
        } else if(temp.displaySetting == 'specific') {
          result = temp;
        }
      } else {
        if(temp.displaySetting == 'specific') {
          if (compareDate(result, widgetArray[i])) {
            result = temp;
          }
        }
      }
    }
  }

  return result;
}

function compareDate(result, buf) {
  var result_date = new Date(result.created_at);
  var buf_date = new Date(buf.created_at);

  return (buf_date > result_date);
}

module.exports.addDiscount = addDiscount;
module.exports.sendWidget = sendWidget;
