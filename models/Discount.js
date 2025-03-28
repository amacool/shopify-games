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
    email: {
        type: String,
        default: ''
    },
    created_at: {
        type: Date,
        default: Date.now()
    },
    page_type: {
        type: String,
        default: ''
    },
    game_type: {
        type: String,
        default: 'Wheel'
    },
    widget_name: {
        type: String,
        default: ''
    },
    expired_at: {
        type: Date,
        default: Date.now()
    },
    used: {
        type: Boolean,
        default: false
    },
    used_at: {
        type: Date,
        default: Date.now()
    },
    used_amount: {
        type: Number,
        default: 0
    },
    shop_id: {
        type: String,
        default: ''
    }
});

module.exports = mongoose.model('discount', Discount);
