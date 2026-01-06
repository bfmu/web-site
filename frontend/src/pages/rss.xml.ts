import { siteConfig } from "@/config";
import rss from "@astrojs/rss";
import { fetchPosts } from "@utils/api-blog";
import type { APIContext } from "astro";
import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";

const parser = new MarkdownIt();

export async function GET(context: APIContext) {
  const res = await fetchPosts({ limit: 100, draft: false });
  const blog = res.docs || res;

  return rss({
    title: siteConfig.title,
    description: siteConfig.subtitle || "No description",
    site: context.site ?? "https://fuwari.vercel.app",
    items: blog.map((post) => {
      return {
        title: post.title,
        pubDate: post.published,
        description: post.description || "",
        link: `/posts/${post.slug}/`,
        content: sanitizeHtml(parser.render(post.content), {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
        }),
      };
    }),
    customData: `<language>${siteConfig.lang}</language>`,
  });
}
