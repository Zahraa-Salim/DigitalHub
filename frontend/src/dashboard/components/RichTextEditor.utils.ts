import type { Editor } from "@tiptap/core";

export function getPlainTextFromHtml(html: string): string {
  if (!html || !html.trim()) return "";

  const withNewlines = html
    .replace(/<\/p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n");

  const div = document.createElement("div");
  div.innerHTML = withNewlines;
  const text = div.textContent?.trim() ?? "";
  return text.replace(/\n{3,}/g, "\n\n");
}

export function insertTokenIntoEditor(editor: Editor, token: string) {
  editor.chain().focus().insertContent(token).run();
}
