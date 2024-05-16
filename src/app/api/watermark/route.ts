interface Payload {
  logoUrl: string;
  logoWidth: number;
  logoHeight: number;
  imageWidth: number;
  imageHeight: number;
  idTelegram: string;
  shopName: string;
  quality: number;
  excelFile: File[];
}
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    console.log(payload);
    return Response.json('Successfully', { status: 200 });
  } catch (error) {
    return Response.json(error, { status: 500 });
  }
}
