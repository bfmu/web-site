import { useState } from "react";
import { getPostUrlBySlug } from "@/utils/url-utils";
import { i18n } from "@i18n/translation";
import I18nKey from "@i18n/i18nKey";

function groupByYear(posts) {
  const grouped = {};
  posts.forEach((post) => {
    const year = new Date(post.published).getFullYear();
    if (!grouped[year]) grouped[year] = [];
    grouped[year].push(post);
  });
  return Object.entries(grouped)
    .map(([year, posts]) => ({ year: Number(year), posts }))
    .sort((a, b) => b.year - a.year);
}

function formatDate(date) {
  const d = new Date(date);
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${month}-${day}`;
}

function formatTag(tags) {
  return tags.map((t) => `#${t}`).join(" ");
}

export default function PostsArchive({
  initialPosts,
  initialPagination,
  fetchUrlBase = "/api/posts",
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [pagination, setPagination] = useState(initialPagination);
  const [loading, setLoading] = useState(false);

  const groups = groupByYear(posts);

  const handleLoadMore = async () => {
    if (loading || pagination.page >= pagination.pages) return;
    setLoading(true);
    const nextPage = pagination.page + 1;
    const res = await fetch(`${fetchUrlBase}?page=${nextPage}`);
    const data = await res.json();
    setPosts((prev) => [...prev, ...data.posts]);
    setPagination(data.pagination);
    setLoading(false);
  };

  return (
    <div className="card-base px-8 py-6">
      {groups.map((group) => (
        <div key={group.year}>
          <div className="flex flex-row w-full items-center h-[3.75rem]">
            <div className="w-[15%] md:w-[10%] transition text-2xl font-bold text-right text-75">
              {group.year}
            </div>
            <div className="w-[15%] md:w-[10%]">
              <div className="h-3 w-3 bg-none rounded-full outline outline-[var(--primary)] mx-auto -outline-offset-[2px] z-50 outline-3"></div>
            </div>
            <div className="w-[70%] md:w-[80%] transition text-left text-50">
              {group.posts.length} {i18n(I18nKey.postsCount)}
            </div>
          </div>
          {group.posts.map((post) => (
            <a
              key={post._id}
              href={getPostUrlBySlug(post.slug)}
              aria-label={post.title}
              className="group btn-plain block h-10 w-full rounded-lg hover:text-[initial]"
            >
              <div className="flex flex-row justify-start items-center h-full">
                {/* date */}
                <div className="w-[15%] md:w-[10%] transition text-sm text-right text-50">
                  {formatDate(post.published)}
                </div>
                {/* dot and line */}
                <div className="w-[15%] md:w-[10%] relative dash-line h-full flex items-center">
                  <div className="transition-all mx-auto w-1 h-1 rounded group-hover:h-5
                      bg-[oklch(0.5_0.05_var(--hue))] group-hover:bg-[var(--primary)]
                      outline outline-4 z-50
                      outline-[var(--card-bg)]
                      group-hover:outline-[var(--btn-plain-bg-hover)]
                      group-active:outline-[var(--btn-plain-bg-active)]"
                  ></div>
                </div>
                {/* post title */}
                <div className="w-[70%] md:max-w-[65%] md:w-[65%] text-left font-bold
                  group-hover:translate-x-1 transition-all group-hover:text-[var(--primary)]
                  text-75 pr-8 whitespace-nowrap overflow-ellipsis overflow-hidden"
                >
                  {post.title}
                </div>
                {/* tag list */}
                <div className="hidden md:block md:w-[15%] text-left text-sm transition
                  whitespace-nowrap overflow-ellipsis overflow-hidden
                  text-30"
                >{formatTag(post.tags)}</div>
              </div>
            </a>
          ))}
        </div>
      ))}
      {pagination.page < pagination.pages && (
        <button
          type="button"
          className="btn-primary mt-4 mx-auto block"
          onClick={handleLoadMore}
          disabled={loading}
        >
          {loading ? i18n(I18nKey.loading) || "Cargando..." : i18n(I18nKey.loadMore) || "Cargar más"}
        </button>
      )}
    </div>
  );
}
