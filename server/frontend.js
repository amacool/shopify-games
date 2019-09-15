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
      'first': '#ffd500',
      'second': '#29abe2'
    },
    {
      'first': '#ffd500',
      'second': '#29abe2'
    },
    {
      'first': '#9a54d6',
      'second': '#ff5c6c'
    },
    {
      'first': '#000000',
      'second': '#ffffff'
    }
  ];
  var widget_url = `${TUNNEL_URL}/game`;
  var game_start_icon_position = 3;
  var game_theme_style = 2;
  var wheel_run_time = 5;
  var wheel_item = ["$10 Cash", "40% OFF", "Not Luck Today", "ALmost", "30% OFF", "$30 Cach"];
  var progress_bar = true;

  var theme_first_color = game_theme_style==3 ? theme_colors[1].first:theme_colors[game_theme_style].first;
  var theme_second_color = game_theme_style==3 ? theme_colors[1].second:theme_colors[game_theme_style].second;
  if(widget.type == 0) {
    var id = widget.id;
    html = `
    <script>
      window.global_widget_url = "${widget_url}";
      window.game_start_icon_position = "${game_start_icon_position}";
      window.game_theme_style = "${game_theme_style}";
      window.wheel_run_time = "${wheel_run_time}";
      window.wheel_item = "${wheel_item}";
      window.theme_first_color = "${theme_first_color}";
      window.theme_second_color = "${theme_second_color}";
    </script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/2.1.3/TweenLite.min.js"></script>
    <script src="${widget_url}/TweenMax.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/easytimer@1.1.1/dist/easytimer.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/js/bootstrap.min.js" integrity="sha384-JjSmVgyd0p3pXB1rRibZUAYoIIy6OrQ6VrjIEaFf/nJGzIxFDsf4x0xIM+B07jRM" crossorigin="anonymous"></script>
    <script src="${widget_url}/custom.js"></script>
    <script src="${widget_url}/animation.js"></script>
    <link rel="stylesheet" type="text/css" href="//fonts.googleapis.com/css?family=Open+Sans" />

    <div id="tada_app_widget">
      <div id="spinny_box" class="tada_start_icon_div" data-toggle="modal" data-target="#gamestartmodal">
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
        <div id="tada_remained_notify_close" class="close circCont">
          <button class="circle boxShadow" data-animation="fadeOut" data-remove="3000"/>
        </div>
      <button id="tada_remained_notify_close" class="close">
        <div class="tada-close-button-div">
            <span aria-hidden="true">&times;</span>
        </div>
      </button>
    </div>
    <!--Game Modal -->
    <div class="modal fade" id="gamestartmodal" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered tada-modal-custom" role="document">
    <div class="modal-content tada_game_modal" style="background-color: ${game_theme_style==3 ? 'black':'white'}">
      <div class="modal-header">
        <img class="modal-title tada_game_start_title" id="exampleModalCenterTitle" src="${widget_url}/logo.svg"/>
        <button type="button" class="close tada-dialog-close-button" data-dismiss="modal" aria-label="Close">
          <div class="tada-close-button-div">
            <span aria-hidden="true">&times;</span>
          </div">
        </button>
      </div>
      <div class="modal-body tada-dialog-body">
        <p class="tada-game-spin-title" style="color: ${game_theme_style==3 ? 'white':'black'}">Here's a discount</p>
        <p class="tada-game-spin-text" style="color: ${game_theme_style==3 ? 'white':'black'}">Spin the wheel below and win a discount to use on any item on this store! What will you get?</p>
        <div class="tada-dialog-mail-container">
          <!--Email validation notification -->
          <div id="snackbar">You have entered an invalid e-mail address. Please try again.</div>
	        <input type="email" class="form-control" id="tada_game_email_input" aria-describedby="emailHelp" placeholder="Enter your email address" required
            style="background-color : ${game_theme_style == 3 ? 'black' : 'white'}; color: ${game_theme_style == 3 ? 'white' : 'black'};">
	        <button id="tada_spin_start_button" value="spin"
            style="background-color: ${game_theme_style==3 ? 'white' : theme_colors[game_theme_style].second};
            color : ${game_theme_style ==3 ? 'black' : 'white'}; box-shadow: 0 2px 13px ${theme_colors[game_theme_style].second};">SPIN</button>
          <p class="tada-progress-bar-top-text" style="display: ${progress_bar ? 'block' : 'none'}"><span id="tada-progressbar-percent-number">70</span>% of discounts have been given, hurry up!</p>
          <div class="tada-progress-bar" style="display: ${progress_bar ? 'block' : 'none'}">
            <div class="tada-progress-value" style="width:40%; background-color: ${game_theme_style==3 ? 'white' : theme_colors[game_theme_style].second};">
            </div>
          </div>
        </div>
        <div class="tada-game-state-text-div">
          <p class="tada-game-state-text" style="color: ${game_theme_style===3 ? theme_colors[1].second : theme_colors[game_theme_style].second}" id="tada-game-state-first-text">Excited to see your discount?</p>
          <p class="tada-game-state-text" style="color: ${game_theme_style===3 ? theme_colors[1].second : theme_colors[game_theme_style].second}" id="tada-game-state-second-text">Let’s see what you got!</p>
        </div>
        <p id="tada-game-count-number" style="color: ${game_theme_style==3 ? theme_colors[1].second : theme_colors[1].second}" >${wheel_run_time}</p>
        <div class="d-flex tada-wheel-container">
        	<canvas id="canvas1" width="500" height="400"></canvas>
			    <canvas id="canvas" width="500" height="400"></canvas>
        </div>
      </div>
      <div class="modal-body tada-dialog-body-success">
      	<p class="tada-game-spin-title1" style="color: ${game_theme_style==3 ? 'white':'black'}">Congratulations</p>
        <div class="tada-success-maker-board" style="background-image: ${game_theme_style == 2 ? 'url('+widget_url+'/success_mark_board.svg)' : 'url('+widget_url+'/success_mark_board2.svg)' }">
      		<p class="tada-success-maker-left-text col-4">You've </br>Won</p>
      		<div class="col-8 tada-success-maker-text-div col-8">
      			<p id="tada-success-maker-text" style="color: ${game_theme_style==3 ? theme_colors[1].second : theme_colors[game_theme_style].second}">$10 Cash</p>
      		</div>
      	</div>
      	<p class="tada-game-spin-text" style="color: ${game_theme_style==3 ? 'white':'black'}">Here’s your unique coupon! You can use it on any purchase in this store 🎉! Don’t wait too long, it expires soon.</p>
        <div class="tada-game-expiry d-flex">
        	<p class="tada-game-expiry-title" style="color: ${game_theme_style==3 ? 'white':'black'}">How long until expiry:</p>
        	<p class="tada-game-expiry-time tada-expire-time" style="color: ${game_theme_style==3 ? theme_colors[1].first : theme_colors[game_theme_style].first}">22:59:43</p>
        </div>
        <div class="tada-game-body-divide"></div>
        <div class="tada-game-discount-code">
        	<p class="tada-game-discount-code-title" style="color: ${game_theme_style==3 ? 'white':'black'}">Your Discount Code is:</p>
        	<p class="tada-game-discount-code-text" style="color: ${game_theme_style==3 ? theme_colors[1].first : theme_colors[game_theme_style].first}">SASDERWERT3H3G24</p>
        </div>
        <div class="tada_apply_my_account_parent">
          <button id="tada_apply_my_discount" data-dismiss="modal" aria-label="Close" class="close" value="spin"
          style="background-color: ${game_theme_style==3 ? 'white' : theme_colors[game_theme_style].second};
          color : ${game_theme_style ==3 ? 'black' : 'white'};  box-shadow: 0 2px 13px ${theme_colors[game_theme_style].second}; ">APPLY MY DISCOUNT</button>
        </div>
      </div>
      <div class="modal-footer tada-modal-footer">
        <a href="https://trytada.com" target="_blank"><img src="${widget_url}/game_dialog_button_icon.svg" /></a>
      </div>
    </div>
  </div>
</div>
<link rel="stylesheet" href="${widget_url}/custom.css"/>
<link rel="stylesheet" href="${widget_url}/bubbly-button.css"/>
<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous">
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
