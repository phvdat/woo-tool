import * as XLSX from 'xlsx';
import { mkdirSync } from 'fs';
import axios from 'axios';

interface SheetData {
  name: string;
  images: string;
}

const formatNameRegex = /[^a-zA-Z0-9\s]/g;

export async function POST(request: Request) {
  try {
    const payload = await request.formData();
    const logoUrl = payload.get('logoUrl') as string;
    const logoWidth = Number(payload.get('logoWidth'));
    const logoHeight = Number(payload.get('logoHeight'));
    const imageWidth = Number(payload.get('imageWidth'));
    const imageHeight = Number(payload.get('imageHeight'));
    const idTelegram = payload.get('idTelegram') as string;
    const shopName = payload.get('shopName') as string;
    const quality = Number(payload.get('quality'));
    const excelFile = payload.getAll('excelFile') as File[];

    // define imagesFolderPath
    const imagesFolderPath = `media/images-${Date.now()}`;
    mkdirSync(imagesFolderPath, { recursive: true });
    const zipFileName = `images-${Date.now()}.zip`;
    const zipFilePath = `./media/${zipFileName}`;

    // read excelFile with xlsx
    const workbook = XLSX.read(await excelFile[0].arrayBuffer(), {
      type: 'array',
    });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet) as SheetData[];

    // get logo image
    const logoResponse = await axios.get(logoUrl, {
      responseType: 'arraybuffer',
    });

    for (const item of data) {
      const originName = item['name'];
      const name = originName.replace(formatNameRegex, '');
      const imagesList = item['images'].split(',');
      const folderPath = `${imagesFolderPath}/${name}`;
      mkdirSync(folderPath, { recursive: true });
      for (let i = 0,len = imagesList.length; i < len; i++) {
        const imageUrl = imagesList[i];
				const imageName = `${name.replaceAll(' ', '-')}-${i + 1}.jpg`;
				const imagePath = `${folderPath}/${imageName}`;
        try {
          const {data: imageResponse} = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
          })
        } catch (error) {
          
        }
    }
    return Response.json('Successfully', { status: 200 });
  } catch (error) {
    return Response.json(error, { status: 500 });
  }
}
