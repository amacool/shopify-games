require('isomorphic-fetch');
const Koa = require('koa');
const send = require('koa-send');
const serve = require('koa-static');
const koaCors = require('koa-cors');
const cors = require('@koa/cors');
const next = require('next');
const { default: createShopifyAuth } = require('@shopify/koa-shopify-auth');
const dotenv = require('dotenv');
const { verifyRequest } = require('@shopify/koa-shopify-auth');
const session = require('koa-session');
const bodyParser = require('koa-bodyparser');
const fs = require('fs');
var schedule = require('node-schedule');

var rule = new schedule.RecurrenceRule();
rule.hour = 3;

dotenv.config();
const { default: graphQLProxy } = require('@shopify/koa-shopify-graphql-proxy');
const { ApiVersion } = require('@shopify/koa-shopify-graphql-proxy');
const Router = require('koa-router');
const { receiveWebhook } = require('@shopify/koa-shopify-webhooks');
const { processPayment, freeMembership, savePageSetting, removeExpiredCode, uninstall,  premiumMembership, addDiscount, sendWidget, changeDisplaySetting, getSetting, saveSetting }  = require('./server/router');
const installing = require('./server/install');
const mongoose = require('mongoose');

const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const {
  SHOPIFY_API_SECRET_KEY,
  SHOPIFY_API_KEY,
  MONGO_URI
} = process.env;

mongoose.connect(MONGO_URI);
mongoose.Promise = global.Promise;

app.prepare().then(() => {
  const server = new Koa();
  const router = new Router();
  server.use(cors());
  server.use(bodyParser());
  server.use(session(server));
  server.use(serve(__dirname + '/public'));
  server.keys = [SHOPIFY_API_SECRET_KEY];

  router.get('/', processPayment);
  router.get('/premium', premiumMembership);
  router.get('/free', freeMembership);
  router.post('/test', async (ctx, next) => {
    ctx.body = 'result';
  });
  router.post('/addDiscount', addDiscount);
  router.post('/getWidget', sendWidget);
  router.post('/changeDisplaySetting', changeDisplaySetting);
  router.post('/getSetting', getSetting);
  router.post('/saveSetting', saveSetting);
  router.post('/savePageSEtting', savePageSetting);


  server.use(
    createShopifyAuth({
      apiKey: SHOPIFY_API_KEY,
      secret: SHOPIFY_API_SECRET_KEY,
      scopes: ['read_products', 'write_products', 'read_themes', 'write_themes', 'write_script_tags', 'read_price_rules', 'write_price_rules'],
      async afterAuth(ctx) {
        await installing(ctx);
      }
    })
  );

  const webhook = receiveWebhook({ secret: SHOPIFY_API_SECRET_KEY });

  router.post('/webhooks/products/create', webhook, (ctx) => {
    console.log('received webhook: ', ctx.state.webhook);
  });

  router.post('/webhooks/uninstall', webhook, uninstall);

  server.use(graphQLProxy({ version: ApiVersion.April19 }));

  router.get('*', verifyRequest(), async (ctx) => {
      await handle(ctx.req, ctx.res);
      ctx.respond = false;
      ctx.res.statusCode = 200;
  });

  const koaOption = {
    origin: true,
    credentials: true
  };

  var j = schedule.scheduleJob(rule, removeExpiredCode);

  server.use(router.routes()).use(router.allowedMethods());

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
