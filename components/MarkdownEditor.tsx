"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown, type MarkdownStorage } from "tiptap-markdown";
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

declare module "@tiptap/core" {
  interface Storage {
    markdown: MarkdownStorage;
  }
}

/**
 * Evita que tocar un botón de la barra le quite el foco (y la selección) al
 * editor antes de que se ejecute el comando. En iPadOS/iOS Safari el toque
 * dispara mousedown -> blur del contentEditable -> click, y para cuando
 * llega el click ya se perdió el texto seleccionado, así que "negrita" no
 * se aplicaba a nada. Con preventDefault en mousedown el editor no pierde
 * el foco y el comando actúa sobre la selección real.
 */
const keepEditorFocused = (e: React.MouseEvent) => e.preventDefault();

/**
 * Editor visual de markdown: da formato con botones (negrita, listas,
 * enlaces...) sin que quien escribe tenga que conocer markdown. Por debajo
 * serializa a texto markdown plano vía `onChange`, listo para guardar en
 * cualquier columna de texto y renderizar luego con `MarkdownText`.
 */
export default function MarkdownEditor({
  value,
  onChange,
  placeholder,
  className,
  onRequestImage,
}: {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  className?: string;
  /** Si se pasa, aparece un botón "Insertar foto" en la barra. Debe abrir el
   * selector de fotos y devolver la elegida, o null si se cancela. */
  onRequestImage?: () => Promise<{ src: string; alt: string } | null>;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      ...(onRequestImage ? [Image] : []),
      Markdown.configure({ html: false }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.storage.markdown.getMarkdown());
    },
    editorProps: {
      attributes: {
        class: "markdown-editor-area",
        // Desactiva la corrección automática de iOS: con Tiptap reescribiendo
        // el DOM en cada pulsación, esas ayudas de Safari acaban duplicando o
        // comiéndose letras al escribir en el iPad.
        autocorrect: "off",
        autocapitalize: "sentences",
        spellcheck: "true",
      },
    },
  });

  // El valor externo solo se vuelve a cargar cuando el editor se acaba de
  // montar (p. ej. al cambiar de foto, si quien lo usa remonta con `key`):
  // en cada tecleo ya lo lleva el propio editor, y reescribir el contenido
  // a cada letra le rompería el cursor (y en iPad, además, cierra el teclado).
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
    ...(onRequestImage
      ? [
          {
            label: "Insertar foto",
            icon: <ImageIcon aria-hidden size={14} strokeWidth={2} />,
            active: false,
            onClick: () => {
              onRequestImage().then((picked) => {
                if (!picked) return;
                editor.chain().focus().setImage(picked).run();
              });
            },
          },
        ]
      : []),
  ];

  return (
    <div className={`markdown-editor${className ? ` ${className}` : ""}`}>
      <div className="markdown-editor-toolbar" role="toolbar" aria-label="Formato">
        {buttons.map((b) => (
          <Button
            key={b.label}
            type="button"
            variant="ghost"
            className={`markdown-editor-btn${b.active ? " active" : ""}`}
            onMouseDown={keepEditorFocused}
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
