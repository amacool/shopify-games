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
  var widget_url = `${TUNNEL_URL}/game`;
  var game_start_icon_position = 2;
  var game_theme_style = 2;
  if(widget.type == 0) {
    var id = widget.id;
    html = `
    <div id="tada_app_widget">
      <div id="spinny_box">
          <div class="tada_start_icon_div" data-toggle="modal" data-target="#gamestartmodal">
            <img id="tada_start_icon" src="${widget_url}/default_start_icon.png"/>
          </div>
      </div>
    </div>
    <!--Game Modal -->
    <div class="modal fade" id="gamestartmodal" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered tada-modal-custom" role="document">
    <div class="modal-content tada_game_modal">
      <div class="modal-header">
        <h5 class="modal-title tada_game_start_title" id="exampleModalCenterTitle">Logo</h5>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="modal-body tada-dialog-body">
        <p class="tada-game-spin-title">Spin and Win</p>
        <p class="tada-game-spin-text">Lorem Ipsum is simply dummy text of the printing and typesetting</p>
        <p class="tada-game-spin-text">industry. Lorem Ipsum has been the industry's standard dummy text</p>
        <div class="tada-dialog-mail-container">
	        <input type="email" class="form-control" id="tada_game_email_input" aria-describedby="emailHelp" placeholder="Enter your email address">
	        <button id="tada_spin_start_button" value="spin">SPIN</button>
        </div>
        <p class="tada-game-state-text">Excited to see your discount?</p>
        <p id="tada-game-count-number">5</p>
        <div class="d-block tada-wheel-container">
        	<canvas id="canvas1" width="500" height="400"></canvas>
			<canvas id="canvas" width="500" height="400"></canvas>
        </div>
      </div>
      <div class="modal-body tada-dialog-body-success">
      	<p class="tada-game-spin-title1">Congratulations</p>
        <div class="tada-success-maker-board" style="background-image: url(${widget_url}/success_mark_board.png)">
      		<p class="tada-success-maker-left-text col-4">Your've </br>Win</p>
      		<div class="col-8 tada-success-maker-text-div col-8">
      			<p id="tada-success-maker-text">$10 Cash</p>
      		</div>
      	</div>
      	<p class="tada-game-spin-text">Lorem Ipsum is simply dummy text of the printing and typesetting</p>
        <p class="tada-game-spin-text">industry. Lorem Ipsum has been the industry's standard dummy text</p>
        <div class="tada-game-expiry d-flex">
        	<p class="tada-game-expiry-title">How long until expiry:</p>
        	<p class="tada-game-expiry-time">22:59:43</p>
        </div>
        <div class="tada-game-body-divide"></div>
        <div class="tada-game-discount-code">
        	<p class="tada-game-discount-code-title">Your Discount Code is:</p>
        	<p class="tada-game-discount-code-text">SASDERWERT3H3G24</p>
        </div>
        <button id="tada_spin_start_button" value="spin">APPLY MY DISCOUNT</button>
      </div>
      <div class="modal-footer tada-modal-footer">
        <img src="${widget_url}/game_dialog_button_icon.png" />
      </div>
    </div>
  </div>
</div>
<style>
#gamestartmodal {
  opacity: 1;
  background: transparent;
}
#tada_app_widget {
		width: 100%;
		height: 100%;
		display: flex;
	}
  #spinny_box {
	  display: flex;
      top:	50%;
      position: fixed;
      z-index: 9999;
      justify-content: left;
      align-items: center;
	}
.tada_start_icon_div {
  width: fit-content;
      display: flex;
      border-radius: 8px;
      flex-direction: column;
      background-size: cover;
      width: 50px;
      height: 50px;
      justify-content: center;
      align-items: flex-start;
      position: absolute;
      cursor: pointer;
      padding: 10px;
      background-repeat: no-repeat;
      -webkit-box-shadow: 3px 3px 0px 0px rgba(230,230,230,1);
      -moz-box-shadow: 3px 3px 0px 0px rgba(230,230,230,1);
      box-shadow: 3px 3px 0px 0px rgba(230,230,230,1);
}.tada_start_icon_div img {
		display: flex;
  		width: 30px;
  		height: 30px;
  		object-fit: contain;
	}

	.modal-header {
		padding: 6px 0 !important;
		margin:0 15px;
	}
	.tada_game_modal {
		padding:15px;
	}
	.tada_game_start_title {
		font-weight: bold;
		font-family: "Open Sans";
		font-size: 36px;
	}
	#tada_spin_start_button {
		background-color: #29abe2;
		outline:none;
		border-radius: 30px;
		border:none;
		color:white;
		padding: 10px;
		font-family: "Open Sans";
		font-size: 15px;
		font-weight: bold;
		margin-top: 15px;
	}
  .tada-dialog-body {
		display: flex;
		flex-direction: column;
		justify-content: center;
		width: 80%;
		margin: 0 auto;
    padding-bottom:0 !important;
	}
  .tada-dialog-body-success {
		display: flex;
		flex-direction: column;
		justify-content: center;
		width: 80%;
		margin: 0 auto;
    display: none;
	}
	.tada-dialog-mail-container {
		width: 55%;
	   justify-content: center;
	    display: flex;
	    flex-direction: column;
	    margin: 0 auto;
	    margin-top: 25px;
	}
	.tada-game-spin-title {
		text-align: center;
		font-size: 36px;
    color:black !important;
		font-family: "Open Sans";
		font-weight: bold;
	}
  .tada-game-spin-title1 {
		text-align: center;
		font-size: 36px;
    color:black !important;
		font-family: "Open Sans";
		font-weight: bold;
	}
	.tada-game-spin-text {
		text-align: center;
		font-size: 16px;
		margin: 0;
		color: #666666;
	}
	@media (min-width: 780px) {
		.tada-modal-custom {
			max-width: 700px !important;
		}
	}
	.tada-modal-footer {
		justify-content: center !important;
		padding: 0 !important;
		align-items: center;
		display: flex;
	}
	.tada-modal-footer img {
		margin-top: 10px;
	}

  .tada-wheel-container {
		max-height: 250px;
		overflow: hidden;
	}
	#canvas1 {
		position: absolute;
	}

	.tada-game-state-text {
		font-size: 25px;
		font-weight: bold;
		color: #ffa022;
		text-align: center;
		margin-top: 30px;
		margin-bottom: -30px;
	}
	#tada-game-count-number {
		text-align: center;
		font-family: "Open Sans";
		font-weight: bold;
		font-size: 62px;
		color: #29abe2;
		display: none;
		margin-bottom: -30px;
	}
  .tada-game-expiry {
		justify-content: center;
		margin-top: 20px;
	}
	.tada-game-expiry-title {
		text-align: center;
	    font-size: 16px;
	    margin: 0;
	    color: #666666;
	}
	.tada-game-expiry-time {
		font-size: 17px;
		font-weight: bold;
		color: #f7931e;
		padding-left: 5px;
	}
  .tada-game-discount-code-title {
		text-align: center;
		font-size: 16px;
		color: #666666;
	}
	.tada-game-discount-code-text {
		font-size:25px;
		font-weight: bold;
		color:#f7931e;
		text-align: center;
	}
  .tada-game-body-divide {
		height: 1px;
		background-color: black;
    opacity: 0.2;
		width: 50%;
		margin:0 auto;
		margin-bottom: 1rem;
    margin-top: 1rem;
	}
  .tada-success-maker-board {
		background-size: contain;
		background-repeat: no-repeat;
		display: flex;
		align-items: center;
		height: 200px;
	    width: 350px;
	    margin: 0 auto;
	    padding-bottom:30px;
	}
	.tada-success-maker-left-text {
		color:white;
		font-size: 25px;
		font-weight: bold;
		text-align: center;
    margin:0;
	}
	.tada-success-maker-text-div {
		display: flex;
		justify-content: center;
	}
	#tada-success-maker-text {
		font-size:25px;
		font-weight:bold;
		color:#29abe2;
		text-align: center;
	   background: white;
	    border-radius: 15px;
	    padding: 18px;
	    max-width: 90%;
	    word-break: break-all;
	    -webkit-box-shadow: -8px 8px 5px 2px rgba(0,0,0,0.25);
		-moz-box-shadow: -8px 8px 5px 2px rgba(0,0,0,0.25);
		box-shadow: -8px 8px 5px 2px rgba(0,0,0,0.25);
	}
</style>
<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous">
<script src="https://code.jquery.com/jquery-3.3.1.slim.min.js" integrity="sha384-q8i/X+965DzO0rT7abK41JStQIAqVgRVzpbzo5smXKp4YfRvH+8abtTE1Pi6jizo" crossorigin="anonymous"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.7/umd/popper.min.js" integrity="sha384-UO2eT0CpHqdSJQ6hJty5KVphtPhzWj9WO1clHTMGa3JDZwrnQq4sF86dIHNDz0W1" crossorigin="anonymous"></script>
<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/js/bootstrap.min.js" integrity="sha384-JjSmVgyd0p3pXB1rRibZUAYoIIy6OrQ6VrjIEaFf/nJGzIxFDsf4x0xIM+B07jRM" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/easytimer@1.1.1/dist/easytimer.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/easytimer@1.1.1/dist/easytimer.min.js"></script>
<script>
var game_start_icon_position = ${game_start_icon_position};
var game_theme_style = ${game_theme_style};
var game_them_main_color = '#29abe2';
var game_encouragement_text = ["What are you gonna get?", "Let’s see what you got!", "Excited to see your discount?"];
changeGameThemeStyle(game_theme_style);
changeGameStartIconPosition(game_start_icon_position);
showRandomEncouragementText();
function changeGameThemeStyle (game_theme) {
  switch (game_theme) {
    case 1:
      document.getElementsByClassName('tada_start_icon_div')[0].style.backgroundColor = '#f2f2f2';
      document.getElementsByClassName('tada_start_icon_div')[0].style.alignItems = 'center';
      document.getElementById('tada_start_icon').src = '${widget_url}/default_start_icon.png';
      break;
    case 2:
      document.getElementsByClassName('tada_start_icon_div')[0].style.backgroundImage = "url('${widget_url}/aattention_start_icon_back.png')";
      document.getElementsByClassName('tada_start_icon_div')[0].style.height = "60px";
      document.getElementsByClassName('tada_start_icon_div')[0].style.boxShadow = "unset";
      document.getElementById('tada_start_icon').src = '${widget_url}/attention_start_icon.png';
      break;
    case 3:
      document.getElementsByClassName('tada_start_icon_div')[0].style.backgroundColor = '#f2f2f2';
      document.getElementsByClassName('tada_start_icon_div')[0].style.alignItems = 'center';
      document.getElementById('tada_start_icon').src = '${widget_url}/default_start_icon.png';
      break;
  }
}

function showRandomEncouragementText () {
  	var random = Math.floor(Math.random() * (game_encouragement_text.length + 1));
  	$('.tada-game-state-text').html(game_encouragement_text[random]);
  }

function changeGameStartIconPosition (position) {
    switch (position) {
      case 1:
        document.getElementById('spinny_box').style.left = '15px';
        break;
      case 2:
        document.getElementById('spinny_box').style.right = '65px';
        break;
      case 3:
        document.getElementById('spinny_box').style.top = 'unset';
        document.getElementById('spinny_box').style.left = '50%';
        document.getElementById('spinny_box').style.bottom = '50px';
        break;
    }
  }
  // Wheel Animation
  	var options = ["$10 Cash", "40% OFF", "Not Luck Today", "Almost", "30% OFF", "$24 Cash", "Luck Today"];

	var startAngle = 0;
	var arc = Math.PI / (options.length / 2);
	var spinTimeout = null;

	var spinArcStart = 10;
	var spinTime = 0;
	var spinTimeTotal = 0;

	var ctx;

	document.getElementById("tada_spin_start_button").addEventListener("click", spin);

	function byte2Hex(n) {
	  var nybHexString = "0123456789ABCDEF";
	  return String(nybHexString.substr((n >> 4) & 0x0F,1)) + nybHexString.substr(n & 0x0F,1);
	}

	function RGB2Color(r,g,b) {
		return '#' + byte2Hex(r) + byte2Hex(g) + byte2Hex(b);
	}

	function getColor(item, maxitem) {
	  if (item % 2 === 0 )
	  	return RGB2Color(242,242,242);
	  else return RGB2Color(255,255,255);
	}

function drawRouletteWheel() {
  var canvas = document.getElementById("canvas");
  if (canvas.getContext) {
    var outsideRadius = 30;
    var textRadius = 110;
    var insideRadius = 180;

    ctx = canvas.getContext("2d");
    ctx.clearRect(0,0,500,500);

    ctx.strokeStyle = "#29abe2";
    ctx.lineWidth = 20;

    ctx.font = 'bold 14px Open Sans';

    for(var i = 0; i <options.length; i++) {
      var angle = startAngle + i * arc;
      //ctx.fillStyle = colors[i];
      ctx.fillStyle = getColor(i, options.length);

      ctx.beginPath();
      ctx.arc(250, 250, outsideRadius, angle, angle + arc, false);
      ctx.arc(250, 250, insideRadius, angle + arc, angle, true);
      ctx.stroke();
      ctx.fill();

      ctx.save();
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.shadowBlur    = 0;
      ctx.shadowColor   = "rgb(220,220,220)";
      ctx.fillStyle = "#666666";
      ctx.translate(250 + Math.cos(angle + arc / 2) * textRadius,
                    250 + Math.sin(angle + arc / 2) * textRadius);
      ctx.rotate(80+angle + arc / 2 + Math.PI / 2);
      var text = options[i];
      ctx.fillText(text, -ctx.measureText(text).width / 2, 0);
      ctx.restore();
    }

    //Arrow
    //var markPos = 100;
    //ctx.fillStyle = "black";

    // ctx.beginPath();
    // ctx.moveTo(250 - 4, markPos - (outsideRadius + 5));
    // ctx.lineTo(250 + 4, markPos - (outsideRadius + 5));
    // ctx.lineTo(250 + 4, markPos - (outsideRadius - 5));
    // ctx.lineTo(250 + 9, markPos - (outsideRadius - 5));
    // ctx.lineTo(250 + 0, markPos - (outsideRadius - 13));
    // ctx.lineTo(250 - 9, markPos - (outsideRadius - 5));
    // ctx.lineTo(250 - 4, markPos - (outsideRadius - 5));
    // ctx.lineTo(250 - 4, markPos - (outsideRadius + 5));
    // ctx.fill();
  }
}
	var canvas1 = document.getElementById("canvas1");
  	ctx1 = canvas1.getContext("2d");
	make_base();
    function make_base()
	{
	  base_image = new Image();
	  base_image.src = '${widget_url}/choose_pos.png';
	  base_image.onload = function(){
	  ctx1.drawImage(base_image, 217, 40);
	 }
}

function spin() {
	$('.tada-dialog-mail-container').css({"display": "none"});
	$('.tada-game-state-text').css({"display": "none"});
	$('#tada-game-count-number').css({"display" : "block"});

	var random = Math.floor(Math.random() * (game_encouragement_text.length + 1));
	$('.tada-game-spin-title').html(game_encouragement_text[random]);
	var timer = new Timer();
	var timer_number = 5;
	timer.start();
	timer.addEventListener('secondsUpdated', function (e) {
		timer_number--;
    	$('#tada-game-count-number').html(timer_number.toString());
    	if(timer_number == 0) {
    		$('#tada-game-count-number').css({"marginBottom" : "0"});
    		$('.tada-game-state-text').css({"display": "block"});
    		$('.tada-game-state-text').html("Good Luck!");
    		$('#tada-game-count-number').html("");
    		timer.stop();
    		spinAngleStart = Math.random() * 10 + 20;
			  spinTime = 0;
			  spinTimeTotal = Math.random() * 3 + 10 * 1000;
			  rotateWheel();
    	}
	});

  // spinAngleStart = Math.random() * 10 + 20;
  // spinTime = 0;
  // spinTimeTotal = Math.random() * 3 + 10 * 1000;
  // rotateWheel();
}

function rotateWheel() {
  spinTime += 50;
  if(spinTime >= spinTimeTotal) {
    stopRotateWheel();
    return;
  }
  var spinAngle = spinAngleStart - easeOut(spinTime, 0, spinAngleStart, spinTimeTotal);
  startAngle += (spinAngle * Math.PI / 180);
  drawRouletteWheel();
  spinTimeout = setTimeout('rotateWheel()', 50);
}

function stopRotateWheel() {
   clearTimeout(spinTimeout);
   var degrees = startAngle * 180 / Math.PI + 90;
   var arcd = arc * 180 / Math.PI;
  var index = Math.floor((360 - degrees % 360) / arcd);
  // ctx.save();
  // ctx.font = 'bold 30px Helvetica, Arial';
  var text = options[index]
  // ctx.fillText(text, 250 - ctx.measureText(text).width / 2, 250 + 10);
  // ctx.restore();
  // alert(text);
  $('#tada-success-maker-text').html(text);
  $('.tada-dialog-body-success').css({"display" : "flex"});
  $('.tada-dialog-body').css({"display" : "none"});
}

function easeOut(t, b, c, d) {
  var ts = (t/=d)*t;
  var tc = ts*t;
  return b+c*(tc + -3*ts + 3*t);
}

drawRouletteWheel();
</script>
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
