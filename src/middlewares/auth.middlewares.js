import {asyncHandler} from "../utils/asyncHandler.js"
import {apiError} from "../utils/apiError.js"
import jwt from "jsonwebtoken"
import {User} from "../models/user.model.js"

const verifyJWT = asyncHandler(async (req, res, next) =>{
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer", "")
    
        if(!token){
            throw new apiError(401, "Unauthorized request")
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        console.log("this is ", decodedToken);
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if(!user){
            throw new apiError(401, "Invalid access token")
        }
    
        req.user = user;
        next()
    } catch (error) {
        throw new apiError(401, error?.message || "Invalid access token")
    }
})

export {verifyJWT}