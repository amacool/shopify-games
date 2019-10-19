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
  var wheel_item = ["3% Discount", "40% Discount", "Not Luck Today", "10% Discount", "30% Discount", "FREE SHIPPING", "50% Discount", "3% Discount", "10% Discount", "20% Discount", "30% Discount"];
  var progress_bar = true;
  var popup_back_img_type = 1;
  var theme_first_color = theme_colors[game_theme_color].first;
  var theme_second_color = theme_colors[game_theme_color].second;

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
    <script src="${widget_url}/tadaMain.js"></script>
    <link href='https://fonts.googleapis.com/css?family=Montserrat' rel='stylesheet'>
    <link rel="stylesheet" href="${widget_url}/tadaMain.css"/>
    <div id="tada_app_widget">
    <div class="tada-wheel-wrapper">
      <div id="spinny_box" class="tada_start_icon_div" data-toggle="modal" data-target="#tada_game_modal_2">
        <div role='button' class='retro-btn'>
          <a class='btn tada-btn'>
            <span class='btn-inner'>
              <span class='content-wrapper'>
                <svg class='btn-content' id="Layer_1" data-name="Layer 1" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g filter="url(#filter0_i)">
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
      </div>
      
      <div class="tada-open-game-modal" data-toggle="modal" data-target="#tada_game_modal_2"></div>
      <div class="tada-open-full-modal" data-toggle="modal" data-target="#tada_full_modal"></div>
          
      <!--Flowers falling -->
      <div id="tada-flower-falling"></div>
      
      <!--Invalid email warning-->
      <div id="snackbar" style="background-color: ${theme_first_color}">You have entered an invalid e-mail address. Please try again.</div>

      <!--Full screen popup modal-->
      <div class="modal fade tada-full-modal ${game_theme_style === 1 ? "tada-full-modal-theme-1" : "tada-full-modal-theme-2"}" id="tada_full_modal" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered tada-full-modal-content" role="document" style="display: ${game_theme_style === 1 ? "flex" : "block"}; background-image: url(${widget_url}/full-modal/popup-back-${popup_back_img_type}.png)">
          <div class="tada-full-modal-left" style="${game_theme_style === 2 ? 'margin: 0 auto; background: transparent; height: 100%;' : ''}">
            <div class="inner-wrapper">
              <div class="tada-full-modal-logo">
                <img id="tada-game-logo" src="${widget_url}/full-modal/popup-mark.png">
              </div>
              <div class="tada-full-modal-title">
                <h3>Want the internet's favorite items at 25% off?</h3>
                <p>You have a chance to win a nice big fat discount.<br class="tada-full-modal-title-br"/> Are you feeling lucky?</p>
                <div class="tada-game-expire-in-wrapper" style="display: none">
                  <span>Expires in: </span>
                  <span style="font-weight: 600; color: ${theme_second_color}">01:56:34</span>
                </div>
              </div>
              <div class="tada-full-modal-form">
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
                <div class="tada-game-result-panel" style="display: none;">
                  <p class="tada-game-result-text" style="color: ${theme_second_color};">$10 Cash</p>
                  <p class="tada-game-result-code-label">Code:</p>
                  <p class="tada-game-result-code">EZG37YVZ5Q2P</p>
                  <div class="tada-game-result-svg-wrapper">
                    <svg class="tada-game-result-svg" width="397" height="300" viewBox="0 0 397 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g filter="url(#filter0_d)">
                        <mask id="path-1-outside-1" maskUnits="userSpaceOnUse" x="20" y="8" width="357" height="146" fill="black">
                          <rect fill="white" x="20" y="8" width="357" height="146"/>
                          <path fill-rule="evenodd" clip-rule="evenodd" d="M21 109.8V117C23.4853 117 25.5 119.015 25.5 121.5C25.5 123.985 23.4853 126 21 126L21 134.999C30.9411 134.999 39 143.058 39 152.999V153H171V153L357.6 153C357.6 143.059 365.659 135 375.6 135V126.001C373.114 126.001 371.1 123.986 371.1 121.501C371.1 119.015 373.114 117.001 375.6 117.001V109.801C373.114 109.801 371.1 107.786 371.1 105.301C371.1 102.815 373.114 100.801 375.6 100.801V93.6007C373.114 93.6006 371.1 91.5859 371.1 89.1007C371.1 86.6154 373.114 84.6008 375.6 84.6007V77.4001C373.114 77.4001 371.1 75.3854 371.1 72.9001C371.1 70.4149 373.114 68.4002 375.6 68.4001V61.2001C373.114 61.2001 371.1 59.1854 371.1 56.7001C371.1 54.2149 373.114 52.2002 375.6 52.2001V45.0001C373.114 45.0001 371.1 42.9854 371.1 40.5001C371.1 38.0149 373.114 36.0002 375.6 36.0001V27.0007C365.659 27.0006 357.6 18.9418 357.6 9.00072V9.00029L171.3 9.00027V9H39C39 18.9411 30.9411 26.9999 21 27L21 35.9994C23.4853 35.9994 25.5 38.0141 25.5 40.4994C25.5 42.9847 23.4853 44.9994 21 44.9994V52.1994C23.4853 52.1994 25.5 54.2141 25.5 56.6994C25.5 59.1847 23.4853 61.1994 21 61.1994V68.4C23.4853 68.4 25.5 70.4147 25.5 72.9C25.5 75.3853 23.4853 77.4 21 77.4V84.6C23.4853 84.6 25.5 86.6147 25.5 89.1C25.5 91.5853 23.4853 93.6 21 93.6V100.8C23.4853 100.8 25.5 102.815 25.5 105.3C25.5 107.785 23.4853 109.8 21 109.8Z"/>
                        </mask>
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M21 109.8V117C23.4853 117 25.5 119.015 25.5 121.5C25.5 123.985 23.4853 126 21 126L21 134.999C30.9411 134.999 39 143.058 39 152.999V153H171V153L357.6 153C357.6 143.059 365.659 135 375.6 135V126.001C373.114 126.001 371.1 123.986 371.1 121.501C371.1 119.015 373.114 117.001 375.6 117.001V109.801C373.114 109.801 371.1 107.786 371.1 105.301C371.1 102.815 373.114 100.801 375.6 100.801V93.6007C373.114 93.6006 371.1 91.5859 371.1 89.1007C371.1 86.6154 373.114 84.6008 375.6 84.6007V77.4001C373.114 77.4001 371.1 75.3854 371.1 72.9001C371.1 70.4149 373.114 68.4002 375.6 68.4001V61.2001C373.114 61.2001 371.1 59.1854 371.1 56.7001C371.1 54.2149 373.114 52.2002 375.6 52.2001V45.0001C373.114 45.0001 371.1 42.9854 371.1 40.5001C371.1 38.0149 373.114 36.0002 375.6 36.0001V27.0007C365.659 27.0006 357.6 18.9418 357.6 9.00072V9.00029L171.3 9.00027V9H39C39 18.9411 30.9411 26.9999 21 27L21 35.9994C23.4853 35.9994 25.5 38.0141 25.5 40.4994C25.5 42.9847 23.4853 44.9994 21 44.9994V52.1994C23.4853 52.1994 25.5 54.2141 25.5 56.6994C25.5 59.1847 23.4853 61.1994 21 61.1994V68.4C23.4853 68.4 25.5 70.4147 25.5 72.9C25.5 75.3853 23.4853 77.4 21 77.4V84.6C23.4853 84.6 25.5 86.6147 25.5 89.1C25.5 91.5853 23.4853 93.6 21 93.6V100.8C23.4853 100.8 25.5 102.815 25.5 105.3C25.5 107.785 23.4853 109.8 21 109.8Z" fill="white"/>
                        <path d="M21 117H20.5V117.5H21V117ZM21 109.8V109.3H20.5V109.8H21ZM21 126V125.5H20.5L20.5 126H21ZM21 134.999H20.5L20.5 135.499H21V134.999ZM39 153H38.5V153.5H39V153ZM171 153H171.5V152.5H171V153ZM171 153H170.5V153.5H171V153ZM357.6 153V153.5H358.1V153H357.6ZM375.6 135V135.5H376.1V135H375.6ZM375.6 126.001H376.1V125.501L375.6 125.501V126.001ZM375.6 117.001V117.501L376.1 117.501V117.001H375.6ZM375.6 109.801H376.1V109.301L375.6 109.301V109.801ZM375.6 100.801V101.301L376.1 101.301V100.801H375.6ZM375.6 93.6007H376.1V93.1007L375.6 93.1007V93.6007ZM375.6 84.6007V85.1007L376.1 85.1007V84.6007H375.6ZM375.6 77.4001H376.1V76.9001L375.6 76.9001V77.4001ZM375.6 68.4001V68.9001L376.1 68.9001V68.4001H375.6ZM375.6 61.2001H376.1V60.7001L375.6 60.7001V61.2001ZM375.6 52.2001V52.7001L376.1 52.7001V52.2001H375.6ZM375.6 45.0001H376.1V44.5001L375.6 44.5001V45.0001ZM375.6 36.0001V36.5001L376.1 36.5001V36.0001H375.6ZM375.6 27.0007H376.1V26.5007L375.6 26.5007V27.0007ZM357.6 9.00029H358.1V8.50029L357.6 8.50029V9.00029ZM171.3 9.00027H170.8V9.50027H171.3V9.00027ZM171.3 9H171.8V8.5H171.3V9ZM39 9V8.5H38.5V9L39 9ZM21 27L21 26.5H20.5L20.5 27H21ZM21 35.9994H20.5L20.5 36.4994L21 36.4994L21 35.9994ZM21 44.9994V44.4994H20.5V44.9994H21ZM21 52.1994H20.5V52.6994H21V52.1994ZM21 61.1994V60.6994H20.5V61.1994H21ZM21 68.4H20.5V68.9H21V68.4ZM21 77.4V76.9H20.5V77.4H21ZM21 84.6H20.5V85.1H21V84.6ZM21 93.6V93.1H20.5V93.6H21ZM21 100.8H20.5V101.3H21V100.8ZM21.5 117V109.8H20.5V117H21.5ZM26 121.5C26 118.739 23.7614 116.5 21 116.5V117.5C23.2091 117.5 25 119.291 25 121.5H26ZM21 126.5C23.7614 126.5 26 124.261 26 121.5H25C25 123.709 23.2091 125.5 21 125.5V126.5ZM21.5 134.999L21.5 126H20.5L20.5 134.999H21.5ZM39.5 152.999C39.5 142.782 31.2173 134.499 21 134.499V135.499C30.665 135.499 38.5 143.334 38.5 152.999H39.5ZM39.5 153V152.999H38.5V153H39.5ZM171 152.5H39V153.5H171V152.5ZM171.5 153V153H170.5V153H171.5ZM357.6 152.5L171 152.5V153.5L357.6 153.5V152.5ZM375.6 134.5C365.382 134.5 357.1 142.783 357.1 153H358.1C358.1 143.335 365.935 135.5 375.6 135.5V134.5ZM375.1 126.001V135H376.1V126.001H375.1ZM370.6 121.501C370.6 124.262 372.838 126.501 375.6 126.501V125.501C373.391 125.501 371.6 123.71 371.6 121.501H370.6ZM375.6 116.501C372.838 116.501 370.6 118.739 370.6 121.501H371.6C371.6 119.292 373.391 117.501 375.6 117.501V116.501ZM375.1 109.801V117.001H376.1V109.801H375.1ZM370.6 105.301C370.6 108.062 372.838 110.301 375.6 110.301V109.301C373.391 109.301 371.6 107.51 371.6 105.301H370.6ZM375.6 100.301C372.838 100.301 370.6 102.539 370.6 105.301H371.6C371.6 103.092 373.391 101.301 375.6 101.301V100.301ZM375.1 93.6007V100.801H376.1V93.6007H375.1ZM370.6 89.1007C370.6 91.8621 372.838 94.1006 375.6 94.1007V93.1007C373.391 93.1006 371.6 91.3098 371.6 89.1007H370.6ZM375.6 84.1007C372.838 84.1008 370.6 86.3393 370.6 89.1007H371.6C371.6 86.8916 373.391 85.1007 375.6 85.1007V84.1007ZM375.1 77.4001V84.6007H376.1V77.4001H375.1ZM370.6 72.9001C370.6 75.6615 372.838 77.9 375.6 77.9001V76.9001C373.391 76.9001 371.6 75.1092 371.6 72.9001H370.6ZM375.6 67.9001C372.838 67.9002 370.6 70.1387 370.6 72.9001H371.6C371.6 70.691 373.391 68.9002 375.6 68.9001V67.9001ZM375.1 61.2001V68.4001H376.1V61.2001H375.1ZM370.6 56.7001C370.6 59.4615 372.838 61.7 375.6 61.7001V60.7001C373.391 60.7001 371.6 58.9092 371.6 56.7001H370.6ZM375.6 51.7001C372.838 51.7002 370.6 53.9387 370.6 56.7001H371.6C371.6 54.491 373.391 52.7002 375.6 52.7001V51.7001ZM375.1 45.0001V52.2001H376.1V45.0001H375.1ZM370.6 40.5001C370.6 43.2615 372.838 45.5 375.6 45.5001V44.5001C373.391 44.5001 371.6 42.7092 371.6 40.5001H370.6ZM375.6 35.5001C372.838 35.5002 370.6 37.7387 370.6 40.5001H371.6C371.6 38.291 373.391 36.5002 375.6 36.5001V35.5001ZM375.1 27.0007V36.0001H376.1V27.0007H375.1ZM357.1 9.00072C357.1 19.2179 365.382 27.5006 375.6 27.5007V26.5007C365.935 26.5006 358.1 18.6657 358.1 9.00072H357.1ZM357.1 9.00029V9.00072H358.1V9.00029H357.1ZM171.3 9.50027L357.6 9.50029V8.50029L171.3 8.50027V9.50027ZM170.8 9V9.00027H171.8V9H170.8ZM39 9.5H171.3V8.5H39V9.5ZM21 27.5C31.2173 27.4999 39.5 19.2172 39.5 9L38.5 9C38.5 18.665 30.665 26.4999 21 26.5L21 27.5ZM21.5 35.9994L21.5 27H20.5L20.5 35.9994H21.5ZM26 40.4994C26 37.738 23.7614 35.4994 21 35.4994L21 36.4994C23.2091 36.4994 25 38.2903 25 40.4994H26ZM21 45.4994C23.7614 45.4994 26 43.2608 26 40.4994H25C25 42.7085 23.2091 44.4994 21 44.4994V45.4994ZM21.5 52.1994V44.9994H20.5V52.1994H21.5ZM26 56.6994C26 53.938 23.7614 51.6994 21 51.6994V52.6994C23.2091 52.6994 25 54.4903 25 56.6994H26ZM21 61.6994C23.7614 61.6994 26 59.4608 26 56.6994H25C25 58.9085 23.2091 60.6994 21 60.6994V61.6994ZM21.5 68.4V61.1994H20.5V68.4H21.5ZM26 72.9C26 70.1386 23.7614 67.9 21 67.9V68.9C23.2091 68.9 25 70.6909 25 72.9H26ZM21 77.9C23.7614 77.9 26 75.6614 26 72.9H25C25 75.1091 23.2091 76.9 21 76.9V77.9ZM21.5 84.6V77.4H20.5V84.6H21.5ZM26 89.1C26 86.3386 23.7614 84.1 21 84.1V85.1C23.2091 85.1 25 86.8909 25 89.1H26ZM21 94.1C23.7614 94.1 26 91.8614 26 89.1H25C25 91.3091 23.2091 93.1 21 93.1V94.1ZM21.5 100.8V93.6H20.5V100.8H21.5ZM26 105.3C26 102.539 23.7614 100.3 21 100.3V101.3C23.2091 101.3 25 103.091 25 105.3H26ZM21 110.3C23.7614 110.3 26 108.061 26 105.3H25C25 107.509 23.2091 109.3 21 109.3V110.3Z" fill="#F7F7F7" mask="url(#path-1-outside-1)"/>
                      </g>
                      <mask id="path-3-inside-2" fill="white">
                        <path fill="#333" fill-rule="evenodd" clip-rule="evenodd" d="M360.8 128V33.4999C351.752 33.4998 344.417 26.4484 344.417 17.75L170 17.75V18H50.8833C50.8833 26.6984 43.5483 33.7499 34.5001 33.7499H34.5V128.25H34.5001C43.5483 128.25 50.8833 135.301 50.8833 144H171.3V143.75L344.417 143.75C344.417 135.051 351.752 128 360.8 128Z"/>
                      </mask>
                      <path stroke="#eee" d="M360.8 33.4999H361.8V32.4999L360.8 32.4999V33.4999ZM360.8 128V129L361.8 129V128H360.8ZM344.417 17.75L345.417 17.75V16.75L344.417 16.75V17.75ZM170 17.75V16.75L169 16.75V17.75H170ZM170 18V19H171V18H170ZM50.8833 18V17H49.8833L49.8833 18L50.8833 18ZM34.5 33.7499V32.7499H33.5V33.7499H34.5ZM34.5 128.25H33.5V129.25H34.5V128.25ZM50.8833 144L49.8833 144L49.8833 145H50.8833V144ZM171.3 144V145H172.3V144H171.3ZM171.3 143.75V142.75H170.3V143.75H171.3ZM344.417 143.75V144.75H345.417V143.75H344.417ZM359.8 33.4999V128H361.8V33.4999H359.8ZM343.417 17.75C343.417 27.0375 351.237 34.4998 360.8 34.4999V32.4999C352.267 32.4998 345.417 25.8593 345.417 17.75L343.417 17.75ZM170 18.75L344.417 18.75V16.75L170 16.75V18.75ZM171 18V17.75H169V18H171ZM50.8833 19H170V17H50.8833V19ZM34.5001 34.7499C44.0631 34.7499 51.8833 27.2875 51.8833 18L49.8833 18C49.8833 26.1094 43.0335 32.7499 34.5001 32.7499V34.7499ZM34.5 34.7499H34.5001V32.7499H34.5V34.7499ZM35.5 128.25V33.7499H33.5V128.25H35.5ZM34.5001 127.25H34.5V129.25H34.5001V127.25ZM51.8833 144C51.8832 134.712 44.063 127.25 34.5001 127.25V129.25C43.0335 129.25 49.8833 135.89 49.8833 144L51.8833 144ZM171.3 143H50.8833V145H171.3V143ZM170.3 143.75V144H172.3V143.75H170.3ZM344.417 142.75L171.3 142.75V144.75L344.417 144.75V142.75ZM360.8 127C351.237 127 343.417 134.462 343.417 143.75L345.417 143.75C345.417 135.64 352.267 129 360.8 129V127Z" fill="url(#paint0_linear)" mask="url(#path-3-inside-2)"/>
                      <path d="M50.6 109.004L50.6 105.188C50.6 104.276 50.776 103.472 51.128 102.776C51.472 102.072 51.96 101.528 52.592 101.144C53.224 100.752 53.96 100.556 54.8 100.556C55.64 100.556 56.376 100.752 57.008 101.144C57.64 101.528 58.132 102.072 58.484 102.776C58.828 103.472 59 104.276 59 105.188L59 109.004L50.6 109.004ZM57.404 105.284C57.404 104.444 57.172 103.776 56.708 103.28C56.236 102.776 55.6 102.524 54.8 102.524C54 102.524 53.368 102.776 52.904 103.28C52.432 103.776 52.196 104.444 52.196 105.284L52.196 107.06L57.404 107.06L57.404 105.284ZM52.544 99.2219L52.544 97.3499L59 97.3499L59 99.2219L52.544 99.2219ZM51.644 98.2859C51.644 98.6299 51.544 98.9099 51.344 99.1259C51.144 99.3419 50.896 99.4499 50.6 99.4499C50.304 99.4499 50.056 99.3419 49.856 99.1259C49.656 98.9099 49.556 98.6299 49.556 98.2859C49.556 97.9419 49.652 97.6619 49.844 97.4459C50.036 97.2299 50.276 97.1219 50.564 97.1219C50.876 97.1219 51.136 97.2299 51.344 97.4459C51.544 97.6619 51.644 97.9419 51.644 98.2859ZM59.096 93.4406C59.096 93.9766 59.032 94.5006 58.904 95.0126C58.768 95.5246 58.6 95.9326 58.4 96.2366L57.056 95.6126C57.24 95.3246 57.392 94.9766 57.512 94.5686C57.624 94.1606 57.68 93.7606 57.68 93.3686C57.68 92.5766 57.484 92.1806 57.092 92.1806C56.908 92.1806 56.776 92.2886 56.696 92.5046C56.616 92.7206 56.548 93.0526 56.492 93.5006C56.412 94.0286 56.32 94.4646 56.216 94.8086C56.112 95.1526 55.928 95.4526 55.664 95.7086C55.4 95.9566 55.024 96.0806 54.536 96.0806C54.128 96.0806 53.768 95.9646 53.456 95.7326C53.136 95.4926 52.888 95.1486 52.712 94.7006C52.536 94.2446 52.448 93.7086 52.448 93.0926C52.448 92.6366 52.5 92.1846 52.604 91.7366C52.7 91.2806 52.836 90.9046 53.012 90.6086L54.344 91.2326C54.024 91.8006 53.864 92.4206 53.864 93.0926C53.864 93.4926 53.92 93.7926 54.032 93.9926C54.144 94.1926 54.288 94.2926 54.464 94.2926C54.664 94.2926 54.804 94.1846 54.884 93.9686C54.964 93.7526 55.04 93.4086 55.112 92.9366C55.2 92.4086 55.296 91.9766 55.4 91.6406C55.496 91.3046 55.676 91.0126 55.94 90.7646C56.204 90.5166 56.572 90.3926 57.044 90.3926C57.444 90.3926 57.8 90.5126 58.112 90.7526C58.424 90.9926 58.668 91.3446 58.844 91.8086C59.012 92.2646 59.096 92.8086 59.096 93.4406ZM59.096 86.1176C59.096 86.8056 58.956 87.4256 58.676 87.9776C58.388 88.5216 57.992 88.9496 57.488 89.2616C56.984 89.5656 56.412 89.7176 55.772 89.7176C55.132 89.7176 54.56 89.5656 54.056 89.2616C53.552 88.9496 53.16 88.5216 52.88 87.9776C52.592 87.4256 52.448 86.8056 52.448 86.1176C52.448 85.4376 52.592 84.8456 52.88 84.3416C53.16 83.8296 53.564 83.4576 54.092 83.2256L54.872 84.6776C54.28 85.0136 53.984 85.4976 53.984 86.1296C53.984 86.6176 54.144 87.0216 54.464 87.3416C54.784 87.6616 55.22 87.8216 55.772 87.8216C56.324 87.8216 56.76 87.6616 57.08 87.3416C57.4 87.0216 57.56 86.6176 57.56 86.1296C57.56 85.4896 57.264 85.0056 56.672 84.6776L57.464 83.2256C57.976 83.4576 58.376 83.8296 58.664 84.3416C58.952 84.8456 59.096 85.4376 59.096 86.1176ZM59.096 79.1577C59.096 79.8377 58.956 80.4497 58.676 80.9937C58.388 81.5297 57.992 81.9497 57.488 82.2537C56.984 82.5577 56.412 82.7097 55.772 82.7097C55.132 82.7097 54.56 82.5577 54.056 82.2537C53.552 81.9497 53.16 81.5297 52.88 80.9937C52.592 80.4497 52.448 79.8377 52.448 79.1577C52.448 78.4777 52.592 77.8697 52.88 77.3337C53.16 76.7977 53.552 76.3777 54.056 76.0737C54.56 75.7697 55.132 75.6177 55.772 75.6177C56.412 75.6177 56.984 75.7697 57.488 76.0737C57.992 76.3777 58.388 76.7977 58.676 77.3337C58.956 77.8697 59.096 78.4777 59.096 79.1577ZM57.56 79.1577C57.56 78.6777 57.4 78.2857 57.08 77.9817C56.752 77.6697 56.316 77.5137 55.772 77.5137C55.228 77.5137 54.796 77.6697 54.476 77.9817C54.148 78.2857 53.984 78.6777 53.984 79.1577C53.984 79.6377 54.148 80.0337 54.476 80.3457C54.796 80.6577 55.228 80.8137 55.772 80.8137C56.316 80.8137 56.752 80.6577 57.08 80.3457C57.4 80.0337 57.56 79.6377 57.56 79.1577ZM52.544 67.8625L59 67.8625L59 69.6385L58.232 69.6385C58.512 69.8865 58.728 70.1825 58.88 70.5265C59.024 70.8705 59.096 71.2425 59.096 71.6425C59.096 72.4905 58.852 73.1625 58.364 73.6585C57.876 74.1545 57.152 74.4025 56.192 74.4025L52.544 74.4025L52.544 72.5305L55.916 72.5305C56.956 72.5305 57.476 72.0945 57.476 71.2225C57.476 70.7745 57.332 70.4145 57.044 70.1425C56.748 69.8705 56.312 69.7345 55.736 69.7345L52.544 69.7345L52.544 67.8625ZM52.448 62.2042C52.448 61.4042 52.688 60.7602 53.168 60.2722C53.648 59.7762 54.36 59.5282 55.304 59.5282L59 59.5282L59 61.4002L55.592 61.4002C55.08 61.4002 54.7 61.5122 54.452 61.7362C54.196 61.9602 54.068 62.2842 54.068 62.7082C54.068 63.1802 54.216 63.5562 54.512 63.8362C54.8 64.1162 55.232 64.2562 55.808 64.2562L59 64.2562L59 66.1282L52.544 66.1282L52.544 64.3402L53.3 64.3402C53.028 64.0922 52.82 63.7842 52.676 63.4162C52.524 63.0482 52.448 62.6442 52.448 62.2042ZM58.688 53.6673C58.824 53.8513 58.928 54.0793 59 54.3513C59.064 54.6153 59.096 54.8953 59.096 55.1913C59.096 55.9593 58.9 56.5553 58.508 56.9793C58.116 57.3953 57.54 57.6033 56.78 57.6033L54.128 57.6033L54.128 58.5993L52.688 58.5993L52.688 57.6033L51.116 57.6033L51.116 55.7313L52.688 55.7313L52.688 54.1233L54.128 54.1233L54.128 55.7313L56.756 55.7313C57.028 55.7313 57.24 55.6633 57.392 55.5273C57.536 55.3833 57.608 55.1833 57.608 54.9273C57.608 54.6313 57.528 54.3793 57.368 54.1713L58.688 53.6673Z" fill="#F1F1F1"/>
                      <path d="M345.4 53.996L345.4 57.812C345.4 58.724 345.224 59.528 344.872 60.224C344.528 60.928 344.04 61.472 343.408 61.856C342.776 62.248 342.04 62.444 341.2 62.444C340.36 62.444 339.624 62.248 338.992 61.856C338.36 61.472 337.868 60.928 337.516 60.224C337.172 59.528 337 58.724 337 57.812L337 53.996L345.4 53.996ZM338.596 57.716C338.596 58.556 338.828 59.224 339.292 59.72C339.764 60.224 340.4 60.476 341.2 60.476C342 60.476 342.632 60.224 343.096 59.72C343.568 59.224 343.804 58.556 343.804 57.716L343.804 55.94L338.596 55.94L338.596 57.716ZM343.456 63.7781L343.456 65.6501L337 65.6501L337 63.7781L343.456 63.7781ZM344.356 64.7141C344.356 64.3701 344.456 64.0901 344.656 63.8741C344.856 63.6581 345.104 63.5501 345.4 63.5501C345.696 63.5501 345.944 63.6581 346.144 63.8741C346.344 64.0901 346.444 64.3701 346.444 64.7141C346.444 65.0581 346.348 65.3381 346.156 65.5541C345.964 65.7701 345.724 65.8781 345.436 65.8781C345.124 65.8781 344.864 65.7701 344.656 65.5541C344.456 65.3381 344.356 65.0581 344.356 64.7141ZM336.904 69.5594C336.904 69.0234 336.968 68.4994 337.096 67.9874C337.232 67.4754 337.4 67.0674 337.6 66.7634L338.944 67.3874C338.76 67.6754 338.608 68.0234 338.488 68.4314C338.376 68.8394 338.32 69.2394 338.32 69.6314C338.32 70.4234 338.516 70.8194 338.908 70.8194C339.092 70.8194 339.224 70.7114 339.304 70.4954C339.384 70.2794 339.452 69.9474 339.508 69.4994C339.588 68.9714 339.68 68.5354 339.784 68.1914C339.888 67.8474 340.072 67.5474 340.336 67.2914C340.6 67.0434 340.976 66.9194 341.464 66.9194C341.872 66.9194 342.232 67.0354 342.544 67.2674C342.864 67.5074 343.112 67.8514 343.288 68.2994C343.464 68.7554 343.552 69.2914 343.552 69.9074C343.552 70.3634 343.5 70.8154 343.396 71.2634C343.3 71.7194 343.164 72.0954 342.988 72.3914L341.656 71.7674C341.976 71.1994 342.136 70.5794 342.136 69.9074C342.136 69.5074 342.08 69.2074 341.968 69.0074C341.856 68.8074 341.712 68.7074 341.536 68.7074C341.336 68.7074 341.196 68.8154 341.116 69.0314C341.036 69.2474 340.96 69.5914 340.888 70.0634C340.8 70.5914 340.704 71.0234 340.6 71.3594C340.504 71.6954 340.324 71.9874 340.06 72.2354C339.796 72.4834 339.428 72.6074 338.956 72.6074C338.556 72.6074 338.2 72.4874 337.888 72.2474C337.576 72.0074 337.332 71.6554 337.156 71.1914C336.988 70.7354 336.904 70.1914 336.904 69.5594ZM336.904 76.8824C336.904 76.1944 337.044 75.5744 337.324 75.0224C337.612 74.4784 338.008 74.0504 338.512 73.7384C339.016 73.4344 339.588 73.2824 340.228 73.2824C340.868 73.2824 341.44 73.4344 341.944 73.7384C342.448 74.0504 342.84 74.4784 343.12 75.0224C343.408 75.5744 343.552 76.1944 343.552 76.8824C343.552 77.5624 343.408 78.1544 343.12 78.6584C342.84 79.1704 342.436 79.5424 341.908 79.7744L341.128 78.3224C341.72 77.9864 342.016 77.5024 342.016 76.8704C342.016 76.3824 341.856 75.9784 341.536 75.6584C341.216 75.3384 340.78 75.1784 340.228 75.1784C339.676 75.1784 339.24 75.3384 338.92 75.6584C338.6 75.9784 338.44 76.3824 338.44 76.8704C338.44 77.5104 338.736 77.9944 339.328 78.3224L338.536 79.7744C338.024 79.5424 337.624 79.1704 337.336 78.6584C337.048 78.1544 336.904 77.5624 336.904 76.8824ZM336.904 83.8422C336.904 83.1622 337.044 82.5502 337.324 82.0062C337.612 81.4702 338.008 81.0502 338.512 80.7462C339.016 80.4422 339.588 80.2902 340.228 80.2902C340.868 80.2902 341.44 80.4422 341.944 80.7462C342.448 81.0502 342.84 81.4702 343.12 82.0062C343.408 82.5502 343.552 83.1622 343.552 83.8422C343.552 84.5222 343.408 85.1302 343.12 85.6662C342.84 86.2023 342.448 86.6223 341.944 86.9263C341.44 87.2302 340.868 87.3822 340.228 87.3822C339.588 87.3822 339.016 87.2302 338.512 86.9262C338.008 86.6223 337.612 86.2022 337.324 85.6662C337.044 85.1302 336.904 84.5222 336.904 83.8422ZM338.44 83.8422C338.44 84.3222 338.6 84.7142 338.92 85.0182C339.248 85.3302 339.684 85.4862 340.228 85.4862C340.772 85.4862 341.204 85.3302 341.524 85.0182C341.852 84.7142 342.016 84.3222 342.016 83.8422C342.016 83.3622 341.852 82.9662 341.524 82.6542C341.204 82.3422 340.772 82.1862 340.228 82.1862C339.684 82.1862 339.248 82.3422 338.92 82.6542C338.6 82.9662 338.44 83.3622 338.44 83.8422ZM343.456 95.1375L337 95.1375L337 93.3615L337.768 93.3615C337.488 93.1135 337.272 92.8175 337.12 92.4735C336.976 92.1295 336.904 91.7575 336.904 91.3575C336.904 90.5095 337.148 89.8375 337.636 89.3415C338.124 88.8455 338.848 88.5975 339.808 88.5975L343.456 88.5975L343.456 90.4695L340.084 90.4695C339.044 90.4695 338.524 90.9055 338.524 91.7775C338.524 92.2255 338.668 92.5855 338.956 92.8575C339.252 93.1295 339.688 93.2655 340.264 93.2655L343.456 93.2655L343.456 95.1375ZM343.552 100.796C343.552 101.596 343.312 102.24 342.832 102.728C342.352 103.224 341.64 103.472 340.696 103.472L337 103.472L337 101.6L340.408 101.6C340.92 101.6 341.3 101.488 341.548 101.264C341.804 101.04 341.932 100.716 341.932 100.292C341.932 99.8198 341.784 99.4438 341.488 99.1638C341.2 98.8838 340.768 98.7438 340.192 98.7438L337 98.7438L337 96.8718L343.456 96.8718L343.456 98.6598L342.7 98.6598C342.972 98.9078 343.18 99.2158 343.324 99.5838C343.476 99.9518 343.552 100.356 343.552 100.796ZM337.312 109.333C337.176 109.149 337.072 108.921 337 108.649C336.936 108.385 336.904 108.105 336.904 107.809C336.904 107.041 337.1 106.445 337.492 106.021C337.884 105.605 338.46 105.397 339.22 105.397L341.872 105.397L341.872 104.401L343.312 104.401L343.312 105.397L344.884 105.397L344.884 107.269L343.312 107.269L343.312 108.877L341.872 108.877L341.872 107.269L339.244 107.269C338.972 107.269 338.76 107.337 338.608 107.473C338.464 107.617 338.392 107.817 338.392 108.073C338.392 108.369 338.472 108.621 338.632 108.829L337.312 109.333Z" fill="#F1F1F1"/>
                      <line x1="69.5" y1="18.5" x2="69.5" y2="142.5" stroke="#DCDCDC" stroke-linecap="round" stroke-dasharray="2 5"/>
                      <line x1="327.5" y1="18.5" x2="327.5" y2="142.5" stroke="#DCDCDC" stroke-linecap="round" stroke-dasharray="2 5"/>
                      <path d="M56 33L57.4223 36.0423L60.7553 36.4549L58.3014 38.7478L58.9389 42.0451L56 40.4198L53.0611 42.0451L53.6986 38.7478L51.2447 36.4549L54.5777 36.0423L56 33Z" fill="url(#paint1_linear)"/>
                      <path d="M56 119L57.4223 122.042L60.7553 122.455L58.3014 124.748L58.9389 128.045L56 126.42L53.0611 128.045L53.6986 124.748L51.2447 122.455L54.5777 122.042L56 119Z" fill="url(#paint2_linear)"/>
                      <path d="M341 33L342.422 36.0423L345.755 36.4549L343.301 38.7478L343.939 42.0451L341 40.4198L338.061 42.0451L338.699 38.7478L336.245 36.4549L339.578 36.0423L341 33Z" fill="url(#paint3_linear)"/>
                      <path d="M341 119L342.422 122.042L345.755 122.455L343.301 124.748L343.939 128.045L341 126.42L338.061 128.045L338.699 124.748L336.245 122.455L339.578 122.042L341 119Z" fill="url(#paint4_linear)"/>
                      <defs>
                        <filter id="filter0_d" x="0.5" y="0.5" width="395.6" height="185" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                          <feFlood flood-opacity="0" result="BackgroundImageFix"/>
                          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/>
                          <feOffset dy="12"/>
                          <feGaussianBlur stdDeviation="10"/>
                          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/>
                          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow"/>
                          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape"/>
                        </filter>
                        <linearGradient id="paint0_linear" x1="308.1" y1="80.9999" x2="34.4732" y2="84.4375" gradientUnits="userSpaceOnUse">
                          <stop stop-color="#EFEFEF"/>
                          <stop offset="1" stop-color="#EBEBEB"/>
                        </linearGradient>
                        <linearGradient id="paint1_linear" x1="61" y1="34.5" x2="50.8772" y2="40.8028" gradientUnits="userSpaceOnUse">
                          <stop stop-color="#FAFAFA"/>
                          <stop offset="1" stop-color="#E8E8E8"/>
                        </linearGradient>
                        <linearGradient id="paint2_linear" x1="61" y1="120.5" x2="50.8772" y2="126.803" gradientUnits="userSpaceOnUse">
                          <stop stop-color="#FAFAFA"/>
                          <stop offset="1" stop-color="#E8E8E8"/>
                        </linearGradient>
                        <linearGradient id="paint3_linear" x1="346" y1="34.5" x2="335.877" y2="40.8028" gradientUnits="userSpaceOnUse">
                          <stop stop-color="#FAFAFA"/>
                          <stop offset="1" stop-color="#E8E8E8"/>
                        </linearGradient>
                        <linearGradient id="paint4_linear" x1="346" y1="120.5" x2="335.877" y2="126.803" gradientUnits="userSpaceOnUse">
                          <stop stop-color="#FAFAFA"/>
                          <stop offset="1" stop-color="#E8E8E8"/>
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>
                <div class="tada-full-modal-form-submit">
                  <button class="form-control tada_full_modal_btn_access" style="background-color: ${theme_first_color}">Access now</button>
                  <p style="text-decoration: underline; color: ${theme_second_color}" class="tada-full-modal-btn-no-thank-you">No, thank you</p>
                  <button class="tada-full-modal-btn-close" data-dismiss="modal" style="display: none;"></button>
                  <button type="button" class="close tada-full-modal-btn-close-fake" aria-label="Close" style="display: none;"></button>
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
                <div class="tada-game-modal-heading-mobile">
                  <h3 class="tada-game-modal-heading-1">Spin to win a BIG prize right now!  🎁</h3>
                  <div class="tada-game-modal-btn-close-container btn-close-mobile">
                    <button type="button" class="close tada-game-modal-btn-close-fake" aria-label="Close">
                      <div class="tada-dialog-btn-close-inner">
                        <span aria-hidden="true" style="color: ${theme_first_color}"> &times;</span>
                      </div>
                    </button>
                  </div>
                </div>
                <p class="tada-game-modal-heading-2">You have a chance to win a nice big fat discount.<br class="tada-full-modal-title-br"/> Are you feeling lucky? Give it a spin. If you win, you can claim your coupon for 15 mins only!</p>
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
                <input type="email" class="form-control" id="tada_game_modal_email" style="border-color: ${theme_second_color}" placeholder="Enter your email address" required>
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
                    <div class="tada-progress-value" style="width:40%; background-color: ${theme_first_color};">
                    </div>
                  </div>
                  <p class="tada-progress-bar-text" style="display: ${progress_bar ? 'block' : 'none'}"><span id="tada-progressbar-percent-number">70</span>% offers claimed. Hurry up!</p>
                </div>

                <div class="tada-game-result-panel" style="display: none; background-image: url(${widget_url}/game-modal/result-back.png)">
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
                <div class="tada-game-modal-btn-close-container">
                  <span>No, I don't feel lucky</span> 
                  <button type="button" class="close tada-game-modal-btn-close-fake" aria-label="Close">
                    <div class="tada-dialog-btn-close-inner">
                      <span aria-hidden="true" style="color: ${theme_first_color}"> &times;</span>
                    </div>
                  </button>
                </div>
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
