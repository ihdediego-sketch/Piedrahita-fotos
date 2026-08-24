import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Sin rehype-raw ni dangerouslySetInnerHTML: cualquier HTML que alguien
 * escriba en el texto se enseña tal cual, nunca se ejecuta.
 */
export default function MarkdownText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}
