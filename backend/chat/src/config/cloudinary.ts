import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

const cloudName =
  process.env.CLOUDINARY_CLOUD_NAME ??
  process.env.CLOUD_NAME ??
  process.env.Cloud_Name;
const apiKey =
  process.env.CLOUDINARY_API_KEY ?? process.env.API_KEY ?? process.env.Api_Key;
const apiSecret =
  process.env.CLOUDINARY_API_SECRET ??
  process.env.API_SECRET ??
  process.env.Api_Secret;

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
}

export const isCloudinaryConfigured = Boolean(cloudName && apiKey && apiSecret);

export default cloudinary;