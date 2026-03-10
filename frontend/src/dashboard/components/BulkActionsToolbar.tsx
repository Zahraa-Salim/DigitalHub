// File: frontend/src/dashboard/components/BulkActionsToolbar.tsx
// Purpose: Renders the dashboard bulk actions toolbar component.
// It packages reusable admin UI and behavior for dashboard pages.

import React from 'react';
import { Trash2, Archive, Copy, Download } from 'lucide-react';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onDelete?: () => void;
  onArchive?: () => void;
  onDuplicate?: () => void;
  onExport?: () => void;
  onDeselectAll?: () => void;
  isLoading?: boolean;
}

export const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
  selectedCount,
  onDelete,
  onArchive,
  onDuplicate,
  onExport,
  onDeselectAll,
  isLoading = false,
}) => {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="bulk-actions-toolbar" role="toolbar" aria-label="Bulk actions">
      <div className="bulk-actions-toolbar__info">
        <span className="bulk-actions-toolbar__count">
          {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
        </span>
      </div>

      <div className="bulk-actions-toolbar__actions">
        {onExport && (
          <button
            className="btn btn--secondary btn--sm"
            onClick={onExport}
            disabled={isLoading}
            title="Export selected items"
            aria-label={`Export ${selectedCount} selected items`}
          >
            <Download size={16} />
            Export
          </button>
        )}

        {onDuplicate && (
          <button
            className="btn btn--secondary btn--sm"
            onClick={onDuplicate}
            disabled={isLoading}
            title="Duplicate selected items"
            aria-label={`Duplicate ${selectedCount} selected items`}
          >
            <Copy size={16} />
            Duplicate
          </button>
        )}

        {onArchive && (
          <button
            className="btn btn--secondary btn--sm"
            onClick={onArchive}
            disabled={isLoading}
            title="Archive selected items"
            aria-label={`Archive ${selectedCount} selected items`}
          >
            <Archive size={16} />
            Archive
          </button>
        )}

        {onDelete && (
          <button
            className="btn btn--danger btn--sm"
            onClick={onDelete}
            disabled={isLoading}
            title="Delete selected items"
            aria-label={`Delete ${selectedCount} selected items`}
          >
            <Trash2 size={16} />
            Delete
          </button>
        )}

        {onDeselectAll && (
          <button
            className="btn btn--secondary btn--sm"
            onClick={onDeselectAll}
            disabled={isLoading}
            title="Deselect all items"
            aria-label="Clear selection"
          >
            Clear Selection
          </button>
        )}
      </div>
    </div>
  );
};

