"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Markdown, type MarkdownStorage } from "tiptap-markdown";
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

declare module "@tiptap/core" {
  interface Storage {
    markdown: MarkdownStorage;
  }
}

/**
 * Editor visual de la descripción: da formato con botones (negrita, listas,
 * enlaces...) sin que quien escribe tenga que conocer markdown. Por debajo se
 * guarda como markdown de texto plano, en la misma columna `description`.
 */
export default function DescriptionEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (markdown: string) => void;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      Markdown.configure({ html: false }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.storage.markdown.getMarkdown());
    },
    editorProps: {
      attributes: { class: "description-editor-area" },
    },
  });

  // El valor externo solo se vuelve a cargar cuando cambia de foto (id
  // distinto o editor recién montado): en cada tecleo ya lo lleva el propio
  // editor, y reescribir el contenido a cada letra le rompería el cursor.
  useEffect(() => {
    if (!editor) return;
    const current = editor.storage.markdown.getMarkdown();
    if (current !== value) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) return null;

  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Dirección del enlace", previous ?? "https://");
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  const buttons: {
    label: string;
    icon: React.ReactNode;
    active: boolean;
    onClick: () => void;
  }[] = [
    {
      label: "Negrita",
      icon: <Bold aria-hidden size={14} strokeWidth={2} />,
      active: editor.isActive("bold"),
      onClick: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: "Cursiva",
      icon: <Italic aria-hidden size={14} strokeWidth={2} />,
      active: editor.isActive("italic"),
      onClick: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: "Tachado",
      icon: <Strikethrough aria-hidden size={14} strokeWidth={2} />,
      active: editor.isActive("strike"),
      onClick: () => editor.chain().focus().toggleStrike().run(),
    },
    {
      label: "Lista",
      icon: <List aria-hidden size={14} strokeWidth={2} />,
      active: editor.isActive("bulletList"),
      onClick: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Lista numerada",
      icon: <ListOrdered aria-hidden size={14} strokeWidth={2} />,
      active: editor.isActive("orderedList"),
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "Cita",
      icon: <Quote aria-hidden size={14} strokeWidth={2} />,
      active: editor.isActive("blockquote"),
      onClick: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      label: "Enlace",
      icon: <LinkIcon aria-hidden size={14} strokeWidth={2} />,
      active: editor.isActive("link"),
      onClick: setLink,
    },
  ];

  return (
    <div className="description-editor">
      <div className="description-editor-toolbar" role="toolbar" aria-label="Formato">
        {buttons.map((b) => (
          <Button
            key={b.label}
            type="button"
            variant="ghost"
            className={`description-editor-btn${b.active ? " active" : ""}`}
            onClick={b.onClick}
            title={b.label}
            aria-label={b.label}
            aria-pressed={b.active}
          >
            {b.icon}
          </Button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
