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
  //window.global_widget_url = `${TUNNEL_URL}/game`;
  var widget_url = `${TUNNEL_URL}/game`;//`${TUNNEL_URL}/game`;//global_widget_url;
  var game_start_icon_position = 3;
  var game_theme_style = 2;
  var game_start_time = 6;
  if(widget.type == 0) {
    var id = widget.id;
    html = `
    <script>
      window.global_widget_url = "${widget_url}";
      window.game_start_icon_position = "${game_start_icon_position}";
      window.game_theme_style = "${game_theme_style}";
      window.game_start_time = "${game_start_time}"
    </script>
    <script src="${widget_url}/jquery.js"></script>
    <script src="https://code.jquery.com/jquery-1.12.4.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/2.1.3/TweenLite.min.js"></script>
    <script src="${widget_url}/TweenMax.min.js"></script>
    <script src="https://code.jquery.com/ui/1.12.1/jquery-ui.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/easytimer@1.1.1/dist/easytimer.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.7/umd/popper.min.js" integrity="sha384-UO2eT0CpHqdSJQ6hJty5KVphtPhzWj9WO1clHTMGa3JDZwrnQq4sF86dIHNDz0W1" crossorigin="anonymous"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/js/bootstrap.min.js" integrity="sha384-JjSmVgyd0p3pXB1rRibZUAYoIIy6OrQ6VrjIEaFf/nJGzIxFDsf4x0xIM+B07jRM" crossorigin="anonymous"></script>
    <script src="${widget_url}/custom.js"></script>

    <div id="tada_app_widget">
      <div id="spinny_box">
          <div class="tada_start_icon_div" data-toggle="modal" data-target="#gamestartmodal" >
            <img id="tada_start_icon" src="${game_theme_style===1 ? widget_url+'/default_start_icon.svg' : widget_url+'/attention_start_icon.svg'}"/>
          </div>
      </div>
      <div class="tada-floating-dialog scale-in-center">
        <div class="d-flex">
          <p>You've won</p> &nbsp;
          <p id="tada_floating-dialog_cashview"></p>
        </div>
        <div class="d-flex">
          <p>and is reserved for</p>&nbsp;
          <p id='tada-floating-dialog-countdownTime'>15m : 20s</p>
        </div>
        <button id="tada-floating-couponview-button">SEE MY COUPON</button>
    </div>
    <!--Flowers falling -->
    <div id="tada-flower-falling"></div>
    <!--RemainerBar -->
    <div class="tada_remaind_bar" style="background-color: ${game_theme_style==1 ? '#29abe2': game_theme_style==2 ? '#9a54d6' : 'black'}">
      <div class="d-flex">
        <span>You've won</span>&nbsp;
        <span id="tada_notifi_cash_view"></span>&nbsp;
        <span>and is reserved for</span>&nbsp;
        <span id="tada_notifi_cash_remaind_time">15m : 20s</span>&nbsp;
      </div>
      <button id="tada_ramaind_view_coupon_button" style="background-color: ${game_theme_style==1 ? '#f7931e': game_theme_style==2 ? '#ff5c6c' : 'white'};
        color: ${game_theme_style==3 ? 'black' : 'white'};">SEE MY COUPON</button>
      <button id="tada_remained_notify_close" class="close">
        <span aria-hidden="true" style="color: ${game_theme_style==3 ? 'black' : 'white'}">&times;</span>
      </button>
    </div>
    <!--Game Modal -->
    <div class="modal fade" id="gamestartmodal" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered tada-modal-custom" role="document">
    <div class="modal-content tada_game_modal" style="background-color: ${game_theme_style==3 ? 'black':'white'}">
      <div class="modal-header">
        <img class="modal-title tada_game_start_title" id="exampleModalCenterTitle" src="${widget_url}/logo.svg"/>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true" style="color: ${game_theme_style==3 ? 'white':'black'}">&times;</span>
        </button>
      </div>
      <div class="modal-body tada-dialog-body">
        <p class="tada-game-spin-title" style="color: ${game_theme_style==3 ? 'white':'black'}">Spin and Win</p>
        <p class="tada-game-spin-text" style="color: ${game_theme_style==3 ? 'white':'black'}">Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text</p>
        <div class="tada-dialog-mail-container">
	        <input type="email" class="form-control" id="tada_game_email_input" aria-describedby="emailHelp" placeholder="Enter your email address" required
            style="background-color : ${game_theme_style == 3 ? 'black' : 'white'}; color: ${game_theme_style == 3 ? 'white' : 'black'};">
	        <button id="tada_spin_start_button" class="bubbly-button" value="spin"
            style="background-color: ${game_theme_style==2 ? '#ff5c6c' : game_theme_style==3 ? 'white' : '#29abe2'};
            color : ${game_theme_style ==3 ? 'black' : 'white'}; ">SPIN</button>
        </div>
        <p class="tada-game-state-text" style="color: ${game_theme_style===2 ? '#ff5c6c' : '#ffa022'}">Excited to see your discount?</p>
        <p id="tada-game-count-number" style="color: ${game_theme_style===2 ? '#ff5c6c' : '#29abe2'}" >${game_start_time}</p>
        <div class="d-flex tada-wheel-container">
        	<canvas id="canvas1" width="500" height="400"></canvas>
			    <canvas id="canvas" width="500" height="400"></canvas>
        </div>
      </div>
      <div class="modal-body tada-dialog-body-success">
      	<p class="tada-game-spin-title1" style="color: ${game_theme_style==3 ? 'white':'black'}">Congratulations</p>
        <div class="tada-success-maker-board" style="background-image: ${game_theme_style == 2 ? 'url('+widget_url+'/success_mark_board2.png)' : 'url('+widget_url+'/success_mark_board.png)' }">
      		<p class="tada-success-maker-left-text col-4">Your've </br>Win</p>
      		<div class="col-8 tada-success-maker-text-div col-8">
      			<p id="tada-success-maker-text" style="color: ${game_theme_style===2 ? '#ff5c6c' : '#29abe2'}">$10 Cash</p>
      		</div>
      	</div>
      	<p class="tada-game-spin-text" style="color: ${game_theme_style==3 ? 'white':'black'}">Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text</p>
        <div class="tada-game-expiry d-flex">
        	<p class="tada-game-expiry-title" style="color: ${game_theme_style==3 ? 'white':'black'}">How long until expiry:</p>
        	<p class="tada-game-expiry-time" style="color: ${game_theme_style==1 ? '#f7931e': game_theme_style==2 ? '#9a54d6' : '#29abe2'}">22:59:43</p>
        </div>
        <div class="tada-game-body-divide"></div>
        <div class="tada-game-discount-code">
        	<p class="tada-game-discount-code-title" style="color: ${game_theme_style==3 ? 'white':'black'}">Your Discount Code is:</p>
        	<p class="tada-game-discount-code-text" style="color: ${game_theme_style==1 ? '#f7931e': game_theme_style==2 ? '#9a54d6' : '#29abe2'}">SASDERWERT3H3G24</p>
        </div>
        <div class="tada_apply_my_account_parent">
          <button id="tada_apply_my_discount" data-dismiss="modal" aria-label="Close" class="close bubbly-button" value="spin"
          style="background-color: ${game_theme_style==2 ? '#ff5c6c' : game_theme_style==3 ? 'white' : '#29abe2'};
          color : ${game_theme_style ==3 ? 'black' : 'white'}; ">APPLY MY DISCOUNT</button>
        </div>
      </div>
      <div class="modal-footer tada-modal-footer">
        <img src="${widget_url}/game_dialog_button_icon.png" />
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
