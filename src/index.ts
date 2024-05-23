import express, { Express, NextFunction, Router } from "express";
import { rateLimit } from "express-rate-limit";
import cookieParser from "cookie-parser";
import compression from "compression";
import bodyParser from "body-parser";

import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import path from "path";
import UserRequest from "@/utils/request";
import { Routes } from "@/routes/_init";
import logger from "@/utils/logger";

const app: Express = express();

app.use(cors());
app.use(helmet());
app.use(compression());
app.use(morgan("combined"));
app.use(express.json());
app.use(cookieParser());

app.set("trust proxy", false);
app.use(bodyParser.json({ limit: "128kb" }));
app.use(express.static(path.join("public")));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
    standardHeaders: "draft-7", // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
    message: "Too many requests, please try again later.",
});

app.use(limiter);

app.use((req,res,next) => {
    try{
        const request = new UserRequest(req, res, next);
        
        request.authorize();
        request.log();
        next();
    }catch(error){
        logger.error({
            message: "Error occurred while processing request",
            object: error,
            file: process.env.ERROR_LOGS
        });
        return res.status(500).json({ message: "Internal server error" });
    }
});

const routes = new Routes(app);
await routes.listen("auth");


export default app;