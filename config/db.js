const mongoose = require('mongoose');
const env = require('dotenv').config();


const connectDB = async ()=> {
    try{


        const conn = await mongoose.connect(process.env.MONGODB_URI)

        console.log(`MongoDB connected: ${`DB connected:${process.env.MONGODB_URI}`}`)
    }
    catch (error){
        console.error(`DB connect error: ${error.message}`);
        process.exit(1);
    }
}

module.exports = connectDB