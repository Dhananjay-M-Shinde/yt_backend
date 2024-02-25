import dotenv from 'dotenv';
import {app} from './app.js';
import connectDB from "./db/index.js";

dotenv.config({path: './.env'});

import {v2 as cloudinary} from 'cloudinary';
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
  });

// const app = express();

connectDB()
.then(() =>{

//     cloudinary.uploader.upload("https://upload.wikimedia.org/wikipedia/commons/a/ae/Olympic_flag.jpg",
//   { public_id: "olympic_flag" }, 
//   function(error, result) {console.log(result); });
    app.listen(process.env.PORT || 8000, () =>{
        console.log(`server is running at port ${process.env.PORT}`);
    })
}).catch((error) =>{
    console.log(`mongoDB connection failed `, error);
});


















// below is one way to connect to the database
// but this approach generally not meet the production standards

/*
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import express from "express";
import mongoose from "mongoose";
import {DB_NAME} from "./constants.js";

const app = express();

( async () =>{
    try {
        await mongoose.connect(`${process.env.MONGO_URL}/${DB_NAME}`);
        app.on("errror", (error) =>{
            console.log("ERR: ", error);
            throw error;
        })

        app.listen(process.env.PORT, () =>{
            console.log(`app is listening on port ${process.env.PORT}`);
        })
    } catch (error) {
        console.log("err: ", error);
        throw error;
    }
}) ();  */