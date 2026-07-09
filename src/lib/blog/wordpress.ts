import axios from "axios";
import slugify from "slugify";
import type { BlogArticle } from "./types";
import { WebsiteConfig } from "@/types/woo";
import path from "path";

export async function publishWordpress(
    website: WebsiteConfig,
    article: BlogArticle,
    featuredMediaId?: number
) {
    const slug = slugify(article.title, {
        lower: true,
        strict: true,
        trim: true,
    });

    const token = Buffer.from(
        `${website.autoBlog.wpUsername}:${website.autoBlog.wpAppPassword}`
    ).toString("base64");

    const { data } = await axios.post(
        `${website.url}/wp-json/wp/v2/posts`,
        {
            title: article.title,
            slug,
            excerpt: article.excerpt,
            content: article.content,
            status: website.autoBlog.status,
            featured_media: featuredMediaId,
        },
        {
            headers: {
                Authorization: `Basic ${token}`,
            },
        }
    );
    return data;
}


export async function uploadImagesToWordpress(
    website: WebsiteConfig,
    imageUrls: string[]
) {
    const token = Buffer.from(
        `${website.autoBlog.wpUsername}:${website.autoBlog.wpAppPassword}`
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