import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

const userSchema = new mongoose.Schema(
    {
        userName: {
            type : String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true // this should only be use when you are using this field heavily in search
        },
        email: {
            type : String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        fullName: {
            type : String,
            required: true,
            trim: true,
            index: true // this should only be use when you are using this field heavily in search
        },
        avatar: {
            type: String, // coudinary url
            required: true
        },
        coverImage: {
            type: String, // coudinary url
        },
        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ],
        password: {
            type: String,
            required : [true, "password is required"]
        },
        refreshToken: {
            type: String
        }
    },
     {timestamps: true}
)

// in below code we are encrypting password with the help of bcrypt library
// below is pre hook available in moongoose which simply says that just before saving data given code should execure
userSchema.pre("save", async function (next) {
    // below condition checks if password is changed or not because if only other field changed then we don't want below code executes again
    if(this.isModified("password")){
        this.password = await bcrypt.hash(this.password, 10);
        next()
    }else{
        return next();
    }
})

// below we are decrypting the password to check for login 
// here we are creating custom method with the help of .methods
userSchema.methods.isPasswordCorrect = async function (password) {
   return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function(){
    jwt.sign(
        {
            _id: this._id,
            email: this.email,
            userName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function(){
    jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model('User', userSchema)