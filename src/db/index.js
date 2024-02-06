import dotenv from "dotenv";
import mongoose from "mongoose";
import {DB_NAME} from "../constants.js";

dotenv.config({path: './.env'});

const connectDB = async () =>{
    try {
        console.log(`${process.env.MONGO_URL}`);
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_URL}/${DB_NAME}`)
        console.log(`\n MongoDB connected !! DB HOST:  ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log(`mongoose connection error`, error);
        process.exit(1);        
    }
}

export default connectDB;