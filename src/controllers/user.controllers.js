import {asyncHandler} from "../utils/asyncHandler.js";
import {apiError} from "../utils/apiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { apiResponse } from "../utils/apiResponse.js";

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
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

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

export {registerUser}