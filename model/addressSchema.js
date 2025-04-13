const mongoose = require('mongoose');
const {Schema} = mongoose;

const addressSchema = new mongoose.Schema({
    userId:{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required:true
    },

    address:[{
        addressType:{
            type: String,
            required: true
        },
        fullName:{
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
        landMark:{
            type: String,
            required: true
        },
        Phone:{
            type: String,
            required: true
        },
        altphone:{
            type: String,
            required: true
        },
        
    }]
    
})

const Address = mongoose.model('Address',addressSchema);
module.exports = Address