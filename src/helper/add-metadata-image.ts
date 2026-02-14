import { exiftool } from 'exiftool-vendored';
import moment from 'moment';

type AddMetadataParams = {
  name: string;
  shopName: string;
  imagePath: string;
  category: string;
};
export async function addMetadata({
  name,
  shopName,
  category,
  imagePath,
}: AddMetadataParams) {
  const now = moment().utc();
  const currentDate = now.format('YYYY:MM:DD HH:mm:ss');

  const cleanCategory = category
    .split('>')
    .map(c => c.trim())
    .slice(0, 3)
    .join(', ');

  const metadata = {
    ImageDescription: `${name} by ${shopName}`,
    Title: `${name} | ${shopName}`,
    Subject: cleanCategory,
    XPTitle: name,
    XPKeywords: `${name}, ${cleanCategory}, ${shopName}`,
    XPComment: `${name} available at ${shopName}`,
    Artist: shopName,
    Creator: shopName,
    Copyright: `© ${moment().year()} ${shopName}`,
    Rights: `All rights reserved`,
    DateTimeOriginal: currentDate,
    CreateDate: currentDate,
  };
  await exiftool.write(imagePath, metadata, ['-overwrite_original']);
}
