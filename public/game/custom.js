var game_start_icon_position = parseInt(window.game_start_icon_position);
var game_theme_style = parseInt(window.game_theme_style);
var game_them_main_color = '#29abe2';
var game_encouragement_text = ["What are you gonna get?", "Let’s see what you got!", "Excited to see your discount?"];
var widget_url = window.global_widget_url;
changeGameThemeStyle(game_theme_style);
changeGameStartIconPosition(game_start_icon_position);
showRandomEncouragementText();
function changeGameThemeStyle (game_theme) {
  switch (game_theme) {
    case 1:
      $('.tada_start_icon_div').css({'background-color':'#f2f2f2', 'alignItems' : 'center'});
      $('#tada_start_icon').attr('src', widget_url+'/default_start_icon.svg');
      animation_sinnyBox ();
      break;
    case 2:
      $('.tada_start_icon_div').css({'background-image':'url(' + widget_url + '/aattention_start_icon_back.svg)', 'height' : '60px', 'boxShadow': 'unset'});
      $('#tada_start_icon').attr('src', widget_url+'/attention_start_icon.svg');
      animation_sinnyBox ();
      break;
    case 3:
      $('.tada_start_icon_div').css({'background-color':'#f2f2f2','alignItems':'center'});
      $('#tada_start_icon').attr('src', widget_url+'/default_start_icon.svg');
      animation_sinnyBox ();
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
        $('#spinny_box').css({'left' : '15px'});
        break;
      case 2:
        $('#spinny_box').css({'right' : '65px'});
        break;
      case 3:
        $('#spinny_box').css({'top' : 'unset', 'left' : '50%', 'bottom' : '50px'});
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
  }
}
	var canvas1 = document.getElementById("canvas1");
  	ctx1 = canvas1.getContext("2d");
	make_base();
function make_base()
	{
	  base_image = new Image();
	  base_image.src = widget_url+'/choose_pos.png';
	  base_image.onload = function() {
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
animation_sinnyBox () {
  $( "#spinny_box" ).animate({
    opacity: 1,
  }, 1500 );
}
drawRouletteWheel();
