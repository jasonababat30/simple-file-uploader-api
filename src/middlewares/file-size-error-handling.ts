import { Request, Response, NextFunction } from "express";
import { MulterError } from "multer";

const fileSizeErrorHandling = (
    err: unknown,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (err instanceof MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            console.error("❌ Error @ Validate File Size: ", err);
            return res.status(400).json({
                message: "File size must not exceed 10 MB"
            })
        }
    }

    next(err);
}

export default fileSizeErrorHandling;