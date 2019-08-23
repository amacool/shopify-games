const mongoose = require('mongoose');

const Discount = mongoose.Schema({
    code: {
        type: String,
        default: ''
    },
    type: {
        type: String,
        default: ''
    },
    value: {
        type: Number,
        default: 0
    },
    created_at: {
        type: Date,
        default: Date.now()
    },
    expired_at: {
        type: Date,
        default: Date.now()
    },
    used: {
        type: Boolean,
        default: false
    },
    shop_id: {
        type: String,
        default: ''
    }
});

module.exports = mongoose.model('discount', Discount);
