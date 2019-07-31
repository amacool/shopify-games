const dotenv = require('dotenv');
dotenv.config();

const { API_VERSION } = process.env;
const AppSetting = require('../models/AppSetting');

async function processPayment(ctx, next) {
  if (ctx.query.charge_id) {
    const chargeUrl = `admin/api/${API_VERSION}/recurring_application_charges`;
    const options = {
      credentials: 'include',
      headers: {
        'X-Shopify-Access-Token': ctx.session.accessToken,
        'Content-Type': 'application/json'
      }
    };
    const optionsWithGet = { ...options, method: 'GET' };
    const optionsWithPost = { ...options, method: 'POST' };
    fetch(
      `https://${ctx.session.shop}/${chargeUrl}/${ctx.query.charge_id}.json`,
      optionsWithGet
    )
      .then(response => response.json())
      .then(myJson => {
        if (myJson.recurring_application_charge.status === 'accepted') {
          const stringifyMyJSON = JSON.stringify(myJson);
          const optionsWithJSON = { ...optionsWithPost, body: stringifyMyJSON };
          fetch(`https://${ctx.session.shop}/${chargeUrl}/${ctx.query.charge_id}/activate.json`, optionsWithJSON)
            .then((response) => response.json())
            .catch((error) => console.log('error', error));
        } else { return ctx.redirect('/'); }
      });

    ctx.body = "success";
  } else {
    await next();
  }
}

async function addDiscount(ctx, next) {
  console.log('called add Discount');
  var data = '';
  console.log(ctx.req);
  if(ctx.request.body.discount_code && ctx.request.body.discount_type) {
    const options = {
      credentials: 'include',
      headers: {
        'X-Shopify-Access-Token': ctx.session.accessToken,
        'Content-Type': 'application/json'
      }
    }

    const optionsWithGet = { ...options, method: 'GET' };
    const optionsWithPost = { ...options, method: 'POST' };
    const priceRuleUrl = `admin/api/${API_VERSION}/price_rules.json`;
    var price_rule = {
      target_type: 'line_item',
      target_selection: 'all',
      allocation_method: 'across',
      customer_selection: 'all',
      start_time: new Date().toISOString(),
      usage_limit : 1
    };

    if(ctx.request.body.discount_type == "25% Discount") {
      price_rule.title = '25OffTada';
      price_rule.value_type = 'percentage';
      price_rule.value = '-25.00';
    } else if(ctx.request.body.discount_type == '15% Discount') {
      price_rule.title = '15OffTada';
      price_rule.value_type = 'percentage';
      price_rule.value = '-15.00';
    } else if(ctx.request.body.discount_type == '$10 Cash') {
      price_rule.title = '10CashTada'
      price_rule.value_type = 'fixed_amount';
      price_rule.value = '-10.00';
    } else if(ctx.request.body.discount_type == 'Free Shipping') {
      price_rule.target_type = 'shipping_line';
      price_rule.allocation_method = 'each';
      price_rule.value_type = 'percentage';
      price_rule.value = '-100.00';
      price_rule.title = 'FreeShippingTada';
    }
    var optionsWithJSON = { ...optionsWithPost, body: JSON.stringify({price_rule: price_rule}) };
    fetch(`https://${ctx.session.shop}/${priceRuleUrl}`, optionsWithJSON)
      .then(response => response.json())
      .then(json => {
        console.log(json);
        const discountUrl = `admin/api/${API_VERSION}/`;
      })
      .then(error => console.log('error', error));
      return ctx.redirect('/');
  } else {
    await next();
  }
}

async function sendWidget(ctx, next) {
  ctx.body = `<div id="tada_app_widget">
          <div id="spinny_box"
              style="display: flex;width: 100%;height: 100%;display: none;top: 0;position: absolute;left: 0;justify-content: center;align-items: center;">
              <div style="background-color: #00000077;width: 100%;height: 100%;position: absolute;z-index: 9998;"></div>
              <script src="/apps/tadaApp/Winwheel.js"></script>
              <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/2.1.3/TweenMax.min.js"></script>
              <div id="spinny"
                  style="background-color: white;border: 1px solid black;display: block;padding: 20px; text-align: center;position: absolute;z-index:9999;">
                  <img src="/apps/tadaApp/logo.png" class="tada-app-logo" />
                  <h1> Spin to win a BIG prize! 🎁 </h1>
                  <div>Enter your email address to find out if you're the winner</div>
                  <div style="display: flex; justify-content: center; align-items: center;">
                      <input type="email" name="email" id="spin_email" placeholder="Enter your email"
                          style="display: inline-block;" required>
                      <input type="button" name="spin" value="Spin" onclick="startSpinning()" style="display: inline-block;">
                  </div>
                  <div style="text-align: center; color: red; display: none;" id="tada_email_validate">
                    You need to input valid email address!
                  </div>
                  <div style="display: flex; justify-content: center; align-items: center;">
                      <canvas id='canvas' width="360" height="360" class="spinny-widget" data-responsiveScaleHeight="true" data-responsiveMinWidth="100">
                          Canvas not supported, use another browser.
                      </canvas>
                      <img src="/apps/tadaApp/arrow.jpg" class="tada-arrow" />
                  </div>
              </div>
              <div id="result_box">
                  <div>
                      <p id="tada_result_label">Tada, you've won <span id="tada_discount_type"></span>!</p>
                      <div id="tada_result_coupon">
                          <p>Coupon Code: <span id="tada_coupon"></span></p>
                          <p>This coupon code will expire in 30 mins!</p>
                      </div>
                      <button type="button" onclick="hideModal()" class="hide-btn-tada">OK</button>
                  </div>
              </div>
          </div>
          <input style="position: absolute; bottom: 20px; right: 100px; z-index: 9990;" type="button" name="SpinBox" class="open-spinny-btn" onclick="showSpinny()"
              value="Open">
          <script>
              let theWheel = new Winwheel({
                  'numSegments': 6,         // Number of segments
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
                      [
                          { 'fillStyle': '#eae56f', 'text': '25% Discount' },
                          { 'fillStyle': '#89f26e', 'text': '$10 Cash' },
                          { 'fillStyle': '#7de6ef', 'text': 'No Lucky' },
                          { 'fillStyle': '#e7706f', 'text': 'Free Shipping' },
                          { 'fillStyle': '#eae56f', 'text': 'Almost...' },
                          { 'fillStyle': '#89f26e', 'text': '15% Discount' }
                      ],
                  'animation':               // Definition of the animation
                  {
                      'type': 'spinToStop',
                      'duration': 3,
                      'spins': 5,
                      'callbackFinished': alertPrize
                  }
              });
            
            window.onload = function() {
            }

              function validateEmail(email) {
                var re = /^\\w+([\\.-]?\\w+)*@\\w+([\\.-]?\\w+)*(\\.\\w{2,3})+$/;
                return re.test(email);
              }

              function startSpinning() {
                  var email = document.getElementById("spin_email").value;
                  if(!validateEmail(email)) {
                    document.getElementById('tada_email_validate').style.display = 'block';
                  }
                  else {
                    document.getElementById('tada_email_validate').style.display = 'none';
                      theWheel.startAnimation();
                  }
              }

              function showSpinny() {
                  var box = document.getElementById('spinny_box');
                  document.getElementById('tada_email_validate').style.display = 'none';

                  if (box.style.display == '' || box.style.display == 'none') {
                      box.style.display = 'flex';
                      document.getElementById('spin_email').value = "";
                  }
                  else {
                      box.style.display = 'none';
                  }
              }

              function alertPrize(indicatedSegment)
              {
                  // Do basic alert of the segment text.
                  var discount_type = indicatedSegment.text;
                  console.log(discount_type);
                  if( discount_type == "No Lucky") {
                      document.getElementById('tada_result_coupon').style.display = 'none';
                  } else {
                      var randomCoupon = makeid();
                      document.getElementById('tada_discount_type').innerText = indicatedSegment.text;
                      document.getElementById('tada_result_coupon').style.display = 'block';
                      document.getElementById('tada_coupon').innerText = randomCoupon;
                      var xmlHttp = new XMLHttpRequest();
                      xmlHttp.onreadystatechange = function() {
                        if(xmlHttp.readyState == 4 && xmlHttp.status == 200) {
                          console.log(xmlHttp.responseText);
                          alert(xmlHttp.responseText);
                        }
                      }
                      xmlHttp.open('POST', '/apps/tadaApp/addDiscount');
                      xmlHttp.send(JSON.stringify({
                        discount_type: indicatedSegment.text,
                        discount_code: randomCoupon
                      }));
                  }
                  document.getElementById('spinny').style.display = 'none';
                  document.getElementById('result_box').style.display = 'block';
              }

              function makeid(length = 12) {
                  var result           = '';
                  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                  var charactersLength = characters.length;
                  for ( var i = 0; i < length; i++ ) {
                      result += characters.charAt(Math.floor(Math.random() * charactersLength));
                  }
                  return result;
              }

              function hideModal() {
                  document.getElementById('result_box').style.display = 'none';
                  document.getElementById('spinny').style.display = 'block';
                  showSpinny();
              }
          </script>
          <style>
              .spinny-widget {
                  margin-top: 30px;
              }

              .tada-arrow {
                  display: inline-block;
                  width: 4vw;
                  max-width: 80px;
              }
              
              .hide-btn-tada {
                  background: black;
                  width: 100px;
                  height: 40px;
                  border-radius: 10px;
                  font-size: 20px;
                  color: white;
              }

              #result_box {
                  z-index: 99999;
                  display: none;
                  position: absolute;
                  width: 80%;
                  text-align: center;
                  justify-content: center;
                  align-items: center;
                  background: white;
              }

              .open-spinny-btn {
                  width: 100px;
                  height: 30px;
                  background-color: blue;
                  color: white;
                  border-radius: 10px;
              }

              .tada-app-logo {

              }
            
            @media (max-width: 400px) {
              #spinny {
                padding: 0px;
              }
            }
          </style>
        </div>`;
}

async function changeDisplaySetting(ctx, next) {
  var body = ctx.request.body;
  const {shop, accessToken} = ctx.session;
  var appSetting = await AppSetting.findOne({shop: shop}, (error, setting) => {
    if(error) {
      console.log(error);
      return;
    }
    return setting;
  });

  if(body.fromPage && body.toPage) {
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
      for(var i=0; i<json.themes.length; i++) {
        if(json.themes[i].role == 'main') {
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
    .then(async function(json){
      var pageContent = json.asset.value;
      pageContent = changeDisplayPage(pageContent, body.toPage, appSetting);
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
        console.log(json);
        return json;
      })
    });
  } else {
    await next();
  }
}

function changeDisplayPage(pageContent, toPage) {
  var el = document.createElement('html');
  el.innerHTML = pageContent;
  var widget = el.getElementsByClassName('tada-app-content')[0];

  if(toPage == 'product') {
    widget.innerHTML = `<script>
      var pathname = window.location.pathname;
      if(pathname.indexOf(${toPage}) > -1) {
        $.ajax({
          url: '/apps/tadaApp/getWidget',
          type: 'GET',
          success: function(html) {
            document.body.appendChild(html);
          }
        });
      }
    </script>`;
  } else if(toPage == 'all') {
    widget.innerHTML = `<script>
      var pathname = window.location.pathname;
        $.ajax({
          url: '/apps/tadaApp/getWidget',
          type: 'GET',
          success: function(html) {
            document.body.appendChild(html);
          }
        });
    </script>`;
  } else if(toPage == 'none') {
    widget.innerHTML = '';
  }
  return el.innerHTML;
}

module.exports.processPayment = processPayment;
module.exports.addDiscount = addDiscount;
module.exports.sendWidget = sendWidget;
module.exports.changeDisplaySetting = changeDisplaySetting;