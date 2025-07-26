import {asyncHandler} from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"



const generateAccessAndRefreshToken = async (userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken =  user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave : false})

        return {accessToken , refreshToken}

    } catch (error) {
        throw new ApiError(500 , "Something went wrong while generating referesh and access token")
    }
}

const registerUser = asyncHandler( async (req , res)=>{
    // res.status(200).json({
    //     message:"Backend With Abdul Rehman"
    // })

    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res


    // 1-
    const {fullName , email , username ,password}=req.body
    console.log("Email : " , email);

    // 2-
    if([fullName,email,username,password].some((values)=> values?.trim() === "")){
        throw new ApiError(400 , "All feilds are required");
    }

    // 3-
    const existedUser = await User.findOne({ 
        $or : [{ username },{ email }]
    })
    
    if(existedUser){
        throw new ApiError( 409 , "User with email or username already exists")
    }

    // 4- middleware multer give path of files  -> req.files comes from middleware (middleware added new fields in req.body)

    const avatarPath  = req.files?.avatar[0]?.path;  //localPath as file avaiable on our server (avatar)
    // const coverImagePath  = req.files?.coverImage[0]?.path;  //localPath as file avaiable on our server (coverImage)
    // console.log("FILES RECEIVED:", req.files?.avatar[0]?.path);

    let coverImagePath ; 
    if(req.files && Array.isArray(req.files) && req.files.coverImage.length >0){
        coverImagePath  = req.files.coverImage[0].path;
    }

    if(!avatarPath){
        throw new ApiError (400 , "Avatar Image is required")
    }

    // 5-
    const avatar = await uploadOnCloudinary(avatarPath) 

    const coverImage = await uploadOnCloudinary(coverImagePath)

    if(!avatar){
        throw new ApiError (400 , "Avatar Image is required")
    }

    // 6-
    const user = await User.create(
        {
            fullName,
            avatar:avatar.url,
            coverImage:coverImage?.url || "",
            email,
            username: username.toLowerCase(),
            password
        }
    )

    const userCreated = await User.findById(user._id).select(
        "-password -refreshToken"  // default select all fields and data .select " - fieldName" will remove them from user Response
    )

    if(!userCreated){
        throw new ApiError(500 , "Something went Wrong while registering user ")
    }

    return res.status(201).json(
        new ApiResponse(200 , userCreated , "User Registered Successfully")
    )
    
})


const loginUser = asyncHandler( async (req,res) =>{
    // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie


    // 1-
    const {email , password , username} =  req.body

    if(!username && !email){
        throw new ApiError(400 , "username or email is required");
    }

    // if(!(username || email)){
    //     throw new ApiError(400 , "username or email is required");
    // }


    // login with email 
    // User.findOne({email})
    // login with username 
    // User.findOne({username})

    // 2-
    const user = await User.findOne({
        $or : [{username},{email}]
    })

    if(!user){
        throw new ApiError(404 , "User does not exist");
    }

    // 3-
    const isPasswordValid =  user.isPasswordCorrect(password)

    if(!password){
        throw new ApiError(404 , "Invalid user credentials");
    }


    // 4- 

    const {refreshToken , accessToken } = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findOne(user._id).select("-password -refreshToken")

    // 5-

    const options = {
        httpOnly : true,
        secure : true  
    } // cookie options by default cookie can be edit by anyone but by using options (httpOnly & secure) cookies only editable by server

    return res
    .status(200)
    .cookie("accessToken", accessToken ,options)
    .cookie("refreshToken", refreshToken ,options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser , accessToken , refreshToken
            },
            "User logged in Successfully"
        )
    )

})



const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id, // user value comes from auth middleware
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})


const refreshAccessToken = asyncHandler( async(req , res )=>{
    const incomingRefreshToken =  req.cookies.accessToken || req.body.accessToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken , process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id);
    
        if(!user){
            throw new ApiError(401, "Invalid Refresh Token");
        }
    
         if (incomingRefreshToken !== user?.refreshToken) {
                throw new ApiError(401, "Refresh token is expired or used")
                
        }
    
        const {accessToken , newrefreshToken} = await generateAccessAndRefreshToken(user._id)
    
        const options = {
            httpOnly :true,
            secure :true
        }
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newrefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken , refreshToken:newrefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
}