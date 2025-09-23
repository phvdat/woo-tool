import { exiftool } from 'exiftool-vendored';
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
    ImageDescription: `${name} - Buy Online at ${shopName}`, // Descriptive and keyword-rich
    Make: `Shop ${shopName}`,
    Model: `Product Model from ${shopName}`,
    XResolution: 72,
    YResolution: 72,
    ResolutionUnit: 'inches',
    Artist: `${shopName} - High-Quality ${name}`, // Include product name for more SEO
    YCbCrPositioning: 'Centered',
    Copyright: `Copyright ${moment().year()} © ${shopName}`,
    ExifVersion: '0232',
    DateTimeOriginal: currentDate,
    CreateDate: currentDate,
    OffsetTimeOriginal: '+00:00',
    OffsetTimeDigitized: '+00:00',
    FlashpixVersion: '0100',
    ColorSpace: 'sRGB', // sRGB is a standard color space for web images
    XPTitle: `${name} - Available Now at ${shopName}`, // Catchy title with keywords
    XPComment: `Discover ${name} at ${shopName}. Perfect for your needs!`, // Encouraging description
    XPAuthor: shopName,
    XPKeywords: `${name}, ${shopName}, Buy ${name}, ${shopName} products, ${name} online`, // Add targeted keywords
    XPSubject: `${name} - ${shopName}`,
    CodedCharacterSet: 'UTF8',
    EnvelopeRecordVersion: 4,
    'By-line': `${shopName} Photography`,
    CopyrightNotice: `Copyright ${moment().year()} © ${shopName}`,
    ApplicationRecordVersion: 4,
    XMPToolkit: 'Image::ExifTool 12.41',
    DateAcquired: currentDate,
    LastKeywordXMP: `${name}, ${shopName}, Shop Now`,
    Creator: `${shopName}`,
    Rights: `Copyright ${moment().year()} © ${shopName}`,
    Subject: `${name} - ${shopName}`,
    Title: `${name} | ${shopName} | Buy Online`,
    Rating: 5,
    SubSecCreateDate: currentDate,
    SubSecDateTimeOriginal: currentDate,
  };
  await await exiftool.write(imagePath, metadata, ['-overwrite_original']);
}
