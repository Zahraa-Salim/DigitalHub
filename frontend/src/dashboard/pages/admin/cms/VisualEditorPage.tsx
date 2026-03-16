import { EditorProvider, useEditor } from "../../../components/cms-editor/EditorContext";
import { CmsEditorCanvas } from "../../../components/cms-editor/CmsEditorCanvas";
import "../../../styles/cms-visual-editor.css";

function EditorTopBar() {
  const { hasDirty, saving, error, successMsg, saveAll } = useEditor();

  return (
    <div className="cms-editor-topbar">
      <div className="cms-editor-topbar__left">
        <span className="cms-editor-topbar__title">Visual Site Editor</span>
        <span className="cms-editor-topbar__hint">Click any text or image on the page to edit it</span>
      </div>
      <div className="cms-editor-topbar__right">
        {error ? <span className="cms-editor-topbar__error">{error}</span> : null}
        {successMsg ? <span className="cms-editor-topbar__success">{successMsg}</span> : null}
        <button className="cms-editor-topbar__save" type="button" onClick={() => void saveAll()} disabled={!hasDirty || saving}>
          {saving ? "Saving..." : hasDirty ? "Save All Changes" : "No Changes"}
        </button>
      </div>
    </div>
  );
}

export function CmsVisualEditorPage() {
  return (
    <EditorProvider>
      <div className="cms-editor-page">
        <EditorTopBar />
        <div className="cms-canvas-scroll">
          <div className="cms-editor-canvas-frame">
            <CmsEditorCanvas />
          </div>
        </div>
      </div>
    </EditorProvider>
  );
}
