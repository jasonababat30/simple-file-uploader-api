import { NextFunction, Response, Request } from "express";
import { getFileType } from "../utils/get-file-type";
import { ErrorWithStatusCode } from "../types";

const validateFileType = (req: Request, res: Response, next: NextFunction) => {
    try {
        const file = req.file;

        if (!file) {
            throw {
                message: "No file found",
                statusCode: 400,
            }
        }

        getFileType(file);

        next();
    
    } catch (error) {
        console.error("❌ Error @ Validate File Type: ", error);

        res
            .status((error as ErrorWithStatusCode)?.statusCode ?? 500)
            .send({
                message: (error as Error)?.message ?? "An error occurred while uploading the file.",
                error
            })
    }
};

export default validateFileType;
