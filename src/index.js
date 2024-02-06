import dotenv from 'dotenv';
import express from 'express';
import connectDB from "./db/index.js";

dotenv.config({path: './.env'});
const app = express();

connectDB()
.then(() =>{
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