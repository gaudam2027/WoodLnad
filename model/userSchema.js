const mongoose = require('mongoose');
const {Schema} = mongoose;

const userSchema = new Schema({
    name:{
        type: String,
        required: true
    },

    profileImage:{
        type:String,
        default:null
    },

    email:{
        type: String,
        required: true,
        unique:true
    },

    phone:{
        type: String,
        required: false,
        unique: true,
        sparse: true,
        default: null
    },

    googleId:{
        type: String,
        unique: true,
        sparse:true,
        
    },

    password:{
        type: String,
        required: false
    },

    isBlocked:{
        type: Boolean,
        default: false
    },

    isAdmin:{
        type: Boolean,
        default: false
    },
    
    // cart:{
    //     type: Array,
    //     default: []
    // },

    wallet:{
        type: Number,
        default: 0
    },

    wishlist:[{
        type: Schema.Types.ObjectId,
        ref: 'Wishlist'
    }],

    orderHistory:[{
        type: Schema.Types.ObjectId,
        ref: 'Order'
    }],

    createdOn: {
        type:Date,
        default:Date.now
    },

    // referralCode:{
    //     type: String
    // },

    // redeemed:{
    //     type: Boolean,
    //     // default: false
    // },

    // redeemedUsers:[{
    //     type: Schema.Types.ObjectId,
    //     // ref: 'User'
    // }],

    searchHistory:[{
        category: {
            type: Schema.Types.ObjectId,
            ref: 'Category'
        },
        searchOn: {
            type: Date,
            default: Date.now
        },

    }],
})

const User = mongoose.model('User',userSchema);

module.exports = User;