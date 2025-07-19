import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async ()=>{
    try {
       const connectionResponse = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
       console.log("DB connected ! Connect Obj : ",connectionResponse);
       console.log("DB connected ! Connection Host : ",connectionResponse.connection.host);
       
    } catch (error) {
        console.error("Mongodb error  :", error);
        process.exit(1);
        
    }
}

export default connectDB