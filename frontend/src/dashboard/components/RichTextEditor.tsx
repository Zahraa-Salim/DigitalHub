// File: frontend/src/dashboard/components/RichTextEditor.tsx
// Purpose: Reusable TipTap rich text editor for composing HTML email messages.

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useCallback, useRef } from "react";
import "../styles/rich-editor.css";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onEditorReady?: (editor: EditorInstance) => void;
  disabled?: boolean;
};

type EditorInstance = NonNullable<ReturnType<typeof useEditor>>;

function ToolbarButton({
  active,
  onMouseDown,
  title,
  children,
}: {
  active?: boolean;
  onMouseDown: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`rte-toolbar__btn${active ? " rte-toolbar__btn--active" : ""}`}
      onMouseDown={(event) => {
        event.preventDefault();
        onMouseDown();
      }}
      title={title}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: EditorInstance }) {
  const setLink = useCallback(() => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  return (
    <div className="rte-toolbar">
      <ToolbarButton active={editor.isActive("bold")} onMouseDown={() => editor.chain().focus().toggleBold().run()} title="Bold">
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("italic")} onMouseDown={() => editor.chain().focus().toggleItalic().run()} title="Italic">
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("underline")} onMouseDown={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
        <u>U</u>
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("strike")} onMouseDown={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
        <s>S</s>
      </ToolbarButton>

      <span className="rte-toolbar__sep" />

      <ToolbarButton active={editor.isActive("heading", { level: 2 })} onMouseDown={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
        H2
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("heading", { level: 3 })} onMouseDown={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
        H3
      </ToolbarButton>

      <span className="rte-toolbar__sep" />

      <ToolbarButton active={editor.isActive("bulletList")} onMouseDown={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
        &#8226;
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("orderedList")} onMouseDown={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered List">
        1.
      </ToolbarButton>

      <span className="rte-toolbar__sep" />

      <ToolbarButton active={editor.isActive("link")} onMouseDown={setLink} title="Link">
        &#128279;
      </ToolbarButton>
    </div>
  );
}

export function RichTextEditor({ value, onChange, placeholder, onEditorReady, disabled = false }: RichTextEditorProps) {
  const suppressUpdate = useRef(false);
  const readyFired = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } }),
      ImageExtension,
      Placeholder.configure({ placeholder: placeholder ?? "Compose your message..." }),
    ],
    content: value || "",
    editable: !disabled,
    onUpdate: ({ editor: e }) => {
      if (suppressUpdate.current) return;
      onChange(e.getHTML());
    },
  });

  useEffect(() => {
    if (editor && onEditorReady && !readyFired.current) {
      readyFired.current = true;
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== value && value !== undefined) {
      suppressUpdate.current = true;
      editor.commands.setContent(value || "", { emitUpdate: false });
      suppressUpdate.current = false;
    }
  }, [value, editor]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  if (!editor) return null;

  return (
    <div className="rte-wrapper">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="rte-content" />
    </div>
  );
}

export default RichTextEditor;
