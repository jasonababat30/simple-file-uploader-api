import express from "express";
import cors from "cors";
import multer from "multer";
import { 
    S3Client,
    PutObjectCommand,
    S3ServiceException 
} from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import crypto from "crypto";
import { ErrorWithStatusCode } from "./types";
import { getFileType } from "./utils/get-file-type";
import validateFileType from "./middlewares/validate-file-type";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

const awsObj = {
    bucketName: process.env.AWS_BUCKET_NAME ?? "",
    region: process.env.AWS_BUCKET_REGION ?? "",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
}

const s3Client = new S3Client({
    credentials: {
        accessKeyId: awsObj.accessKeyId,
        secretAccessKey: awsObj.secretAccessKey,
    },
    region: awsObj.region
});

/**
 * If you upload something, it will be stored in the 'uploads' folder. 
 * You can change the destination by changing the 'dest' property in the multer configuration.
 */
// const upload = multer({ dest: "uploads/" });

/**
 * Instead of storing the file in the 'uploads' folder, we can store it in memory.
 * This is useful if you want to process the file before storing it, or if you want to store it in a database.
 * The file will be available in req.file.buffer.
 */
const upload = multer();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Hello, World!");
});

app.post("/", (req, res) => {
    res.send({
        message: "Post request received",
        data: req.body
    })
});

app.post("/upload-single", upload.single("file"), validateFileType, async (req, res) => {
    try {
        const file = req.file!;

        if (!awsObj.bucketName) {
            throw {
                message: "AWS_BUCKET_NAME is not defined in the environment variables.",
                statusCode: 500,
            }
        }

        const folderName = getFileType(file)
        const unique_file_name = crypto.randomUUID();

        const uploadCommand = new PutObjectCommand({
            Bucket: awsObj.bucketName,
            Key: `${folderName}/${unique_file_name}`,
            Body: file.buffer,
            ContentType: file.mimetype
        });

        await s3Client.send(uploadCommand);

        res.send({
            message: "Upload request received",
            data: {
                type: folderName,
                name: file.originalname
            }
        });
    } catch (error) {
        console.error("❌ Error @ Upload Single: ", error);
        
        if (error instanceof S3ServiceException) {
            res
                .status(error.$metadata.httpStatusCode ?? 500)
                .send({
                    message: error.message,
                    error
                });
            return;
        }

        res
            .status((error as ErrorWithStatusCode)?.statusCode ?? 500)
            .send({
                message: (error as Error)?.message ?? "An error occurred while uploading the file.",
                error
            })
    }
});

app.post("/upload-multiple", upload.array("files"), (req, res) => {
    res.send({
        message: "Upload multiple request received",
    })
})

app.listen(port, () => {
    console.log(`✅ Server is running on port '${port}'`);
});
