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

    if(widgetArray.length > 0) {
      var finalWidget = await checkPriority(widgetArray, pathObject.path, pathObject.pageName);
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
  var game_theme_color = 2;
  var wheel_run_time = 5;
  var wheel_items = [
    { label: "Free Shipping", chance: 0.1},
    { label: "40% Discount", chance: 0.05},
    { label: "10% Discount", chance: 0.2},
    { label: "3% Discount", chance: 0.2},
    { label: "50% Discount", chance: 0.1},
    { label: "35% Discount", chance: 0.1},
    { label: "20% Discount", chance: 0.15},
    { label: "30% Discount", chance: 0.1}
  ];
  var wheel_item = wheel_items.map(item => item.label);
  var wheel_item_cap = wheel_item.map(item => item.toUpperCase());
  var progress_bar = true;
  var theme_first_color = theme_colors[game_theme_color].first;
  var theme_second_color = theme_colors[game_theme_color].second;

  if(widget.type === 0) {
    var id = widget.id;
    html = `
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="apple-touch-fullscreen" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black" />
    <script>
      window.global_widget_url = "${widget_url}";
      window.game_start_icon_position = "${game_start_icon_position}";
      window.game_theme_style = "${game_theme_style}";
      window.wheel_run_time = "${wheel_run_time}";
      window.wheel_item = "${wheel_item}";
      window.theme_first_color = "${theme_first_color}";
      window.theme_second_color = "${theme_second_color}";
    </script>
    <script src="${widget_url}/tadaMain.js"></script>
    <link href='https://fonts.googleapis.com/css?family=Montserrat' rel='stylesheet'>
    <link href="https://fonts.googleapis.com/css?family=Open+Sans:300,400,600,700,800" rel="stylesheet">
    <link rel="stylesheet" href="${widget_url}/tadaMain.css"/>
    <div id="tada_app_widget">
    <div class="tada-wheel-wrapper">
      <div id="spinny_box" class="tada_start_icon_div" data-toggle="modal" data-target="#tada_game_modal_2">
        <div role='button' class='retro-btn'>
          <a class='btn tada-btn'>
            <span class='btn-inner'>
              <span class='content-wrapper'>
                <svg class='btn-content' id="Layer_1" data-name="Layer 1" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g>
                    <path fill="${theme_second_color}" d="M33.6521 6.99273H31.0317C31.3773 6.44474 31.6054 5.82963 31.6704 5.17908C31.8782 3.10003 30.7852 1.23629 28.9244 0.410011C27.214 -0.349499 25.2919 -0.0390174 23.9078 1.21854L20.5989 4.22263C19.9544 3.51658 19.0281 3.07284 18 3.07284C16.97 3.07284 16.0422 3.51799 15.3976 4.22623L12.0845 1.21819C10.6982 -0.0393695 8.77681 -0.348653 7.06717 0.410434C5.20684 1.23679 4.11363 3.10115 4.32203 5.18014C4.38721 5.83019 4.61516 6.44503 4.96075 6.99273H2.3478C1.0511 6.99273 0 8.04575 0 9.34466V12.8726C0 13.522 0.525585 14.0486 1.17394 14.0486H34.8261C35.4743 14.0486 36 13.5221 36 12.8726V9.34466C35.9999 8.04575 34.9488 6.99273 33.6521 6.99273ZM14.4782 6.60076V6.99273H8.95569C7.49656 6.99273 6.34822 5.63008 6.71265 4.10825C6.87317 3.43805 7.35608 2.86674 7.98066 2.57753C8.83834 2.18042 9.78839 2.30791 10.5087 2.96106L14.4792 6.5661C14.479 6.57773 14.4782 6.58914 14.4782 6.60076ZM29.3409 4.86684C29.2535 6.08911 28.1513 6.99288 26.9281 6.99288H21.5217V6.6009C21.5217 6.58702 21.5209 6.57329 21.5207 6.55941C22.4202 5.74264 24.3714 3.97104 25.4297 3.01008C26.0311 2.46399 26.8727 2.20908 27.6506 2.44152C28.767 2.77511 29.4226 3.72613 29.3409 4.86684Z"/>
                    <path fill="${theme_second_color}" d="M2.3479 16.4004V33.648C2.3479 34.947 3.399 35.9999 4.6957 35.9999H15.6522V16.4004H2.3479Z"/>
                    <path fill="${theme_second_color}" d="M20.3479 16.4004V35.9999H31.3044C32.6011 35.9999 33.6522 34.947 33.6522 33.648V16.4004H20.3479Z"/>
                  </g>
                  <defs>
                    <filter id="filter0_i" x="0" y="-8" width="36" height="43.9999" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                      <feFlood flood-opacity="0" result="BackgroundImageFix"/>
                      <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                      <feOffset dy="-8"/>
                      <feGaussianBlur stdDeviation="15"/>
                      <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
                      <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0"/>
                      <feBlend mode="normal" in2="shape" result="effect1_innerShadow"/>
                    </filter>
                    <linearGradient id="paint0_linear" x1="1.09862e-06" y1="14.1371" x2="18.7135" y2="-12.2565" gradientUnits="userSpaceOnUse">
                      <stop stop-color="#131313"/>
                      <stop offset="1" stop-color="#232631"/>
                    </linearGradient>
                    <linearGradient id="paint1_linear" x1="2.3479" y1="36.1234" x2="20.4887" y2="29.3458" gradientUnits="userSpaceOnUse">
                      <stop stop-color="#131313"/>
                      <stop offset="1" stop-color="#232631"/>
                    </linearGradient>
                    <linearGradient id="paint2_linear" x1="20.3479" y1="36.1234" x2="38.4887" y2="29.3458" gradientUnits="userSpaceOnUse">
                      <stop stop-color="#131313"/>
                      <stop offset="1" stop-color="#232631"/>
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </span>
          </a>
        </div>
      </div>
      
      <!--reminder buttons-->
      <div id="present_time_reminder_container">
        <div class="present-time-reminder" id="present_time_reminder_1" style="background-color: ${theme_second_color}">
          <svg width="41" height="30" viewBox="0 0 41 30" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g filter="url(#filter0_i)">
              <path fill="white" d="M40.252 3.11811V19.8898H14.2076C15.4234 19.349 16.2088 18.1458 16.2143 16.8152C16.2143 14.9524 14.6785 13.4369 12.791 13.4369C11.6955 13.4358 10.665 13.9562 10.0157 14.8383V0H37.1339C38.8549 0.00184547 40.2501 1.39702 40.252 3.11811ZM5.23893 18.8338C4.17889 18.6522 3.43885 17.6833 3.54294 16.6129C3.64665 15.5426 4.55942 14.7343 5.63423 14.7597C6.00812 14.7594 6.37537 14.8572 6.6998 15.0432C7.21801 15.3396 7.58231 15.846 7.69783 16.4317L8.27436 19.4029L5.23893 18.8338ZM10.1512 19.4033L10.7274 16.4321C10.9473 15.3861 11.9158 14.6708 12.9803 14.7689C14.0444 14.8668 14.8664 15.7467 14.8915 16.8152C14.8823 17.8103 14.1662 18.6581 13.1866 18.8338L10.1512 19.4033ZM3.11811 0H8.69291V15.2993C8.39395 14.7132 7.9311 14.226 7.36048 13.8979C6.83563 13.5956 6.24028 13.4369 5.6346 13.4369C3.74668 13.4369 2.21125 14.9524 2.21125 16.8152C2.21678 18.1454 3.00185 19.349 4.21764 19.8898H0V3.11811C0.00184547 1.39702 1.39702 0.00184547 3.11811 0ZM0 26.8819V21.2126H7.47416L4.63472 24.052C4.37635 24.3104 4.37635 24.729 4.63472 24.9873C4.89309 25.2457 5.31164 25.2457 5.57 24.9873L8.69291 21.8644V30H3.11811C1.39702 29.9982 0.00184547 28.603 0 26.8819ZM37.1339 30H10.0157V21.8644L14.2253 26.0739C14.4836 26.3323 14.9022 26.3323 15.1606 26.0739C15.4189 25.8156 15.4189 25.397 15.1606 25.1387L11.2345 21.2126H40.252V26.8819C40.2501 28.603 38.8549 29.9982 37.1339 30Z"/>
            </g>
            <defs>
              <filter id="filter0_i" x="0" y="-8" width="40.252" height="38" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                <feFlood flood-opacity="0" result="BackgroundImageFix"/>
                <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                <feOffset dy="-8"/>
                <feGaussianBlur stdDeviation="15"/>
                <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
                <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0"/>
                <feBlend mode="normal" in2="shape" result="effect1_innerShadow"/>
              </filter>
              <linearGradient id="paint0_linear" x1="1.22838e-06" y1="30.189" x2="40.4735" y2="0.300046" gradientUnits="userSpaceOnUse">
                <stop stop-color="#131313"/>
                <stop offset="1" stop-color="#232631"/>
              </linearGradient>
            </defs>
          </svg>
          <span class="tada-expire-time" style="color: white">00:13:45 left!</span>
        </div>
        <div class="tada-remaind-bar-close" style="background-color: ${theme_second_color}">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill="white" fill-rule="evenodd" clip-rule="evenodd" d="M12 0.921603L11.0769 0L5.99041 5.07839L0.923077 0.0191509L0 0.940754L5.06734 5.99999L0 11.0592L0.923077 11.9808L5.99041 6.9216L11.0769 12L12 11.0784L6.91349 5.99999L12 0.921603Z"/>
          </svg>
        </div>
      </div>
      
      <!--RemainerBar -->
      <div class="tada_remaind_bar" style="background-color: ${theme_colors[game_theme_style].first}">
        <div class="d-flex tada_remaind_bar_children">
          <span id="tada_notifi_cash_view"></span>&nbsp;
          <span>ends so soon! </span>
          <span id="tada_notifi_cash_remaind_time" class="tada-expire-time" style="color: ${theme_first_color}">15m : 20s</span>&nbsp;
        </div>
        <div class="tada-remained_notify_button_container">
          <button id="tada_ramaind_view_coupon_button" style="background-color: ${theme_second_color}"
            data-toggle="modal" data-target="#gamestartmodal">SEE MY COUPON</button>
        </div>
        <div class="tada-remaind-bar-close" style="background-color: ${theme_second_color}">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill="white" fill-rule="evenodd" clip-rule="evenodd" d="M12 0.921603L11.0769 0L5.99041 5.07839L0.923077 0.0191509L0 0.940754L5.06734 5.99999L0 11.0592L0.923077 11.9808L5.99041 6.9216L11.0769 12L12 11.0784L6.91349 5.99999L12 0.921603Z"/>
          </svg>
        </div>
      </div>
      
      <div class="tada-open-game-modal" data-toggle="modal" data-target="#tada_game_modal_2"></div>
      <div class="tada-open-full-modal" data-toggle="modal" data-target="#tada_full_modal"></div>
          
      <!--Flowers falling -->
      <div id="tada-flower-falling"></div>
      
      <!--Invalid email warning-->
      <div id="snackbar" style="background-color: ${theme_second_color}">You have entered an invalid e-mail address. Please try again.</div>
      
      <!--Game Modal-->
      <div class="modal fade tada-game-modal" id="tada_game_modal_2" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered tada-game-modal-container" role="document">
          <div class="tada-game-modal-content">
            <div class="tada-game-modal-top" style="background-color: ${theme_first_color}">
              <div class="tada-game-modal-btn-close-container btn-close-mobile">
                <button type="button" class="close tada-game-modal-btn-close-fake" aria-label="Close">
                  <div class="tada-dialog-btn-close-inner">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M12 0.921603L11.0769 0L5.99041 5.07839L0.923077 0.0191509L0 0.940754L5.06734 5.99999L0 11.0592L0.923077 11.9808L5.99041 6.9216L11.0769 12L12 11.0784L6.91349 5.99999L12 0.921603Z" fill="#D494A5"/>
                    </svg>
                  </div>
                </button>
              </div>
              <div class="tada-game-modal-right">
                <div class="tada-game-modal-logo">
                  <img id="tada-game-logo" src="${widget_url}/full-modal/popup-mark-white.png">
                </div>
                <div class="tada-game-modal-heading-mobile">
                  <h3 class="tada-game-modal-heading-1">Pick a gift and win a discount for this store!</h3>
                </div>
                <p class="tada-game-modal-heading-2">You have a chance to win a great discount. Are you feeling lucky? Pick one of the 5 gifts below and win a discount for this site  <img src="${widget_url}/simple-svg/present-icon.svg">.</p>
              </div>
            </div>
            <div class="tada-game-modal-bottom">
              <div class="tada-game-modal-form tada-game-modal-right">
                <div class="tada-game-modal-form-top">
                  <input type="email" class="form-control tada-game-modal-email" id="tada_game_modal_email" style="border-color: ${theme_second_color}" placeholder="Enter your email address" required>
                  <div class="tada-custom-checkbox tada-game-modal-form-policy">
                    <div class="tada-custom-checkbox-overlay" style="border-color: ${theme_second_color}">
                      <svg width="10" height="8" class="tada-custom-checkbox-overlay-svg" style="display: none;" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fill="${theme_second_color}" fill-rule="evenodd" clip-rule="evenodd" d="M3.31476 7.8585L0.132954 4.4415C-0.044318 4.2535 -0.044318 3.9475 0.132954 3.7575L0.775678 3.0745C0.95295 2.8865 1.24113 2.8865 1.4184 3.0745L3.63657 5.4665L8.5811 0.1415C8.75837 -0.0465 9.04655 -0.0465 9.22382 0.1415L9.86655 0.8255C10.0438 1.0135 10.0438 1.3205 9.86655 1.5075L3.95748 7.8585C3.78021 8.0465 3.49203 8.0465 3.31476 7.8585Z"/>
                        <path fill="black" fill-rule="evenodd" clip-rule="evenodd" d="M3.31476 7.8585L0.132954 4.4415C-0.044318 4.2535 -0.044318 3.9475 0.132954 3.7575L0.775678 3.0745C0.95295 2.8865 1.24113 2.8865 1.4184 3.0745L3.63657 5.4665L8.5811 0.1415C8.75837 -0.0465 9.04655 -0.0465 9.22382 0.1415L9.86655 0.8255C10.0438 1.0135 10.0438 1.3205 9.86655 1.5075L3.95748 7.8585C3.78021 8.0465 3.49203 8.0465 3.31476 7.8585Z" fill-opacity="0.1"/>
                      </svg>
                    </div>
                    <input type="checkbox" class="custom-control-input" id="tada_game_modal_agree_policy" style="display: none">
                    <label class="tada-custom-checkbox-label" for="tada_game_modal_agree_policy">
                      I agree to <a style="color: ${theme_second_color}">Terms</a> and I have read our <a style="color: ${theme_second_color}">Privacy policy</a>.
                    </label>
                  </div>
                  <div class="tada-game-expire-in-wrapper" style="display: none">
                    <span>Expires in: </span>
                    <span style="font-weight: 600; color: ${theme_second_color}">01:56:34</span>
                  </div>
                </div>
                <div class="tada-game-modal-form-submit">
                  <p class="gift-text">Choose your gift:</p>
                  <div class="gift-box-container">
                    <div class="gift-box">
                      <img src="${widget_url}/gift-box/gift-box.png">
                    </div>
                    <div class="gift-box">
                      <img src="${widget_url}/gift-box/gift-box.png">
                    </div>
                    <div class="gift-box">
                      <img src="${widget_url}/gift-box/gift-box.png">
                    </div>
                    <div class="gift-box">
                      <img src="${widget_url}/gift-box/gift-box.png">
                    </div>
                    <div class="gift-box">
                      <img src="${widget_url}/gift-box/gift-box.png">
                    </div>
                  </div>
                  
                  <div class="custom-meter red tada-progress-bar">
                    <span style="width: 50%; background-image: linear-gradient(${theme_first_color}, ${theme_second_color});"></span>
                  </div>
                  <p class="tada-progress-bar-text" style="display: ${progress_bar ? 'block' : 'none'}"><span id="tada-progressbar-percent-number">70</span>% offers claimed. Hurry up!</p>
                </div>

                <div class="tada-game-result-panel" style="display: none; background-image: url(${widget_url}/game-modal/result-back.png)">
                  <p class="tada-game-result-text" style="color: ${theme_second_color};">$10 Cash</p>
                  <p class="tada-game-result-code-label">Code:</p>
                  <p class="tada-game-result-code">EZG37YVZ5Q2P</p>
                </div>
                <button class="form-control tada-game-modal-btn tada-btn-apply-discount" id="tada_game_btn_apply_discount" style="background-color: ${theme_second_color}; display: none;">apply my discount</button>
              </div>
            </div>
            <div class="tada-game-modal-footer">
              <div class="tada-game-modal-right tada-game-modal-footer-right">
                <div class="tada-game-modal-btn-close-container">
                  <span>No, I don't want a discount.</span>
                </div>
                <button class="tada-game-modal-btn-close" data-dismiss="modal" style="display: none;"></button>
              </div>
            </div>
          </div>
          
          <div class="tada-game-mobile-landscape">
            <div class="landscape-small">
              <div class="landscape-small-top" style="background-color: ${theme_first_color}">
                <div class="tada-game-modal-logo">
                  <img id="tada-game-logo" src="${widget_url}/full-modal/popup-mark-white.png">
                </div>
                <div class="tada-game-modal-heading-container">
                  <div class="top-left">
                    <h3 class="tada-game-modal-heading-1">Spin to win a BIG prize right now!</h3>
                  </div>
                  <div class="top-right">
                    <p class="tada-game-modal-heading-2">You have a chance to win a great discount. Are you feeling lucky? Pick one of the 5 gifts below and win a discount for this site. <img src="${widget_url}/simple-svg/ice-cream-icon.svg"></p>
                  </div>
                </div>
              </div>
              <div class="landscape-small-bottom">
                <div class="tada-game-modal-form">
                  <div class="email-checkbox-container">
                    <div>
                      <input type="email" class="form-control tada-game-modal-email" id="tada_game_modal_email_landscape" style="border-color: ${theme_second_color}" placeholder="Enter your email address" required>
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
                        <input type="checkbox" class="custom-control-input" id="tada_game_modal_agree_policy_landscape" style="display: none">
                        <label class="tada-custom-checkbox-label" for="tada_game_modal_agree_policy_landscape">
                          I agree to <a style="color: ${theme_second_color}; text-decoration: underline;">Terms</a> and I have read our <a style="color: ${theme_second_color}; text-decoration: underline;">Privacy policy</a>.
                        </label>
                      </div>

                      <div class="tada-game-result-panel" style="display: none; background-image: url(${widget_url}/game-modal/result-back.png)">
                        <p class="tada-game-result-text" style="color: ${theme_second_color};">$10 Cash</p>
                        <p class="tada-game-result-code-label">Code:</p>
                        <p class="tada-game-result-code">EZG37YVZ5Q2P</p>
                      </div>
                    </div>
                    <div class="tada-game-modal-btn-close-container">
                      <span>No, I don't want a discount.</span>
                    </div>
                  </div>
                  <div class="tada-game-modal-form-submit">
                    <div>
                      <p class="gift-text">Choose your gift:</p>
                      <div class="gift-box-container">
                        <div class="gift-box">
                          <img src="${widget_url}/gift-box/gift-box.png">
                        </div>
                        <div class="gift-box">
                          <img src="${widget_url}/gift-box/gift-box.png">
                        </div>
                        <div class="gift-box">
                          <img src="${widget_url}/gift-box/gift-box.png">
                        </div>
                        <div class="gift-box">
                          <img src="${widget_url}/gift-box/gift-box.png">
                        </div>
                        <div class="gift-box">
                          <img src="${widget_url}/gift-box/gift-box.png">
                        </div>
                      </div>
                      
                      <div class="custom-meter red tada-progress-bar">
                        <span style="width: 50%; background-image: linear-gradient(${theme_first_color}, ${theme_second_color});"></span>
                      </div>
                    </div>
                    <p class="tada-progress-bar-text" style="display: ${progress_bar ? 'block' : 'none'}"><span id="tada-progressbar-percent-number">70</span>% offers claimed. Hurry up!</p>
                    <button class="form-control tada-game-modal-btn tada-btn-apply-discount" style="background-color: ${theme_second_color}; display: none;">apply my discount</button>
                  </div>
                </div>
              </div>
            </div>
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
