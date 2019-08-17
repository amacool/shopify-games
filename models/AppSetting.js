const mongoose = require('mongoose');

const AppSetting = mongoose.Schema({
    displaySetting: {
        type: String,
        default: 'all'
    },
    pageSetting: {
        type: String,
        default: `{
            "homepage": false,
            "pages": {
                "allPages": false
            }
            "products": {
                "allProducts": false
            },
            "blogs": {
                "allBlogs": false
            },
            "cart": false,
            "search": false
        }`
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
    },
    chargeId: {
        type: String,
        default: ''
    },
    install: {
        type: Number,
        default: 1
    },
    exitIntent: {
        type: Boolean,
        default: false
    },
    exitIntentTime: {
        type: Number,
        default: 5
    }
});

module.exports = mongoose.model('appSetting', AppSetting);
