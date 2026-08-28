"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import AppHeader from "@/components/AppHeader";
import MarkdownText from "@/components/MarkdownText";
import { useScrollBorder } from "@/lib/useScrollBorder";
import {
  isStaff,
  STATUS_LABELS,
  type SiteContent,
  type Story,
  type StoryComment,
  type Viewer,
} from "@/lib/types";
import {
  addStoryComment,
  listStoryComments,
  setStoryCommentStatus,
  toggleStoryLike,
} from "@/app/actions/social";

const dateFormat = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default function StoryView({
  story,
  site,
  viewer,
  likedInitially,
}: {
  story: Story;
  site: SiteContent;
  viewer: Viewer;
  likedInitially: boolean;
}) {
  const { scrolled, onScroll } = useScrollBorder();

  const [liked, setLiked] = useState(likedInitially);
  const [likes, setLikes] = useState(story.likes);
  const [comments, setComments] = useState<StoryComment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showJoin, setShowJoin] = useState(false);
  const [pending, startTransition] = useTransition();

  const askToJoin = () => {
    if (!viewer) setShowJoin(true);
  };
  const joining = showJoin && !viewer;

  const draftRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = draftRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);

  useEffect(() => {
    let cancelled = false;
    listStoryComments(story.id).then((list) => {
      if (!cancelled) setComments(list);
    });
    return () => {
      cancelled = true;
    };
  }, [story.id]);

  const onLike = () => {
    if (!viewer) return askToJoin();
    setLiked((v) => !v);
    setLikes((n) => n + (liked ? -1 : 1));
    startTransition(async () => {
      const res = await toggleStoryLike(story.id);
      if (res.ok) {
        setLiked(res.liked);
        setLikes(res.likes);
      } else {
        setLiked(likedInitially);
        setLikes(story.likes);
        setError(res.error);
      }
    });
  };

  const onComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewer) return askToJoin();
    const text = draft.trim();
    if (!text) return;
    setError(null);
    startTransition(async () => {
      const res = await addStoryComment(story.id, text);
      if (!res.ok) return setError(res.error);
      setComments((list) => [...(list ?? []), res.comment]);
      setDraft("");
    });
  };

  const onWithdrawComment = (id: string) => {
    startTransition(async () => {
      const res = await setStoryCommentStatus(id, "rejected");
      if (!res.ok) return setError(res.error);
      setComments((list) =>
        (list ?? []).map((c) => (c.id === id ? { ...c, status: "rejected" } : c))
      );
    });
  };

  return (
    <main className="admin historias-page">
      <AppHeader site={site} viewer={viewer} scrolled={scrolled} />

      <div className="pane" onScroll={onScroll}>
        <article className="story-page">
          {story.coverImage && (
            <div className="story-cover">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={story.coverImage} alt="" />
            </div>
          )}

          <header className="story-head">
            <h1 className="story-title">{story.title}</h1>
            <p className="story-meta">
              {story.publishedAt && dateFormat.format(new Date(story.publishedAt))}
              {story.authorName && ` · ${story.authorName}`}
            </p>
          </header>

          <MarkdownText className="story-body" text={story.contentMd} />

          <div className="story-social">
            <Button
              variant="ghost"
              className={`like-btn${liked ? " liked" : ""}`}
              onClick={onLike}
              disabled={pending}
              aria-pressed={liked}
              title="Me gusta"
            >
              <Heart
                aria-hidden
                size={16}
                strokeWidth={1.8}
                fill={liked ? "currentColor" : "none"}
              />
              {likes}
            </Button>
            <span className="social-count">
              {comments === null
                ? "…"
                : comments.length === 1
                  ? "1 comentario"
                  : `${comments.length} comentarios`}
            </span>
          </div>

          {error && <p className="admin-error">{error}</p>}

          <ul className="comment-list">
            {(comments ?? []).map((c) => (
              <li key={c.id}>
                <div className="comment-head">
                  <span className="comment-author">{c.authorName}</span>
                  <span className="comment-date">
                    {dateFormat.format(new Date(c.createdAt))}
                  </span>
                  {c.status !== "published" && (
                    <span className={`comment-status ${c.status}`}>
                      {STATUS_LABELS[c.status]}
                    </span>
                  )}
                  {c.status !== "rejected" &&
                    (c.userId === viewer?.id || isStaff(viewer)) && (
                      <Button
                        variant="ghost"
                        className="comment-delete"
                        onClick={() => onWithdrawComment(c.id)}
                        aria-label="Retirar comentario"
                        title="Retirar comentario"
                      >
                        Retirar
                      </Button>
                    )}
                </div>
                <p className="comment-body">{c.body}</p>
              </li>
            ))}
          </ul>

          {joining ? (
            <div className="join-cta">
              <p className="join-cta-title">
                ¿Quieres comentar esta historia o darle a me gusta?
              </p>
              <p className="join-cta-body">
                Hazte una cuenta y podrás comentar y marcar lo que te guste.
                Es gratis y solo necesitas tu correo. No hay que recordar
                ninguna contraseña.
              </p>
              <Link href="/entrar" className="join-cta-link">
                Crear mi cuenta
              </Link>
            </div>
          ) : (
            <form className="comment-form" onSubmit={onComment}>
              <Textarea
                ref={draftRef}
                rows={1}
                value={draft}
                maxLength={2000}
                readOnly={!viewer}
                placeholder="¿Qué te parece esta historia?"
                onChange={(e) => setDraft(e.target.value)}
                onFocus={askToJoin}
              />
              {draft.trim() && (
                <Button type="submit" variant="ghost" className="save-btn" disabled={pending}>
                  Comentar
                </Button>
              )}
            </form>
          )}
        </article>
      </div>
    </main>
  );
}
