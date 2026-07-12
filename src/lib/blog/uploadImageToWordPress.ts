import { WebsiteConfig } from "@/types/woo";
import axios from "axios";
import path from "path";

export async function uploadImagesToWordpress(
  website: WebsiteConfig,
  imageUrls: string[]
) {
  const token = Buffer.from(
    `${website.wpUsername}:${website.wpAppPassword}`
  ).toString("base64");
  const medias = await Promise.all(
    imageUrls.map(async (imageUrl) => {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
      });
      const filename =
        path.basename(new URL(imageUrl).pathname) || `${Date.now()}.jpg`;
      const { data } = await axios.post(
        `${website.url}/wp-json/wp/v2/media`,
        response.data,
        {
          headers: {
            Authorization: `Basic ${token}`,
            "Content-Type":
              response.headers["content-type"] || "image/jpeg",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
          maxBodyLength: Infinity,
        }
      );
      return data;
    })
  );

  return medias;
}
