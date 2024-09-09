import { exec } from 'child_process';
import moment from 'moment';

type AddMetadataParams = {
  name: string;
  shopName: string;
  imagePath: string;
};
export async function addMetadata({
  name,
  shopName,
  imagePath,
}: AddMetadataParams) {
  const currentDate = moment().format('YYYY:MM:DD HH:mm:ss+00:00');

  const metadata = {
    ExifByteOrder: 'Big-endian (Motorola, MM)',
    ImageDescription: `Product ${name} from ${shopName}`,
    Make: `${shopName} - Manufacturer`,
    Model: `${shopName} - Model ${name}`,
    XResolution: 72,
    YResolution: 72,
    ResolutionUnit: 'inches',
    Artist: `${shopName} - Creator`,
    YCbCrPositioning: 'Centered',
    Copyright: `© ${moment().year()} ${shopName}. All rights reserved.`,
    ExifVersion: '0232',
    DateTimeOriginal: currentDate,
    CreateDate: currentDate,
    OffsetTimeOriginal: '+00:00',
    OffsetTimeDigitized: '+00:00',
    FlashpixVersion: '0100',
    ColorSpace: 'Uncalibrated',
    XPTitle: `${name} - ${shopName}`,
    XPComment: `Image of ${name} product from ${shopName}`,
    XPAuthor: shopName,
    XPKeywords: `${name}, ${shopName}, product`,
    XPSubject: `Product ${name} by ${shopName}`,
    CodedCharacterSet: 'UTF8',
    EnvelopeRecordVersion: 4,
    'By-line': shopName,
    CopyrightNotice: `© ${moment().year()} ${shopName}. All rights reserved.`,
    ApplicationRecordVersion: 4,
    XMPToolkit: 'Image::ExifTool 12.41',
    DateAcquired: currentDate,
    LastKeywordXMP: `${name}, ${shopName}`,
    Creator: shopName,
    Rights: `© ${moment().year()} ${shopName}. All rights reserved.`,
    Subject: `Product ${name} by ${shopName}`,
    Title: `${name} - ${shopName}`,
    Rating: 4 + Math.floor(Math.random() * 2),
    Keywords: `${name}, ${shopName}, product`,
    Description: `Image of ${name} product from ${shopName}. Find out more at ${shopName}.`,
    SubSecCreateDate: currentDate,
    SubSecDateTimeOriginal: currentDate,
  };
  await runExiftoolCommand(imagePath, metadata);
}

async function runExiftoolCommand(imagePath: string, metadata: any) {
  const metadataArgs = Object.entries(metadata)
    .map(([key, value]) => `-${key}="${value}"`)
    .join(' ');
  const command = `exiftool -overwrite_original -m ${metadataArgs} "${imagePath}"`;
  const promise = new Promise((resolve, reject) => {
    exec(command, (error: any, stdout: any, stderr: any) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        reject(error);
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
        reject(stderr);
      }
      console.log(`stdout: ${stdout}`);
      resolve(stdout);
    });
  });
  await promise;
}
