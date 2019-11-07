const withCSS = require('@zeit/next-css');
const webpack = require('webpack');

const apiKey = JSON.stringify(process.env.SHOPIFY_API_KEY);
module.exports = withCSS({
  webpack: (config) => {
    const env = {
      API_KEY: apiKey,
      TUNNEL_URL: JSON.stringify(process.env.TUNNEL_URL)
    };

    config.plugins.push(new webpack.DefinePlugin(env));
    return config;
  },
});
