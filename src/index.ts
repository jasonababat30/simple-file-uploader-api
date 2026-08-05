import express from "express";
import cors from "cors";
import multer from "multer";
import { 
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    S3ServiceException 
} from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import crypto from "crypto";
import { ErrorWithStatusCode } from "./types";
import { getFileType } from "./utils/get-file-type";
import validateFileType from "./middlewares/validate-file-type";
import fileSizeErrorHandling from "./middlewares/file-size-error-handling";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import path from "path";

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
const upload = multer({
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
    }
});

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

app.get("/images/:imageKey", async (req, res) => {
    try {
        const imageKey = req.params.imageKey;

        if (!imageKey) {
            throw {
                message: "Image Key is undefined",
                statusCode: 400,
            }
        }

        const retrieveImageCommand = new GetObjectCommand({
            Bucket: awsObj.bucketName,
            Key: `image/${imageKey}`
        });

        const url = await getSignedUrl(
            s3Client,
            retrieveImageCommand,
            {
                expiresIn: 60
            }
        );

        res.send({
            message: "Get image request received",
            data: {
                imageKey: req.params.imageKey,
                url
            }
        })
    } catch (error) {
        console.error("❌ Error @ Get Image: ", error);
        res
            .status((error as ErrorWithStatusCode)?.statusCode ?? 500)
            .send({
                message: (error as Error)?.message ??  "An error occurred while fetching the image.",
                error
            });
    }
});

app.get("/videos/:videoKey", async (req, res) => {
    try {
        const videoKey = req.params.videoKey;

        if (!videoKey) {
            throw {
                message: "Video Key is undefined",
                statusCode: 400,
            }
        }

        const retrieveVideoCommand = new GetObjectCommand({
            Bucket: awsObj.bucketName,
            Key: `video/${videoKey}`
        });

        const url = await getSignedUrl(
            s3Client,
            retrieveVideoCommand,
            {
                expiresIn: 60
            }
        );

        res.send({
            message: "Get video request received",
            data: {
                videoKey: req.params.videoKey,
                url
            }
        })
    } catch (error) {
        console.error("❌ Error @ Get Video: ", error);
        res
            .status((error as ErrorWithStatusCode)?.statusCode ?? 500)
            .send({
                message: (error as Error)?.message ??  "An error occurred while fetching the video.",
                error
            });
    }
});

app.get("/pdfs/:pdfKey", async (req, res) => {
    try {
        const pdfKey = req.params.pdfKey;

        if (!pdfKey) {
            throw {
                message: "PDF Key is undefined",
                statusCode: 400,
            }
        }

        const retrievePdfCommand = new GetObjectCommand({
            Bucket: awsObj.bucketName,
            Key: `pdf/${pdfKey}`
        });

        const url = await getSignedUrl(
            s3Client,
            retrievePdfCommand,
            {
                expiresIn: 60
            }
        );

        res.send({
            message: "Get pdf request received",
            data: {
                pdfKey: req.params.pdfKey,
                url
            }
        })
    } catch (error) {
        console.error("❌ Error @ Get PDF: ", error);
        res
            .status((error as ErrorWithStatusCode)?.statusCode ?? 500)
            .send({
                message: (error as Error)?.message ??  "An error occurred while fetching the pdf.",
                error
            });
    }
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
        const extension = path.extname(file.originalname);

        const uploadCommand = new PutObjectCommand({
            Bucket: awsObj.bucketName,
            Key: `${folderName}/${unique_file_name}${extension}`,
            Body: file.buffer,
            ContentType: file.mimetype
        });

        await s3Client.send(uploadCommand);

        const retrieveImageCommand = new GetObjectCommand({
            Bucket: awsObj.bucketName,
            Key: `${folderName}/${unique_file_name}${extension}`
        })

        const url = await getSignedUrl(
            s3Client,
            retrieveImageCommand,
            {
                expiresIn: 60
            }
        )

        res.send({
            message: "Upload request received",
            data: {
                type: folderName,
                name: file.originalname,
                key: `${unique_file_name}${extension}`,
                url
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
});

// Error Handling Middlewares:
app.use(fileSizeErrorHandling);

app.listen(port, () => {
    console.log(`✅ Server is running on port '${port}'`);
});
