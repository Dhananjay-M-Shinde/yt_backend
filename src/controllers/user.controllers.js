import {asyncHandler} from "../utils/asyncHandler.js";
import {apiError} from "../utils/apiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
    
        user.refreshToken = refreshToken

        // we are using validateBeforeSave so other field should not kicked in
        user.save({validateBeforeSave: false})
        return {accessToken, refreshToken}
    } catch (error) {
        throw new apiError(500, "something went wrong while generating access and refresh token")
    }
}

const registerUser = asyncHandler( async (req, res) =>{
    // get user detail from frontend
    // validation - non empty fields
    // check if user already exists : by userName or email
    // check for images, check for avatar
    // if available, upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // chceck for userCreation
    // return response

    const {fullName, userName, email, password} = req.body;

    // if(fullName === ""){
    //     throw new ApiError(400, "fullName is required")
    // }

    // instead of applying if condition to every field we can do it by below way using some method
    if([fullName, email, userName, password].some((field) =>{field?.trim() === ""})){
        throw new apiError(400, "all fields are required")
    }

    // it will check if user exist or not
    const existedUser = await User.findOne({
        $or: [{email}, {userName}]
    })

    if(existedUser){
        throw new apiError(409, "User already exist with given email or userName")
    }

    // console.log("this is req.files", req.files, req.files?.avatar[0]?.path, req.files?.coverImage[0]?.path);
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    // if user don't provide coverImage then to handle undefine error we can do below check
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files?.coverImage[0]?.path
    }

    //checking whether avatar file is available or not
    if(!avatarLocalPath){
        throw new apiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    // now checking whether it is uploaded to cloudinary or not
    if(!avatar){
        throw new apiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email, 
        password,
        userName: userName.toLowerCase()
    })

    // we are checking if user is created or not and if created then we are deselecting password and refreshToken while fetching data from db
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // checking for user creation
    if(!createdUser){
        throw new apiError(500, "something went wrong while registering the user")
    }

    // returning response
    return res.status(201).json(
        new apiResponse(200, createdUser, "user created successfully")
    )


})

const loginUser = asyncHandler(async (req, res) =>{
    // req.body --> data
    // username or email
    // find the user
    // password check
    // generate access and refresh token
    // send cookie
    // send response

    const {email, userName, password} = req.body

    if(!userName && !email){
        throw new apiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{userName}, {email}]
    })

    if(!user){
        throw new apiError(404, "user not found")
    }

    const isPasswordCorrect = await user.isPasswordCorrect(password)

    if(!isPasswordCorrect){
        throw new apiError(401, "Invalid user credential")
    }

    // generating access and refresh token
    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // we use option as below so our cookies can only modified in server and not through frontend
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new apiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged in successfully"
        )
    )
})

const logoutUser = asyncHandler(async (req, res) =>{
    const result = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    result.refreshToken = undefined;
    result.save({validateBeforeSave: false})

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new apiResponse(200, {}, "User logged out"))
})

const refreshAccessToken = asyncHandler(async (req, res) =>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new apiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
        if(!user){
            throw new apiError(401, "Invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new apiError(401, "refresh token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            200,
            {accessToken, refreshToken: newRefreshToken},
            "Access token refreshed"
        )
    } catch (error) {
        throw new apiError(401, error?.message || "Invalid refresh token")
    }
})






export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}