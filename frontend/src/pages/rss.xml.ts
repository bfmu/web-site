import { siteConfig } from "@/config";
import rss from "@astrojs/rss";
import { fetchPosts } from "@utils/api-blog";
import type { APIContext } from "astro";
import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";

const parser = new MarkdownIt();

function contentToHtml(rawContent: string): string {
  const content = rawContent || "";
  const trimmed = content.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("<") || /<[a-z][\s\S]*>/i.test(trimmed)) {
    return trimmed;
  }
  return parser.render(trimmed);
}

export async function GET(context: APIContext): Promise<Response> {
  const res = await fetchPosts({ limit: 100, draft: false });
  const posts = res.posts || res.docs || (Array.isArray(res) ? res : []);

  return rss({
    title: siteConfig.title,
    description: siteConfig.subtitle || "No description",
    site: context.site ?? "https://fuwari.vercel.app",
    items: posts.map((post: any) => {
      return {
        title: post.title,
        pubDate: post.published,
        description: post.description || "",
        link: `/posts/${post.slug}/`,
        content: sanitizeHtml(contentToHtml(post.content || ""), {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
        }),
      };
    }),
    customData: `<language>${siteConfig.lang}</language>`,
  });
}
