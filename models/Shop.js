const mongoose = require('mongoose');

const Shop = mongoose.Schema({
    name: {
        type: String,
        default: ''
    },
    pricingPlan: {
        type: Number,
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
    }
});

module.exports = mongoose.model('shop', Shop);
