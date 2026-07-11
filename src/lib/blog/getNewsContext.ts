import Parser from "rss-parser";

const parser = new Parser();

export type NewsContext = {
    title: string;
    description: string;
    link: string;
    pubDate: string;
};

export async function getNewsContext(
    keyword: string
): Promise<NewsContext[]> {
    const url =
        `https://news.google.com/rss/search?` +
        `q=${encodeURIComponent(keyword)}` +
        `&hl=en-US&gl=US&ceid=US:en`;

    const xml = await fetch(url).then(r => r.text());

    const feed = await parser.parseString(xml);

    return feed.items.slice(0, 5).map(item => ({
        title: item.title ?? "",
        description: item.contentSnippet ?? "",
        link: item.link ?? "",
        pubDate: item.pubDate ?? "",
    }));
}