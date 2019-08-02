const mongoose = require('mongoose');

const AppSetting = mongoose.Schema({
    displaySetting: {
        type: String,
        default: 'all'
    },
    timer: {
        type: Number,
        default: 0
    },
    frequency: {
        type: String,
        default: 'every'
    },
    displayFrequency: {
        type: Number,
        default: 0
    },
    pricingPlan: {
        type: Number,
        default: 0
    },
    shop: {
        type: String,
        default: ''
    },
    accessToken: {
        type: String,
        default: ''
    }
});

module.exports = mongoose.model('appSetting', AppSetting);