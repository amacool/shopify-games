const dotenv = require('dotenv');
const moment = require('moment');
const cheerio = require('cheerio');
const Entities = require('html-entities').XmlEntities;
dotenv.config();

const { API_VERSION, TUNNEL_URL } = process.env;
const AppSetting = require('../models/AppSetting');

deparam = function (querystring) {
  // remove any preceding url and split
  querystring = querystring.substring(querystring.indexOf('?')+1).split('&');
  var params = {}, pair, d = decodeURIComponent;
  // march and parse
  for (var i = querystring.length - 1; i >= 0; i--) {
    pair = querystring[i].split('=');
    params[d(pair[0])] = d(pair[1] || '');
  }

  return params;
};

async function removeExpiredCode() {
  console.log('remove expired code');
  const appSettings = await AppSetting.find();

  if(appSettings && appSettings.length > 0) {
    appSettings.map(appSetting => {
      if(appSetting.install == 1 ) {
        const priceRuleUrl = `admin/api/${API_VERSION}/price_rules.json`;
        const options = {
          credentials: 'include',
          headers: {
            'X-Shopify-Access-Token': appSetting.accessToken,
            'Content-Type': 'application/json'
          }
        };
        const optionsWithGet = { ...options, method: 'GET' };

        fetch(`https://${appSetting.shop}/${priceRuleUrl}`, optionsWithGet)
        .then(response => response.json())
        .then(json => {
          if(json.errors) {
            return;
          }

          var price_rules = json.price_rules;
          price_rules.map(price_rule => {
            var ends_at = new Date(price_rule.ends_at);
            var now = new Date();
            if(ends_at < now) {
              // var discountUrl = `admin/api/${API_VERSION}/`
              console.log('delete price rule');
              var deleteUrl = `admin/api/${API_VERSION}/price_rules/${price_rule.id}.json`;
              const optionsWithDelete = { ...options, method: 'DELETE' };

              fetch(`https://${appSetting.shop}/${deleteUrl}`, optionsWithDelete);
            }
          });
        })
      }
    })
  }
}

async function processPayment(ctx, next) {
  // const params = deparam(ctx.request.url);
  console.log('/ request - ', ctx.request);
  const shop = ctx.cookies.get('shopOrigin');
  ctx.cookies.set("shopOrigin", shop, { httpOnly: false });
  var appSetting = await AppSetting.findOne({shop: shop});
  var accessToken = '';
  if(appSetting) {
    accessToken = appSetting.accessToken;
  }
  if (ctx.query.charge_id) {
    const chargeUrl = `admin/api/${API_VERSION}/recurring_application_charges`;
    const options = {
      credentials: 'include',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    };
    const optionsWithGet = { ...options, method: 'GET' };
    const optionsWithPost = { ...options, method: 'POST' };
    await fetch(
      `https://${shop}/${chargeUrl}/${ctx.query.charge_id}.json`,
      optionsWithGet
    )
      .then(response => response.json())
      .then(myJson => {
        if (myJson.recurring_application_charge.status === 'accepted') {
          const stringifyMyJSON = JSON.stringify(myJson);
          const optionsWithJSON = { ...optionsWithPost, body: stringifyMyJSON };
          fetch(`https://${ctx.session.shop}/${chargeUrl}/${ctx.query.charge_id}/activate.json`, optionsWithJSON)
            .then((response) => response.json())
            .then((json) => {
		console.log(json);
              const id = json.recurring_application_charge.id;
              appSetting.chargeId = id;
              appSetting.pricingPlan = 1;
              appSetting.save();
              return ctx.redirect(json.recurring_application_charge.return_url);
            })
            .catch((error) => console.log('error', error));
        } else { return ctx.redirect('/'); }
      });
    return ctx.redirect('/');
    // ctx.body = 'success';
  } else if(ctx.query.hmac) {
    await next();
    // return ctx.redirect('/');
  } else {
    return ctx.redirect('/loading');
  }
}

async function freeMembership(ctx, next) {
  var param;
  var shop = '';
  if(ctx.request.header.referer) {
    param = deparam(ctx.request.header.referer);
    shop = param.shop;
  } else {
    shop = getCookie('shopOrigin', ctx.request.header.cookie);
  }
  ctx.cookies.set("shopOrigin", shop, { httpOnly: false });
  var appSetting = await AppSetting.findOne({shop: shop});
  const accessToken = appSetting.accessToken;
  const options = {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json'
    }
  }

  await fetch(`https://${shop}/admin/api/${API_VERSION}/recurring_application_charges/${appSetting.charge_id}`, options)
    .then((response) => {
      console.log('success');
      appSetting.pricingPlan = 0;
      appSetting.chargeId = '';
      appSetting.save();
    })
    .catch((error) => console.log('error', error));

  ctx.body = {success: true};
}

async function premiumMembership(ctx, next) {
  var param;
  var shop = '';
  if(ctx.request.header.referer) {
    param = deparam(ctx.request.header.referer);
    shop = param.shop;
  } else {
    shop = getCookie('shopOrigin', ctx.request.header.cookie);
  }
  var appSetting = await AppSetting.findOne({shop: shop});
  const accessToken = appSetting.accessToken;
  ctx.cookies.set("shopOrigin", shop, { httpOnly: false });
  const stringifiedBillingParams = JSON.stringify({
      recurring_application_charge: {
          name: 'Recurring charge',
          price: 19.99,
          return_url: TUNNEL_URL,
          test: true,
      },
  });

  const options = {
    method: 'POST',
    body: stringifiedBillingParams,
    credentials: 'include',
    headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
    }
  };

  const confirmationURL = await fetch(
      `https://${shop}/admin/api/${API_VERSION}/recurring_application_charges.json`, options,
  )
      .then((response) => response.json())
      .then((jsonData) => {
        return jsonData.recurring_application_charge.confirmation_url;
      })
      .catch((error) => console.log('error', error));
  ctx.body = { url: confirmationURL };
  // ctx.redirect(confirmationURL);
}

async function addDiscount(ctx, next) {
  var data = '';
  if(ctx.request.body.discount_code && ctx.request.body.discount_type) {
    var today = new Date();
    var tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const priceRuleUrl = `admin/api/${API_VERSION}/price_rules.json`;
    var price_rule = {
      target_type: 'line_item',
      target_selection: 'all',
      allocation_method: 'across',
      customer_selection: 'all',
      starts_at: today.toISOString(),
      ends_at: tomorrow.toISOString(),
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
    var accessToken = '';
    const shop = ctx.request.body.shop;
    ctx.cookies.set("shopOrigin", shop, { httpOnly: false });
    await AppSetting.find({shop: shop}, (err, setting) => {
      if(err) {
        return;
      }
      accessToken = setting[0].accessToken;
      const options = {
        credentials: 'include',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      }
  
      const optionsWithGet = { ...options, method: 'GET' };
      const optionsWithPost = { ...options, method: 'POST' };
      var optionsWithJSON = { ...optionsWithPost, body: JSON.stringify({price_rule: price_rule}) };
      
      fetch(`https://${shop}/${priceRuleUrl}`, optionsWithJSON)
        .then(response => response.json())
        .then(json => {
          if(json.errors) {
            return;
          }
  
          const discountUrl = `admin/api/${API_VERSION}/price_rules/${json.price_rule.id}/discount_codes.json`;
          const optionsDiscount = { ...optionsWithPost, body: JSON.stringify({'discount_code': {
            'code': ctx.request.body.discount_code
          }})};
  
          fetch(`https://${shop}/${discountUrl}`, optionsDiscount)
          .then(response => response.json())
          .then(json => {
          })
        });
    });
    
    ctx.body = 'success';
  } else {
    ctx.body = 'error';
    ctx.status = 400;
  }
}

async function uninstall(ctx, next) {
  const shop = ctx.state.webhook.domain;
  await AppSetting.find({shop: shop}, (err, shop) => {
    if(err) {
	console.log(err);
	return;
    }
    if(shop.length > 0) {
	shop[0].install = 0;
	shop[0].save();
    }
  });
}

async function sendWidget(ctx, next) {
  const shop = ctx.request.body.shop;
  ctx.cookies.set("shopOrigin", shop, { httpOnly: false });
  const timeToken = ctx.request.body.timeToken;
  const appSetting = await AppSetting.findOne({shop: shop}, (error, setting) => {
    if(error) {
      return next();
    }
    return setting;
  });

  var id = appSetting.id;

  var ms = 0;
  if(timeToken) {
    ms = moment().diff(moment.unix(timeToken/1000));
  }
  ms /= 1000;
  if(appSetting.install == 1) {
    if(timeToken == null || appSetting.frequency == 'every' || (appSetting.frequency == 'period' && ms > appSetting.displayFrequency) ) {
      ctx.body = `<div id="tada_app_widget">
      <div id="spinny_box"
          style="display: flex;width: 100%;height: 100%;display: none;top: 0;position: fixed;z-index: 9999;left: 0;justify-content: center;align-items: center;">
          <div style="background-color: #00000077;width: 100%;height: 100%;position: absolute;z-index: 9998;"
              id="tada_modal_background"></div>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/2.1.3/TweenMax.min.js"></script>
          <div id="spinny"
              style="background-color: white;border: 1px solid black;display: block;padding: 20px; text-align: center;position: absolute;z-index:9999;">
              <img src="https://app.trytada.com/close.png" id="modal_close" />
              <img src="https://app.trytada.com/logo.png" class="tada-app-logo" />
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
                  <canvas id='canvas' width="360" height="360" class="spinny-widget" data-responsiveScaleHeight="true"
                      data-responsiveMinWidth="100">
                      Canvas not supported, use another browser.
                  </canvas>
                  <img src="https://app.trytada.com/arrow.jpg" class="tada-arrow" />
              </div>
          </div>
          <div id="result_box">
              <div>
                  <p id="tada_result_label">Tada, you've won <span id="tada_discount_type"></span>!</p>
                  <div id="tada_result_coupon">
                      <p>Coupon Code: <span id="tada_coupon"></span></p>
                      <p>This coupon code will expire in 1 day!</p>
                  </div>
                  <button type="button" onclick="hideModal()" class="hide-btn-tada">OK</button>
              </div>
          </div>
      </div>
      <div id="tadaclockdiv">
          <img src="https://app.trytada.com/close.png" id="clock_close" />
          <div>
            <span class="hours"></span>
          </div>
          :
          <div>
            <span class="minutes"></span>
          </div>
          :
          <div>
            <span class="seconds"></span>
          </div>
      </div>
      <div id="tadaCouponModal">
        <div style="background-color: #00000077;width: 100%;height: 100%;position: absolute;z-index: 9998;"
                id="tada_modal_background"></div>
        <div id="tada_modal_result_box">
          <div>
              <p id="tada_modal_result_label">You've won <span id="tada_modal_discount_type"></span>!</p>
              <div id="tada_modal_result_coupon">
                  <p>Coupon Code: <span id="tada_modal_coupon"></span></p>
              </div>
              <p>Your coupon code will expire in <span id="tada_modal_expire"></span></p>
              <button type="button" onclick="hideCouponModal()" class="hide-btn-tada">OK</button>
          </div>
        </div>
      </div>
      <script>
      let theWheel;
          var exitIntentFlag = ${ appSetting.exitIntent };
          function validateEmail(email) {
              var re = /^\\w+([\\.-]?\\w+)*@\\w+([\\.-]?\\w+)*(\\.\\w{2,3})+$/;
              return re.test(email);
          }

          function startSpinning() {
              var email = document.getElementById("spin_email").value;
              
              var domain = email.split('@')[1];
              if (!validateEmail(email)) {
                  document.getElementById('tada_email_validate').style.display = 'block';
              }
              else {
                $.get('https://domain-availability-api.whoisxmlapi.com/api/v1?apiKey=at_de2sXtsBZn3RBpC9TBnrQqH9fZLe7&domainName=' + domain, function(data) {
                  if(data.DomainInfo.domainAvailability == "UNAVAILABLE") {
                    document.getElementById('tada_email_validate').style.display = 'none';
                    theWheel.startAnimation();
                  } else {
                    document.getElementById('tada_email_validate').style.display = 'block';
                  }
                });
              }
          }

          $('#modal_close').on('click', function() {
            showSpinny();
            setCookie('tada_${id}modalClose', 1, 120);
          });

          function showSpinny() {
              var box = document.getElementById('spinny_box');
              document.getElementById('tada_email_validate').style.display = 'none';

              if (box.style.display == '' || box.style.display == 'none') {
                  box.style.display = 'flex';
                  $('body').addClass('tada-modal-open');
                  document.getElementById('spin_email').value = "";
              }
              else {
                  $('body').removeClass('tada-modal-open');
                  box.style.display = 'none';
              }

          }

          function showExitSpinny() {
            var box = document.getElementById('spinny_box');
            document.getElementById('tada_email_validate').style.display = 'none';

            box.style.display = 'flex';
            $('body').addClass('tada-modal-open');
            document.getElementById('spin_email').value = "";
          }

          $('#tada_modal_background').on('click', function () {
              showSpinny();
          });

          var counter;

          function alertPrize(indicatedSegment) {
              // Do basic alert of the segment text.
              var discount_type = indicatedSegment.text;
              console.log(discount_type);
              if (discount_type == "No Lucky") {
                  document.getElementById('tada_result_coupon').style.display = 'none';
              } else {
                  var randomCoupon = makeid();
                  document.getElementById('tada_discount_type').innerText = indicatedSegment.text;
                  document.getElementById('tada_result_coupon').style.display = 'block';
                  document.getElementById('tada_coupon').innerText = randomCoupon;
                  $.ajax({
                      url: 'https://app.trytada.com/addDiscount',
                      type: 'POST',
                      contentType: 'application/json',
                      data: JSON.stringify({
                          discount_code: randomCoupon,
                          discount_type: indicatedSegment.text,
        shop: window.location.hostname
                      }),
                      success: function (resp) {
                          console.log(resp);
                      },
                      error: function () {
                          console.log('error');
                      }
                  });
                  var d = new Date();
                  var now = d.getTime();
                  setCookie('tada_${id}timeToken', now, 120);
                  setCookie('tada_${id}Coupon', randomCoupon, 1);
                  setCookie('tada_${id}DiscountType', indicatedSegment.text, 1);
                  counter = setInterval(timer, 1000);

              }
              document.getElementById('spinny').style.display = 'none';
              document.getElementById('result_box').style.display = 'block';
          }

          function makeid(length = 12) {
              var result = '';
              var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
              var charactersLength = characters.length;
              for (var i = 0; i < length; i++) {
                  result += characters.charAt(Math.floor(Math.random() * charactersLength));
              }
              return result;
          }

          function hideModal() {
              document.getElementById('result_box').style.display = 'none';
              document.getElementById('spinny').style.display = 'block';
              showSpinny();
          }

          function setCookie(name, value, mins) {
              var expires = "";
              if (mins) {
                  var date = new Date();
                  date.setTime(date.getTime() + (mins * 60 * 1000));
                  expires = "; expires=" + date.toUTCString();
              }
              document.cookie = name + "=" + (value || "") + expires + "; path=/";
          }

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

          function eraseCookie(name) {
              document.cookie = name + '=; Max-Age=-99999999;';
          }

          counter = setInterval(timer, 1000);
    
          $('#tadaclockdiv div').on('click', function() {
            $('#tada_modal_coupon').html(getCookie('tada_${id}Coupon'));
            $('#tada_modal_discount_type').html(getCookie('tada_${id}DiscountType'));
            document.getElementById('tadaCouponModal').style.display = 'flex';
          });

          $('#tadaclockdiv img').on('click', function() {
            $('#tadaclockdiv').hide();
            setCookie('tada_${id}clockClose', 1, 120);
          });
    
          function hideCouponModal() {
            document.getElementById('tadaCouponModal').style.display = 'none';
          }

          function detectmob() { 
            if( navigator.userAgent.match(/Android/i)
            || navigator.userAgent.match(/webOS/i)
            || navigator.userAgent.match(/iPhone/i)
            || navigator.userAgent.match(/iPad/i)
            || navigator.userAgent.match(/iPod/i)
            || navigator.userAgent.match(/BlackBerry/i)
            || navigator.userAgent.match(/Windows Phone/i)
            ){
               return true;
             }
            else {
               return false;
             }
           }
    
          function timer() {
              var tadaTokenDiff = (new Date().getTime()) - getCookie('tada_${id}timeToken');
    
              if(tadaTokenDiff > 86400000 || getCookie('timeToken')==null) {
                  clearInterval(counter);
                  eraseCookie('tada_${id}clockClose');

                  $.getScript('https://app.trytada.com/Winwheel.js', function(data, textStatus, jqxhr) {
                    if(jqxhr.status == 200) {
                      if(getCookie('tada_${id}modalClose') == null) {
                        tadaCallback();
                      }
                    }
                  });
                  var tadaCallback = function() {
                      theWheel = new Winwheel({
                          'numSegments': 4,         // Number of segments
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
                                  { 'fillStyle': '#e7706f', 'text': 'Free Shipping' },
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
                      if(exitIntentFlag && !detectmob()) {
                        $(document).ready(function() {
                          $(document).mouseleave(function(e) {
                            if(e.clientY < 0) {
                              var tadaTokenDiff = (new Date().getTime()) - getCookie('tada_${id}timeToken');
                              theWheel = new Winwheel({
                                'numSegments': 4,         // Number of segments
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
                                        { 'fillStyle': '#e7706f', 'text': 'Free Shipping' },
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
                                if(tadaTokenDiff > 86400000) {
                                    clearInterval(counter);
                                    if(getCookie('tada_${id}modalClose') == null && getCookie('tada_${id}ExitIntent') == null) {
                                      var box = document.getElementById('spinny_box');
                                      document.getElementById('tada_email_validate').style.display = 'none';
                        
                                      if (box.style.display == '' || box.style.display == 'none') {
                                        setCookie('tada_${id}ExitIntent', 1, ${appSetting.exitIntentTime});
                                      }
                                      setTimeout(showExitSpinny, 0);
                                    }
                                    return;
                                }
                            }
                          });
                        });
                      } else {
                        setTimeout(showSpinny, ${ appSetting.timer * 1000 });
                      }
                  }
                  return;
              }
    
              let timeRemaining = parseInt((86400000 - tadaTokenDiff) / 1000);
    
              if (timeRemaining >= 0 && getCookie('tada_${id}clockClose')==null) {
                  $('#tadaclockdiv').show();
                  days = parseInt(timeRemaining / 86400);
                  timeRemaining = (timeRemaining % 86400);
                  
                  hours = parseInt(timeRemaining / 3600);
                  timeRemaining = (timeRemaining % 3600);
                  
                  minutes = parseInt(timeRemaining / 60);
                  timeRemaining = (timeRemaining % 60);
                  
                  seconds = parseInt(timeRemaining);
                  if(seconds < 10) {
                    seconds = '0' + seconds;
                  }
                  
                  $('#tadaclockdiv').find('.hours').html(hours);
                  $('#tadaclockdiv').find('.minutes').html(minutes);
                  $('#tadaclockdiv').find('.seconds').html(seconds);
                  $('#tada_modal_expire').html(hours+':'+minutes+':'+seconds);
              } else {
                  $('#tadaclockdiv').hide();
              }
          }
          </script>
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

          body.tada-modal-open {
              overflow: hidden;
          }

          #modal_close {
            width: 20px;
            float: right;
            margin-top: -15px;
            margin-right: -15px;
            cursor: pointer;
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
              width: 150px;
          }

          #tadaclockdiv{
            position: fixed;
            top: 91vh;
            left: 100px;
            background-color: #1cab83;
            padding: 0px;
            font-family: sans-serif;
            color: #fff;
            display: none;
            font-weight: 100;
            text-align: center;
            font-size: 30px;
            cursor: pointer;
          }

          #clock_close {
            width: 20px;
            position: inherit;
            margin-left: 200px;
            margin-top: -15px;
            cursor: pointer;
          }
    
          #tadaclockdiv > div{
            width: 52px;
            padding: 6px;
            border-radius: 3px;
            background: #00BF96;
            display: inline-block;
          }
    
          #tadaclockdiv div > span{
            padding: 3px;
            width: 40px;
            border-radius: 3px;
            background: #00816A;
            display: inline-block;
          }
    
          #tada_modal_result_box {
            z-index: 99999;
            position: absolute;
            width: 80%;
            text-align: center;
            justify-content: center;
            align-items: center;
            background: white;
        }
    
        #tadaCouponModal {
	  z-index: 9999;
          position: fixed;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          display: none;
          justify-content: center;
          align-items: center;
        }

          @media (max-width: 400px) {
              #spinny {
                  padding: 0px;
              }
          }
      </style>
  </div>`;
    } else {
      ctx.body = `
      <div id="tadaclockdiv">
          <div>
            <span class="hours"></span>
          </div>
          :
          <div>
            <span class="minutes"></span>
          </div>
          :
          <div>
            <span class="seconds"></span>
          </div>
      </div>
      <div id="tadaCouponModal">
        <div style="background-color: #00000077;width: 100%;height: 100%;position: absolute;z-index: 9998;"
                id="tada_modal_background"></div>
        <div id="tada_modal_result_box">
          <div>
              <p id="tada_modal_result_label">You've won <span id="tada_modal_discount_type"></span>!</p>
              <div id="tada_modal_result_coupon">
                  <p>Coupon Code: <span id="tada_modal_coupon"></span></p>
              </div>
              <p>Your coupon code will expire in <span id="tada_modal_expire"></span></p>
              <button type="button" onclick="hideCouponModal()" class="hide-btn-tada">OK</button>
          </div>
        </div>
      </div>
      <style>
        #tadaclockdiv{
          position: fixed;
          top: 91vh;
          left: 100px;
          background-color: #1cab83;
          padding: 0px;
          font-family: sans-serif;
          color: #fff;
          display: none;
          font-weight: 100;
          text-align: center;
          font-size: 30px;
          cursor: pointer;
        }

        #tadaclockdiv > div{
          width: 52px;
          padding: 6px;
          border-radius: 3px;
          background: #00BF96;
          display: inline-block;
        }

        #clock_close {
          width: 20px;
          position: inherit;
          margin-left: 200px;
          margin-top: -15px;
          cursor: pointer;
        }

        #tadaclockdiv div > span{
          padding: 3px;
          width: 40px;
          border-radius: 3px;
          background: #00816A;
          display: inline-block;
        }

        #tadaclockdiv p {
          text-align: center;
        }

        #tada_modal_result_box {
          z-index: 99999;
          position: absolute;
          width: 80%;
          text-align: center;
          justify-content: center;
          align-items: center;
          background: white;
      }

      #tadaCouponModal {
        position: fixed;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        display: none;
        justify-content: center;
        align-items: center;
      }
        </style>
        <script>

        var counter = setInterval(timer, 1000);

        function setCookie(name, value, days) {
          var expires = "";
          if (days) {
              var date = new Date();
              date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
              expires = "; expires=" + date.toUTCString();
          }
          document.cookie = name + "=" + (value || "") + expires + "; path=/";
      }

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

      function eraseCookie(name) {
          document.cookie = name + '=; Max-Age=-99999999;';
      }

        $('#tadaclockdiv div').on('click', function() {
          $('#tada_modal_coupon').html(getCookie('tada_${id}Coupon'));
          $('#tada_modal_discount_type').html(getCookie('tada_${id}DiscountType'));
          document.getElementById('tadaCouponModal').style.display = 'flex';
        });

        $('#tadaclockdiv img').on('click', function() {
          $('#tadaclockdiv').hide();
          setCookie('tada_${id}clockClose', 1, 120);
        });

        function hideCouponModal() {
          document.getElementById('tadaCouponModal').style.display = 'none';
        }

        function timer() {
            var tadaTokenDiff = (new Date().getTime()) - getCookie('tada_${id}timeToken');

            if(tadaTokenDiff > 86400000) {
                clearInterval(counter);
                eraseCookie('tada_${id}clockClose');
                return;
            }

            let timeRemaining = parseInt((86400000 - tadaTokenDiff) / 1000);

              if (timeRemaining >= 0 && getCookie('tada_${id}clockClose')==null) {
                $('#tadaclockdiv').show();
                days = parseInt(timeRemaining / 86400);
                timeRemaining = (timeRemaining % 86400);
                
                hours = parseInt(timeRemaining / 3600);
                timeRemaining = (timeRemaining % 3600);
                
                minutes = parseInt(timeRemaining / 60);
                timeRemaining = (timeRemaining % 60);
                
                seconds = parseInt(timeRemaining);
                if(seconds < 10) {
                  seconds = '0' + seconds;
                }
                
                $('#tadaclockdiv').find('.hours').html(hours);
                $('#tadaclockdiv').find('.minutes').html(minutes);
                $('#tadaclockdiv').find('.seconds').html(seconds);
                $('#tada_modal_expire').html(hours+':'+minutes+':'+seconds);
            } else {
                $('#tadaclockdiv').hide();
            }
        }
        </script>`;
    }
  } else {
    ctx.body = ``;
  }
}

async function changeDisplaySetting(fromPage, toPage, shop, accessToken) {
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
      pageContent = changeDisplayPage(pageContent, toPage);
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

function changeDisplayPage(pageContent, toPage) {
  const entities = new Entities();
  const $ = cheerio.load(pageContent);

  if(toPage == 'product') {
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
                        var pathname = window.location.href;
                        if(pathname.indexOf('${toPage}') > -1) {
                            $.ajax({
                              url: 'https://app.trytada.com/getWidget',
                              type: 'post',
                              data: JSON.stringify({
                                timeToken: getCookie('timeToken'),
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
  } else if(toPage == 'all') {
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
                            timeToken: getCookie('timeToken'),
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
  } else if(toPage == 'none') {
    $('.tada-app-content').html(``);
  }
  return entities.decode($.html());
}


function getCookie(name, cookie) {
  var nameEQ = name + "=";
  var ca = cookie.split(';');
  for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

async function getSetting(ctx, next) {
  var param;
  var shop = '';
console.log(ctx.request.header);
  if(ctx.request.header.referer) {
    param = deparam(ctx.request.header.referer);
    shop = param.shop;
    if(shop == null) {
      shop = getCookie('shopOrigin', ctx.request.header.cookie);
    }
  } else {
    shop = getCookie('shopOrigin', ctx.request.header.cookie);
  }
  var shopSetting = await AppSetting.find({shop: shop});
  if(shopSetting[0]) {
    ctx.body = shopSetting[0];
  } else {
    ctx.body = 'error';
  }
}


async function saveSetting(ctx, next) {
  var param;
  var shop = '';
  if(ctx.request.header.referer) {
    param = deparam(ctx.request.header.referer);
    shop = param.shop;
  } else {
    shop = getCookie('shopOrigin', ctx.request.header.cookie);
  }
  var updateSetting = ctx.request.body.updateSetting;
  await AppSetting.find({shop: shop}, (err, setting) => {
    if(err) {
      console.log(err);
      return;
    }
    if(setting[0]) {
      if(setting[0].displaySetting != updateSetting.displaySetting) {
        changeDisplaySetting(setting[0].displaySetting, updateSetting.displaySetting, shop, setting[0].accessToken);
      }
      setting[0].displaySetting = updateSetting.displaySetting;
      setting[0].displayFrequency = updateSetting.displayFrequency;
      setting[0].timer = updateSetting.timer;
      setting[0].pricingPlan = updateSetting.pricingPlan;
      setting[0].frequency = updateSetting.frequency;
      setting[0].exitIntent = updateSetting.exitIntent;
      setting[0].exitIntentTime = updateSetting.exitIntentTime;
      setting[0].save();
    }
  });
  ctx.body = 'success';
}

module.exports.processPayment = processPayment;
module.exports.addDiscount = addDiscount;
module.exports.sendWidget = sendWidget;
module.exports.changeDisplaySetting = changeDisplaySetting;
module.exports.getSetting = getSetting;
module.exports.saveSetting = saveSetting;
module.exports.premiumMembership = premiumMembership;
module.exports.freeMembership = freeMembership;
module.exports.uninstall = uninstall;
module.exports.removeExpiredCode = removeExpiredCode;
