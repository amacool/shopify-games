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
    displayFrequency: {
        type: Number,
        default: -1
    },
    pricingPlan: {
        type: Number,
        default: 0
    },
    shop: {
        type: String,
        default: ''
    }
});

module.exports = mongoose.model('appSetting', AppSetting);