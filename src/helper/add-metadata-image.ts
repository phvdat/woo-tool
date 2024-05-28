import { exec } from 'child_process';
import moment from 'moment';

type AddMetadataParams = {
  name: string;
  shopName: string;
  imagePath: string;
};
export function addMetadata({ name, shopName, imagePath }: AddMetadataParams) {
  const currentDate = moment().format('YYYY:MM:DD HH:mm:ss+00:00');

  const metadata = {
    ExifByteOrder: 'Big-endian (Motorola, MM)',
    ImageDescription: name,
    Make: 'Photographer of ' + shopName,
    Model: 'Model of ' + shopName,
    XResolution: 72,
    YResolution: 72,
    ResolutionUnit: 'inches',
    Artist: shopName,
    YCbCrPositioning: 'Centered',
    Copyright: `Copyright ${moment().year()} © ${shopName}`,
    ExifVersion: '0232',
    DateTimeOriginal: currentDate,
    CreateDate: currentDate,
    OffsetTimeOriginal: '+00:00',
    OffsetTimeDigitized: '+00:00',
    FlashpixVersion: '0100',
    ColorSpace: 'Uncalibrated',
    XPTitle: name,
    XPComment: name,
    XPAuthor: shopName,
    XPKeywords: name,
    XPSubject: name,
    CodedCharacterSet: 'UTF8',
    EnvelopeRecordVersion: 4,
    'By-line': shopName,
    CopyrightNotice: `Copyright ${moment().year()} © ${shopName}`,
    ApplicationRecordVersion: 4,
    XMPToolkit: 'Image::ExifTool 12.41',
    DateAcquired: currentDate,
    LastKeywordXMP: shopName,
    Creator: shopName,
    Rights: `Copyright ${moment().year()} © ${shopName}`,
    Subject: name,
    Title: name,
    Rating: 5,
    SubSecCreateDate: currentDate,
    SubSecDateTimeOriginal: currentDate,
  };
  runExiftoolCommand(imagePath, metadata);
}

function runExiftoolCommand(imagePath: string, metadata: any) {
  const metadataArgs = Object.entries(metadata)
    .map(([key, value]) => `-${key}="${value}"`)
    .join(' ');
  const command = `exiftool -overwrite_original ${metadataArgs} "${imagePath}"`;
  exec(command, (error: any, stdout: any, stderr: any) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
  });
}
