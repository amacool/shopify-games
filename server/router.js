const dotenv = require('dotenv');
dotenv.config();

const { API_VERSION } = process.env;

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

module.exports.processPayment = processPayment;
module.exports.addDiscount = addDiscount;
