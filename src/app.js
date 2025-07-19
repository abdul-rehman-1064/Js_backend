import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser';

const app = express();

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true,
})) //middleware

app.use(express.json({limit:"16kb",})) //bodyData(form) latest versions donot require bodyParser

//URl Data
app.use(express.urlencoded({extended:true , limit:"16kb"}))
// Images,PDF , Favicons store in public file
app.use(express.static("public"))

// cookieParser use to set cookies between my server and users browser ->secure cookies --- (Only server will put and delete cookies)
app.use(cookieParser())

export { app }