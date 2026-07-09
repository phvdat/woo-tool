import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import axios from 'axios';
import { addWatermark } from './website';
import { WooWebsitePayload } from '@/app/api/woo/website-config/route';

export async function formatImages({
  websiteObject,
  name,
  images,
}: {
  websiteObject: WooWebsitePayload;
  name: string;
  images: string[];
}) {
  const jobId = Date.now().toString();

  const uploadFolder = `/var/www/html/uploads/blogs/${jobId}`;
  const zipFolder = `/var/www/html/uploads/zips`;

  fs.mkdirSync(uploadFolder, { recursive: true });
  fs.mkdirSync(zipFolder, { recursive: true });

  const zipFileName = `images-${jobId}.zip`;
  const zipFilePath = path.join(zipFolder, zipFileName);

  const logoResponse = await axios.get(websiteObject.logoUrl, {
    responseType: 'arraybuffer',
  });

  await addWatermark({
    quality: Number(websiteObject.quality),
    shopName: websiteObject.shopName,
    images,
    name,
    logoResponse,
    category: websiteObject.shopName,
    position: websiteObject.logoPosition,
    uploadFolder,
  });

  const imageFiles = fs
    .readdirSync(uploadFolder)
    .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file));

  const finalImageUrls = imageFiles.map(
    file => `${process.env.NEXTAUTH_URL}/uploads/blogs/${jobId}/${file}`
  );

  const output = fs.createWriteStream(zipFilePath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.pipe(output);
  archive.directory(uploadFolder, false);

  await archive.finalize();

  await new Promise<void>((resolve, reject) => {
    output.on('close', resolve);
    output.on('error', reject);
    archive.on('error', reject);
  });

  const downloadLink = `${process.env.NEXTAUTH_URL}/uploads/zips/${zipFileName}`;

  return {
    downloadLink,
    images: finalImageUrls,
  };
}