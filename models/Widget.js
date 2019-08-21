const mongoose = require('mongoose');

const Widget = mongoose.Schema({
    type: {
        type: Number,
        default: 0
    },
    name: {
        type: String,
        default: ''
    },
    pause: {
        type: Boolean,
        default: false
    },
    style: {
        type: String,
        default: ''
    },
    shop_id: {
        type: String,
        default: ''
    },
    discountType: {
        type: String,
        default: `{"freeShipping": {"enable": true, "title": "Free Shipping", "type":"", "price": ""}, "discount15p": {"enable": true, "title": "15% Discount", "type": "percentage", "price": "-25.00"}, "discount25p": {"enable": true, "title": "25% Discount", "type": "percentage", "price": "-15.00"}}`
    },
    couponExpire: {
        type: Number,
        default: 1440
    },
    displaySetting: {
        type: String,
        default: 'all'
    },
    pageSetting: {
        type: String,
        default: `{ "homepage": false,"pages": {"allPages": false},"products": {"allProducts": false},"blogs": {"allBlogs": false},"cart": false,"search": false, "all": false, "specific": true}`
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
    exitIntent: {
        type: Boolean,
        default: false
    },
    exitIntentTime: {
        type: Number,
        default: 5
    },
    created_at: {
        type: Date,
        defa
    }
});

module.exports = mongoose.model('widget', Widget);
