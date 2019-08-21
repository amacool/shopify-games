function deparam(querystring) {
    querystring = querystring.substring(querystring.indexOf('?') + 1).split('&');
    var params = {}, pair, d = decodeURIComponent;

    for (var i = querystring.length - 1; i >= 0; i--) {
        pair = querystring[i].split('=');
        params[d(pair[0])] = d(pair[1] || '');
    }

    return params;
};

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


function existsInArray(value, _array) {
    var result = false;
    for (var i = 0; i < _array.length; i++) {
        if (_array.id == value) {
            result = true;
            break;
        }
    }

    return result;
}

function jsUcfirst(string) 
{
    return string.charAt(0).toUpperCase() + string.slice(1);
}

module.exports.deparam = deparam;
module.exports.getCookie = getCookie;
module.exports.existsInArray = existsInArray;
module.exports.jsUcfirst = jsUcfirst;