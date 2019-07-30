require('isomorphic-fetch');
const Koa = require('koa');
const send = require('koa-send');
const serve = require('koa-static');
const next = require('next');
const { default: createShopifyAuth } = require('@shopify/koa-shopify-auth');
const dotenv = require('dotenv');
const { verifyRequest } = require('@shopify/koa-shopify-auth');
const session = require('koa-session');
const bodyParser = require('koa-bodyparser');

dotenv.config();
const { default: graphQLProxy } = require('@shopify/koa-shopify-graphql-proxy');
const { ApiVersion } = require('@shopify/koa-shopify-graphql-proxy');
const Router = require('koa-router');
const { receiveWebhook, registerWebhook } = require('@shopify/koa-shopify-webhooks');
const { processPayment, addDiscount}  = require('./server/router');
const mongoose = require('mongoose');
const mongoUri = process.env.MONGO_URI;

const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const {
  SHOPIFY_API_SECRET_KEY,
  SHOPIFY_API_KEY,
  TUNNEL_URL,
  API_VERSION
} = process.env;

mongoose.connect(mongoUri);
mongoose.Promise = global.Promise;

app.prepare().then(() => {
  const server = new Koa();
  const router = new Router();
  server.use(bodyParser());
  server.use(session(server));
  server.use(serve(__dirname + '/public'));
  var options = {
    uri: mongoUri,
    mongodbOptions:{
        poolSize: 5,
        native_parser: true
    }
  };
  server.keys = [SHOPIFY_API_SECRET_KEY];

  router.get('/', processPayment);
  router.post('/addDiscount', addDiscount);

  server.use(
    createShopifyAuth({
      apiKey: SHOPIFY_API_KEY,
      secret: SHOPIFY_API_SECRET_KEY,
      scopes: ['read_products', 'write_products', 'read_themes', 'write_themes', 'write_script_tags', 'read_price_rules', 'write_price_rules'],
      async afterAuth(ctx) {
        const { shop, accessToken } = ctx.session;
        ctx.cookies.set("shopOrigin", shop, { httpOnly: false });
        const stringifiedBillingParams = JSON.stringify({
          recurring_application_charge: {
            name: 'Recurring charge',
            price: 20.01,
            return_url: TUNNEL_URL,
            test: true,
          },
        });

        ctx.cookies.set("shopOrigin", shop, { httpOnly: false });

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

        var appendWidget = await fetch(
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
          var body = json.asset.value;
          if(body && body.includes('tada_app_widget')) {
            return 'Already exist';
          } else {
            
            var index = body.indexOf('</body>');
            var additional = `<div id="tada_app_widget">
            <div id="spinny_box"
                style="display: flex;width: 100%;height: 100%;display: none;top: 0;position: absolute;left: 0;justify-content: center;align-items: center;">
                <div style="background-color: #00000077;width: 100%;height: 100%;position: absolute;z-index: 9998;"></div>
                <script src="/apps/tadaApp/Winwheel.js"></script>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/2.1.3/TweenMax.min.js"></script>
                <div id="spinny"
                    style="background-color: white;border: 1px solid black;display: block;padding: 20px; text-align: center;position: absolute;z-index:9999;">
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
              
              @media (max-width: 400px) {
                #spinny {
                  padding: 0px;
                }
              }
            </style>
        </div>`;
            body = body.substring(0, index) + additional + body.substring(index, body.length);
            console.log(body);
            await fetch(
              `https://${shop}/admin/api/${API_VERSION}/themes/${mainThemeId}/assets.json`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                  'X-Shopify-Access-Token': accessToken,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  "asset": {
                    "key": "layout/theme.liquid",
                    "value": body
                  }
                })
              }
            ).then(resp => resp.json() )
            .then(json => {
              console.log(json);
              return json;
            });
          }
        });

        const registration = await registerWebhook({
          address: `${TUNNEL_URL}/webhooks/products/create`,
          topic: 'PRODUCTS_CREATE',
          accessToken,
          shop,
        });

        if (registration.success) {
          console.log('Successfully registered webhook!');
        } else {
          console.log('Failed to register webhook', registration.result);
        }

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
          .then((jsonData) => jsonData.recurring_application_charge.confirmation_url)
          .catch((error) => console.log('error', error));
        ctx.redirect(confirmationURL);
      }
    })
  );

  const webhook = receiveWebhook({ secret: SHOPIFY_API_SECRET_KEY });

  router.post('/webhooks/products/create', webhook, (ctx) => {
    console.log('received webhook: ', ctx.state.webhook);
  });

  server.use(graphQLProxy({ version: ApiVersion.April19 }));

  router.get('*', verifyRequest(), async (ctx) => {
      await handle(ctx.req, ctx.res);
      ctx.respond = false;
      ctx.res.statusCode = 200;
  });

  server.use(router.allowedMethods());
  server.use(router.routes());

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
