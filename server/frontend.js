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
  const widgetSetting = await Widget.findOne({id: widget_id});
  const shopSetting = await Shop.findOne({id: widgetSetting.shop_id});

  var today = new Date();
  var expired_at = new Date(today.getTime() + diff*60000);
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
  if(widget.type == 0) {
    var id = widget.id;
    html = `<div id="tada_app_widget">
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
      var exitIntentFlag = ${ widget.exitIntent};
      var widgetId = '${id}';
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
        setCookie('tada_${id}_modalClose', 1, 120);
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
              var discount_type = '';
              var discount_value = 0;
              if(indicatedSegment.text != "Free Shipping"){
                if(indecatedSegment.text.indexOf('%') > -1) {
                  discount_type = 'percentage';
                  discount_value = 1 * indicatedSegment.text.split('%')[0];
                } else {
                  discount_type = 'fixed_amount';
                  var temp = indicatedSegment.text.split(' ')[0];
                  temp = temp.substring(1, temp.length);
                  discount_value = 1 * temp;
                }
              } else {
                discount_type = "Free Shipping";
              }
              $.ajax({
                  url: 'https://app.trytada.com/addDiscount',
                  type: 'POST',
                  contentType: 'application/json',
                  data: JSON.stringify({
                      discount_code: randomCoupon,
                      discount_type: discount_type,
                      discount_value: discount_value,
                      widget_id: widgetId
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
              setCookie('tada_${id}_timeToken', now, 120);
              setCookie('tada_${id}_Coupon', randomCoupon, 1);
              setCookie('tada_${id}_DiscountType', indicatedSegment.text, 1);
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
        $('#tada_modal_coupon').html(getCookie('tada_${id}_Coupon'));
        $('#tada_modal_discount_type').html(getCookie('tada_${id}_DiscountType'));
        document.getElementById('tadaCouponModal').style.display = 'flex';
      });

      $('#tadaclockdiv img').on('click', function() {
        $('#tadaclockdiv').hide();
        setCookie('tada_${id}_clockClose', 1, 120);
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
          var tadaTokenDiff = (new Date().getTime()) - getCookie('tada_${id}_timeToken');
          console.log('token diff - ', tadaTokenDiff);
          if(tadaTokenDiff > 86400000 || getCookie('tada_${id}_timeToken')==null) {
              clearInterval(counter);
              eraseCookie('tada_${id}_clockClose');

              $.getScript('https://app.trytada.com/Winwheel.js', function(data, textStatus, jqxhr) {
                if(jqxhr.status == 200) {
                  if(getCookie('tada_${id}_modalClose') == null) {
                    tadaCallback();
                  }
                }
              });
              var tadaCallback = function() {
                  if(exitIntentFlag && !detectmob()) {
                    $(document).ready(function() {
                      $(document).mouseleave(function(e) {
                        if(e.clientY < 0) {
                          var tadaTokenDiff = (new Date().getTime()) - getCookie('tada_${id}_timeToken');
                          
                            if(tadaTokenDiff > 86400000) {
                                clearInterval(counter);
                                ${generateDiscountItems(widget)}
                                if(getCookie('tada_${id}_modalClose') == null && getCookie('tada_${id}_ExitIntent') == null) {
                                  var box = document.getElementById('spinny_box');
                                  document.getElementById('tada_email_validate').style.display = 'none';
                    
                                  if (box.style.display == '' || box.style.display == 'none') {
                                    setCookie('tada_${id}_ExitIntent', 1, ${widget.exitIntentTime});
                                  }
                                  setTimeout(showExitSpinny, 0);
                                }
                                return;
                            }
                        }
                      });
                    });
                  } else {
                    ${generateDiscountItems(widget)}
                    setTimeout(showSpinny, ${ widget.timer * 1000});
                  }
              }
              return;
          }

          let timeRemaining = parseInt((86400000 - tadaTokenDiff) / 1000);

          if (timeRemaining >= 0 && getCookie('tada_${id}_clockClose')==null) {
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
          background-color: ${widget.style}
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
