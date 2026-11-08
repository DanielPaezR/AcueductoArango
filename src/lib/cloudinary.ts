import "server-only";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

export function cloudinaryConfigurado() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET,
  );
}

function configurar() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/** Sube un archivo. Si es privado (firmas), solo se puede ver con una URL firmada que genera el servidor. */
export async function subirArchivo(buffer: Buffer, carpeta: string, publicId: string, privado = false): Promise<UploadApiResponse> {
  configurar();
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder: carpeta, public_id: publicId, resource_type: "image", overwrite: false, type: privado ? "private" : "upload" },
        (err, res) => (err || !res ? reject(err ?? new Error("Sin respuesta de Cloudinary")) : resolve(res)),
      )
      .end(buffer);
  });
}

/** URL temporal (1 hora) para ver un archivo privado. */
export function urlPrivada(publicId: string) {
  configurar();
  return cloudinary.utils.private_download_url(publicId, "jpg", { expires_at: Math.floor(Date.now() / 1000) + 3600 });
}
