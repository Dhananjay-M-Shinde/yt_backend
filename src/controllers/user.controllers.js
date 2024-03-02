import {asyncHandler} from "../utils/asyncHandler.js";
import {apiError} from "../utils/apiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

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
    
        const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            200,
            {accessToken, refreshToken},
            "Access token refreshed"
        )
    } catch (error) {
        throw new apiError(401, error?.message || "Invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async(req, res) =>{
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new apiError(400, "password is incorrect")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new apiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async(req, res) =>{
    return res
    .status(200)
    .json(200, req.user, "current user fetched successfully")
})

const updateAccountDetails = asyncHandler(async(req, res) =>{
    const {fullName, email} = req.body
    if(!fullName || !email){
        throw new apiError(400, "All fields are required")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {$set: {
            fullName,
            email: email
        }
    },
        {new: true}
    ).select("-password ")

    return res
    .status(200)
    .json(new apiResponse(200, user, "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async (req, res) =>{
    const avatarLoaclPath = req.file?.path;

    if(!avatarLoaclPath){
        throw new apiError(400, "avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLoaclPath)

    if(!avatar.url){
        throw new apiError(400, "Error while uploading avatar file to cloudinary")
    }
    
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new apiResponse(200, "avatar updated successfully"))
})

const updateUserCoverImage = asyncHandler(async (req, res) =>{
    const coverImageLoaclPath = req.file?.path;

    if(!coverImageLoaclPath){
        throw new apiError(400, "cover image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLoaclPath)

    if(!coverImage.url){
        throw new apiError(400, "Error while uploading cover image file to cloudinary")
    }
    
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: avatar.url
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new apiResponse(200, "cover image updated successfully"))
})

const getUserChannelProfile = asyncHandler(async (req, res) =>{
    const {userName} =req.params

    if(!userName?.trim()){
        throw new apiError(400, "username is missing")
    }
    
    const channel = await User.aggregate([
        {
            $match: {
                userName: userName?.trim().toLowerCase()
            }
        },
        {
            $lookup: {
                from: "Subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "Subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount:{
                    $size: "subscribersCount",
                },
                channelSubscribedToCount:{
                    $size: "subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.userId, "$subscribers.subscriber"]}, 
                        then: true, 
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                userName: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                channelSubscribedToCount: 1,
                isSubscribed: 1,
                email: 1
            }
        }
    ])

    if(!channel?.length){
        throw new apiError(404, "channel does not exist")
    }

    return res
    .status(200)
    .json(200, channel[0], "User channel fetched successfully!")
})

const getWatchHistory = asyncHandler(async (req, res) =>{
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: {
                                $project: {
                                    fullName: 1,
                                    userName: 1,
                                    avatar: 1
                                }
                            }
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(new apiResponse(200, user[0].watchHistory), "Watch history fetched successfully")
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}