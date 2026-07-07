import axios from "axios";
import slugify from "slugify";
import type { BlogArticle } from "./types";
import { WebsiteConfig } from "@/types/woo";

export async function publishWordpress(
    website: WebsiteConfig,
    article: BlogArticle
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
        },
        {
            headers: {
                Authorization: `Basic ${token}`,
            },
        }
    );
    return data;
}