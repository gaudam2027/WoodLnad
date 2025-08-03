const mongoose = require('mongoose');
const {Schema} = mongoose;

const addressSchema = new mongoose.Schema({
    userId:{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required:true
    },

    address:[{
        default: {
            type: Boolean,
            default: false
        },
        addressType:{
            type: String,
            required: true
        },
        title:{
            type: String,
            required: true
        },
        city:{
            type: String,
            required: true
        },
        state:{
            type: String,
            required: true
        },
        pincode:{
            type: Number,
            required: true
        },
        address:{
            type: String,
            required: true
        },
        landmark:{
            type: String,
            required: true
        },
        phone:{
            type: String,
            required: true
        },
        altPhone:{
            type: String,
            required: true
        },
        email:{
            type: String,
            required:true
        }
        
    }]
    
})

const Address = mongoose.model('Address',addressSchema);
module.exports = Address