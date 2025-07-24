import {asyncHandler} from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from "../utils/ApiResponse.js"

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

export {registerUser}