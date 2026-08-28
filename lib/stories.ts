import { PHOTO_BUCKET, publicUrl, slugify } from "./photos";
import type { Story, StoryComment, StoryCommentRow, StoryRow } from "./types";

export { slugify };

/** URL pública de la portada de una historia, en el mismo bucket que /fotos. */
export const coverImageUrl = (path: string) => publicUrl(PHOTO_BUCKET, path);

/** Fila de la base de datos → objeto de la interfaz. */
export function toStory(
  row: StoryRow & {
    likes?: { count: number }[] | null;
    comments?: { count: number }[] | null;
    author?: { display_name: string } | null;
  }
): Story {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    contentMd: row.content_md,
    coverImage: coverImageUrl(row.cover_image_path),
    coverImagePath: row.cover_image_path,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    status: row.status,
    featured: row.featured,
    authorId: row.author_id,
    authorName: row.author?.display_name ?? "",
    reviewNote: row.review_note,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    likes: row.likes?.[0]?.count ?? 0,
    comments: row.comments?.[0]?.count ?? 0,
  };
}

/** Columnas de `story_comments` a pedir para poder mapear con `toStoryComment`. */
export const STORY_COMMENT_SELECT =
  "id, story_id, user_id, body, status, review_note, created_at, author:profiles!story_comments_user_id_fkey(display_name), story:stories!story_comments_story_id_fkey(title, slug)";

type StoryCommentAuthor = { display_name: string };
type StoryCommentStory = { title: string; slug: string };

export function toStoryComment(
  row: StoryCommentRow & {
    author?: StoryCommentAuthor | StoryCommentAuthor[] | null;
    story?: StoryCommentStory | StoryCommentStory[] | null;
  }
): StoryComment {
  const author = Array.isArray(row.author) ? row.author[0] : row.author;
  const story = Array.isArray(row.story) ? row.story[0] : row.story;
  return {
    id: row.id,
    storyId: row.story_id,
    storyTitle: story?.title ?? "",
    storySlug: story?.slug ?? "",
    userId: row.user_id,
    authorName: author?.display_name || "Anónimo",
    body: row.body,
    status: row.status,
    reviewNote: row.review_note,
    createdAt: row.created_at,
  };
}
