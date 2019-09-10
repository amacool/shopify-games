var game_start_icon_position = parseInt(window.game_start_icon_position);
var game_theme_style = parseInt(window.game_theme_style);
var game_them_main_color = '#29abe2';
var game_encouragement_text = ["What are you going to get?", "Let’s see what you got!", "Excited to see your discount?", "Feeling lucky today?", "Get a discount and apply it to this store!", "Spin me :)"];
var widget_url = window.global_widget_url;
var couponText = '';
var mobileMode = window.innerWidth > 520 ? false : true;
var wheel_run_time = parseInt(window.game_start_time);
var game_done = false;
var expireTime = '';

changeGameThemeStyle(game_theme_style);
changeGameStartIconPosition(game_start_icon_position);
showRandomEncouragementText();

function changeGameThemeStyle(game_theme) {
    switch (game_theme) {
        case 1:
            $('.tada_start_icon_div').css({
                'background-color': '#f2f2f2',
                'alignItems': 'center'
            });
            animation_sinnyBox();
            break;
        case 2:
            $('.tada_start_icon_div').css({
                'background-image': 'url(' + widget_url + '/aattention_start_icon_back.svg)',
                'height': '60px',
                'boxShadow': 'unset'
            });
            animation_sinnyBox();
            break;
        case 3:
            $('.tada_start_icon_div').css({
                'background-color': '#f2f2f2',
                'alignItems': 'center'
            });
            animation_sinnyBox();
            break;
    }
}



function showRandomEncouragementText(class_name) {
    var random = Math.floor(Math.random() * (game_encouragement_text.length + 1));
    $('#'+class_name).html(game_encouragement_text[random]);
}

///Email Validation
function validateEmail(email) {
    var re = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
    return re.test(email);
}

//////////////////Event///////////////////
$('#tada_game_email_input').focusin(function() {
    $(this).css({
        'box-shadow': 'unset',
        'border': '1px solid #ced4da'
    });
    $(this).removeClass('jello-horizontal');
})

$('#tada-floating-couponview-button').click(function() {
    $('.tada-floating-dialog').css({
        "webkitAnimation": 'none'
    });
    $('.tada-floating-dialog').fadeOut("slow", function() {
        $('.tada-floating-dialog').css({
            'display': 'none'
        });
    })
})

$('.tada_start_icon_div').click(function() {
    var floating_component = $('.tada-floating-dialog');
    if (game_done) {
        if (floating_component.css('display') == 'flex') {
            floating_component.css({
                "webkitAnimation": 'none'
            });
            floating_component.fadeOut("slow", function() {
                floating_component.css({
                    'display': 'none'
                });
            })
        } else {
            floating_component.css({
                "webkitAnimation": ''
            });
            floating_component.css({
                'display': 'flex'
            });
        }
    }
    $('.tada_game_modal').addClass('fade-in');
    showRandomEncouragementText ('tada-game-state-first-text');
    $('#tada-game-state-first-text').addClass('fadein-fadeout-animation');
    setInterval(function () {
      if (!$('#tada-game-state-first-text').hasClass('fadein-fadeout-animation')) {
        showRandomEncouragementText ('tada-game-state-first-text');
        $('#tada-game-state-second-text').removeClass('fadein-fadeout-animation');
        $('#tada-game-state-first-text').addClass('fadein-fadeout-animation');
      } else {
        showRandomEncouragementText ('tada-game-state-second-text');
        $('#tada-game-state-first-text').removeClass('fadein-fadeout-animation');
        $('#tada-game-state-second-text').addClass('fadein-fadeout-animation');
      }

    }, 3000);
    // setTimeout(function () {
    //   setInterval(function () {
    //     $('#tada-game-state-first-text').removeClass('fadein-fadeout-animation');
    //     $('#tada-game-state-second-text').addClass('fadein-fadeout-animation');
    //   }, 3000);
    // }, 3000);
  })
    //$('#tada-game-state-first-text').addClass('fadein-fadeout-animation');

$('#tada_apply_my_discount').click(function() {
    game_done = true;
    // Remove the Open Dialog event
    $('.tada_start_icon_div').attr('data-target', '');

    // Replace the Attention icon to floating icon
    $('#tada_start_icon').fadeOut(400, function() {
            $("#tada_start_icon").attr('src', widget_url + '/floating-bar-icon.svg');
        })
        .fadeIn(400);

    $("#tada-flower-falling").fadeOut("slow", function() {
        $(this).css({
            display: "none"
        });
    });
    $(".tada_remaind_bar").fadeIn("slow", function() {
        $(this).css({
            opacity: 1
        });
    });
    $('#tada_notifi_cash_view').html(couponText);
    // floating view couponText
    $('#tada_floating-dialog_cashview').html(couponText)
})
$('#tada_remained_notify_close').click(function() {
    $(".tada_remaind_bar").fadeOut("slow", function() {
        $(this).css({
            opacity: 1
        });
    });
})
//////////Animation////////////////////////
function animation_sinnyBox() {
    $("#spinny_box").animate({
        opacity: 1,
    }, 1500);
}
var animateButton = function(e) {

    e.preventDefault;
    //reset animation
    e.target.classList.remove('animate');

    e.target.classList.add('animate');
    setTimeout(function() {
        e.target.classList.remove('animate');
    }, 1700);
};

var bubblyButtons = document.getElementsByClassName("bubbly-button");

for (var i = 0; i < bubblyButtons.length; i++) {
    bubblyButtons[i].addEventListener('click', animateButton, false);
}

//Mobile responsive
if (mobileMode) {
    $('#canvas1').css({
        'width': window.innerWidth - 30
    });
    $('#canvas').css({
        'width': window.innerWidth - 30
    });
    $('.tada-wheel-container').css({
        'max-height': (window.innerWidth - 30) / 2
    })
}


// change the Attention position
function changeGameStartIconPosition(position) {
    switch (position) {
        case 1:
            $('#spinny_box').css({
                'left': '15px'
            });
            $('.tada-floating-dialog').css({
                'left': '65px',
                'margin-top': '10px'
            });
            break;
        case 2:
            $('#spinny_box').css({
                'right': '65px'
            });
            $('.tada-floating-dialog').css({
                'right': '70px',
                'margin-top': '10px'
            });
            break;
        case 3:
            $('#spinny_box').css({
                'top': 'unset',
                'left': window.innerWidth / 2 - 25 + 'px',
                'top': '50px'
            });
            if (window.innerWidth > 520) {
                $('.tada-floating-dialog').css({
                    'top': 'unset',
                    'left': window.innerWidth / 2 + 35 + 'px',
                    'top': '30px'
                });
            } else
                $('.tada-floating-dialog').css({
                    'top': 'unset',
                    'left': '15px',
                    'top': '85px'
                });
            break;
    }
}
// Wheel Animation
var options = ["$10 Cash", "40% OFF", "Not Luck Today", "Almost", "30% OFF", "$24 Cash", "Luck Today", "$20 Cash"];

var startAngle = 0;
var arc = (Math.PI / (options.length / 2));
var spinTimeout = null;

var spinArcStart = 0;
var spinTime = 0;
var spinTimeTotal = 0;

var ctx;

document.getElementById("tada_spin_start_button").addEventListener("click", spin);

function byte2Hex(n) {
    var nybHexString = "0123456789ABCDEF";
    return String(nybHexString.substr((n >> 4) & 0x0F, 1)) + nybHexString.substr(n & 0x0F, 1);
}

function RGB2Color(r, g, b) {
    return '#' + byte2Hex(r) + byte2Hex(g) + byte2Hex(b);
}

function getColor(item, maxitem) {
    if (item % 2 === 0)
        return RGB2Color(242, 242, 242);
    else return RGB2Color(255, 255, 255);
}

function drawRouletteWheel() {
    var canvas = document.getElementById("canvas");
    if (canvas.getContext) {
        var outsideRadius = 20;
        var textRadius = 110;
        var insideRadius = 180;

        ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, 500, 500);

        ctx.strokeStyle = "#29abe2";
        ctx.lineWidth = 0;

        ctx.font = 'bold 14px Open Sans';

        for (var i = 0; i < options.length; i++) {
            var angle = startAngle + i * arc;
            //ctx.fillStyle = colors[i];
            ctx.fillStyle = getColor(i, options.length);

            ctx.beginPath();
            ctx.arc(250, 250, outsideRadius, angle, angle + arc, false);
            ctx.arc(250, 250, insideRadius, angle + arc, angle, true);
            ctx.fill();

            ctx.save();
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.shadowBlur = 0;
            ctx.shadowColor = "rgb(220,220,220)";
            ctx.fillStyle = "#666666";
            ctx.translate(250 + Math.cos(angle + arc / 2) * textRadius,
                250 + Math.sin(angle + arc / 2) * textRadius);
            ctx.rotate(80 + angle + arc / 2 + Math.PI / 2);
            var text = options[i];
            ctx.fillText(text, -ctx.measureText(text).width / 2, 0);
            ctx.restore();
        }
        ctx.beginPath();
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;
        ctx.shadowBlur = 3;
        ctx.shadowColor = "rgb(220,220,220)";
        ctx.lineWidth = 20;
        ctx.arc(250, 250, insideRadius, 0, 2 * Math.PI, false);
        ctx.stroke();
        ctx.beginPath();
        ctx.lineWidth = 10;
        ctx.strokeStyle = "#ffa022";
        ctx.arc(250, 250, outsideRadius, 0, 2 * Math.PI, false);
        ctx.stroke();
    }
}

// Idle Wheel animation Remove
$('#canvas').addClass('breathing-animation');
$('#canvas1').addClass('breathing-animation');

var canvas1 = document.getElementById("canvas1");
ctx1 = canvas1.getContext("2d");
make_base();

function make_base() {
    base_image = new Image();
    base_image.src = widget_url + '/choose_pos.svg';
    base_image.onload = function() {
        ctx1.drawImage(base_image, 217, 40);
    }
}

function spin() {
    var email = $('#tada_game_email_input').val();
    if (!validateEmail(email)) {
        showNotification();
        $(this).removeClass('jello-horizontal');
        $('#tada_game_email_input').css({
            'box-shadow': '0 0 0 0.2rem #ec245257',
            'border': '1px solid #ec245257'
        });
        $('#tada_game_email_input').addClass('jello-horizontal');
        return;
    }
    $('.tada-dialog-mail-container').css({
        "display": "none"
    });
    $('.tada-game-state-text').css({
        "display": "none"
    });
    $('#tada-game-count-number').css({
        "display": "block"
    });

    var random = Math.floor(Math.random() * (game_encouragement_text.length + 1));
    $('.tada-game-spin-title').html(game_encouragement_text[random]);
    spinAngleStart = Math.random() * 10+20;
    spinTime = 200;
    spinTimeTotal =Math.random() * 3 + (wheel_run_time-1)*1000;
    $('#canvas').removeClass('breathing-animation');
    $('#canvas1').removeClass('breathing-animation');
    rotateWheel();
    showCountDownNumber();

}

function showCountDownNumber () {
  var timer = new Timer();
  timer.start();
  var timecount = wheel_run_time;
  $('#tada-game-count-number').html(wheel_run_time.toString());
  timer.addEventListener('secondsUpdated', function(e) {
      timecount--;
      if (timecount == 0) {
        $('#tada-game-count-number').html('Good Today!');
        $('#tada-game-count-number').css({
            "webkitAnimation": "none"
        });
        setTimeout(() => {
            $('#tada-game-count-number').css({
                "webkitAnimation": ''
            });
        }, 100);
          timer.stop();
      } else {
          $('#tada-game-count-number').html(timecount.toString());
          $('#tada-game-count-number').css({
              "webkitAnimation": "none"
          });
          setTimeout(() => {
              $('#tada-game-count-number').css({
                  "webkitAnimation": ''
              });
          }, 100);
      }
  });
}
function rotateWheel() {
    spinTime += 20;
    if (spinTime >= spinTimeTotal) {
        stopRotateWheel();
        return;
    }
    var spinAngle = spinAngleStart - easeOut(spinTime, 0, spinAngleStart, spinTimeTotal);
    startAngle += (spinAngle * Math.PI / 180);
    drawRouletteWheel();
    spinTimeout = setTimeout('rotateWheel()', 20);
}

function expireTimeCountDown () {
  var countDownDate = new Date().getTime()+(1000 * 60 * 60 * 24);

// Update the count down every 1 second
  var x = setInterval(function() {

    // Get today's date and time
    var now = new Date().getTime();

    // Find the distance between now and the count down date
    var distance = countDownDate - now;

    // Time calculations for days, hours, minutes and seconds
    var days = Math.floor(distance / (1000 * 60 * 60 * 24));
    var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    var seconds = Math.floor((distance % (1000 * 60)) / 1000);
    expireTime = hours + ":" + minutes + ":" + seconds;
    // If the count down is over, write some text
    if (distance < 0) {
      clearInterval(x);
      expireTime = "EXPIRED";
    }
    $('.tada-expire-time').html(expireTime);
  }, 1000);
}

function stopRotateWheel() {
    clearTimeout(spinTimeout);
    var degrees = startAngle * 180 / Math.PI + 90;
    var arcd = arc * 180 / Math.PI;
    var index = Math.floor((360 - degrees % 360) / arcd);
    // ctx.save();
    // ctx.font = 'bold 30px Helvetica, Arial';
    var text = options[index]
    couponText = text;
    // ctx.fillText(text, 250 - ctx.measureText(text).width / 2, 250 + 10);
    // ctx.restore();
    // alert(text);
    $('#tada-success-maker-text').html(text);
    $('.tada-dialog-body').css({
        "display": "none"
    });
    $('.tada-dialog-body-success').addClass('fade-in');
    $('.tada-dialog-body-success').css({
        "display": "flex"
    });
    $('#tada-flower-falling').css({
        "display": "block"
    });
    $('.tada-success-maker-board').addClass('fade-in-custom');
    setTimeout (function () {
      //$('.tada-success-maker-board').css('transform', 'scale(2.5)');
      $('.tada-success-maker-board').removeClass('fade-in-custom');
      $('.tada-success-maker-board').addClass('bounce-top');
    },1200);
    setTimeout(function() {
      $('.tada-success-maker-board').removeClass('bounce-top');
      $('.tada-success-maker-board').addClass('swirl-in-fwd-reverse');
      setTimeout(function() {
        $('.tada-success-maker-board').removeClass('swirl-in-fwd-reverse');
      }, 2000);
    }, 6000);
    //expire time set
    expireTimeCountDown();

    //remove animation
  //  $('#canvas').removeClass('breathing-animation');
   //$('#canvas1').removeClass('breathing-animation');
}

function easeOut(t, b, c, d) {
    var ts = (t /= d) * t;
    var tc = ts * t;
    return b + c * (tc + -3 * ts + 3 * t);
}
drawRouletteWheel();


////////////////Flowers Falling Animation////////////////////////////////////
TweenLite.set("#tada-flower-falling", {
    perspective: 600
})
//TweenLite.set("img",{xPercent:"-50%",yPercent:"-50%"})
var fireworkSVGPathArray = ["/simple-svg/circle.svg", "/simple-svg/polyline.svg", "/simple-svg/rectangle.svg", "/simple-svg/wave.svg"];

function showRandomFireworkSVG() {
    var random = Math.floor(Math.random() * (fireworkSVGPathArray.length));
    $(".dot").css("background", 'url(' + widget_url + fireworkSVGPathArray[random] + ')');
    //console.log(random);
    //$('.tada-game-state-text').html(fireworkSVGPathArray[random]);
}
animm = function(elm) {
    TweenMax.to(elm, R(2, 3), {
        y: h + 100,
        ease: Linear.easeNone,
        repeat: -1,
        delay: -6
    });
    TweenMax.to(elm, R(2, 2), {
        x: '+=100',
        rotationZ: R(0, 180),
        repeat: -1,
        yoyo: true,
        ease: Sine.easeInOut
    });
    TweenMax.to(elm, R(2, 1), {
        rotationX: R(0, 360),
        rotationY: R(0, 360),
        repeat: -1,
        yoyo: true,
        ease: Sine.easeInOut,
        delay: -5
    });
};

var total = 120;
var warp = document.getElementById("tada-flower-falling"),
    w = window.innerWidth,
    h = window.innerHeight;

setTimeout(function() {
    for (i = 0; i < total; i++) {
        var Div = document.createElement('div');
        var random = Math.floor(Math.random() * (fireworkSVGPathArray.length));
        Div.style.background = 'url(' + widget_url + fireworkSVGPathArray[random] + ')'; //("background", 'url('+ widget_url + fireworkSVGPathArray[random]+')');
        //showRandomFireworkSVG();
        TweenLite.set(Div, {
            attr: {
                class: 'dot'
            },
            x: R(0, w),
            y: R(-200, -150),
            z: R(-200, 200)
        });
        warp.appendChild(Div);
        animm(Div);
    }
}, 3000);

function R(min, max) {
    return min + Math.random() * (max - min)
};

function showNotification() {
  var x = document.getElementById("snackbar");
  x.className = "show";
  setTimeout(function(){ x.className = x.className.replace("show", ""); }, 3000);
}
