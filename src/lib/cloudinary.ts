import "server-only";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

export function cloudinaryConfigurado() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET,
  );
}

export async function subirArchivo(buffer: Buffer, carpeta: string, publicId: string): Promise<UploadApiResponse> {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder: carpeta, public_id: publicId, resource_type: "auto", overwrite: false },
        (err, res) => (err || !res ? reject(err ?? new Error("Sin respuesta de Cloudinary")) : resolve(res)),
      )
      .end(buffer);
  });
}
