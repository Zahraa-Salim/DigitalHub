import { useState } from "react";
import { EditorProvider, useEditor } from "../../../components/cms-editor/EditorContext";
import { CmsEditorCanvas, type EditorPage } from "../../../components/cms-editor/CmsEditorCanvas";
import "../../../styles/cms-visual-editor.css";

const TABS: Array<{ key: EditorPage; label: string }> = [
  { key: "home", label: "Home sections" },
  { key: "about", label: "About page" },
];

function EditorTopBar({ page, onPageChange }: { page: EditorPage; onPageChange: (page: EditorPage) => void }) {
  const { hasDirty, saving, error, successMsg, saveAll } = useEditor();

  return (
    <div className="cms-editor-topbar">
      <div className="cms-editor-topbar__left">
        <span className="cms-editor-topbar__title">Visual Site Editor</span>
        <div className="cms-editor-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`cms-editor-tab${page === tab.key ? " cms-editor-tab--active" : ""}`}
              onClick={() => onPageChange(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="cms-editor-topbar__right">
        {error ? <span className="cms-editor-topbar__error">{error}</span> : null}
        {successMsg ? <span className="cms-editor-topbar__success">{successMsg}</span> : null}
        <button
          className="cms-editor-topbar__save"
          type="button"
          onClick={() => void saveAll()}
          disabled={!hasDirty || saving}
        >
          {saving ? "Saving..." : hasDirty ? "Save All Changes" : "No Changes"}
        </button>
        <span className="cms-editor-topbar__hint" style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "6px" }}>
          Changes appear on the public site within ~60 seconds.
        </span>
      </div>
    </div>
  );
}

export function CmsVisualEditorPage() {
  const [page, setPage] = useState<EditorPage>("home");

  return (
    <EditorProvider>
      <div className="cms-editor-page">
        <EditorTopBar page={page} onPageChange={setPage} />
        <div className="cms-canvas-scroll">
          <div className="cms-editor-canvas-frame">
            <CmsEditorCanvas page={page} />
          </div>
        </div>
      </div>
    </EditorProvider>
  );
}
