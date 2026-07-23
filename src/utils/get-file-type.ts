const fileTypes = {
    image: ["image/jpeg", "image/png", "image/gif"],
    video: ["video/mp4", "video/webm"],
    pdf: ["application/pdf"],
};

export type FileType = "image" | "video" | "pdf";

export const getFileType = (file: Express.Multer.File): FileType => {
    if (fileTypes.image.includes(file.mimetype)) {
        return "image";
    }

    if (fileTypes.pdf.includes(file.mimetype)) {
        return "pdf";
    }

    if (fileTypes.video.includes(file.mimetype)) {
        return "video";
    }

    throw {
        statusCode: 400,
        message: `File '${file.originalname}' with a type '${file.mimetype}' is not allowed`
    }
}
