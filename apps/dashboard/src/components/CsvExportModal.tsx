import { useEffect, useMemo, useState } from "react";

export type CsvExportColumn<T> = {
  key: string;
  label: string;
  getValue: (row: T) => unknown;
  enabledByDefault?: boolean;
};

export type CsvExportRowScope<T> = {
  id: string;
  label: string;
  rows: T[];
  default?: boolean;
};

type CsvExportModalProps<T> = {
  open: boolean;
  onClose: () => void;
  title?: string;
  filename: string;
  columns: CsvExportColumn<T>[];
  rowScopes: CsvExportRowScope<T>[];
};

function toCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }
  return value;
}

function buildCsv<T>(rows: T[], columns: CsvExportColumn<T>[]): string {
  const header = columns.map((column) => escapeCsv(column.label)).join(",");
  const lines = rows.map((row) =>
    columns
      .map((column) => escapeCsv(toCellValue(column.getValue(row))))
      .join(","),
  );
  return [header, ...lines].join("\r\n");
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function CsvExportModal<T>({
  open,
  onClose,
  title = "Export CSV",
  filename,
  columns,
  rowScopes,
}: CsvExportModalProps<T>) {
  const availableScopes = useMemo(
    () => rowScopes.filter((scope) => scope.rows.length > 0),
    [rowScopes],
  );

  const defaultScopeId = useMemo(() => {
    const explicitDefault = availableScopes.find((scope) => scope.default);
    return explicitDefault?.id ?? availableScopes[0]?.id ?? "";
  }, [availableScopes]);

  const [selectedScopeId, setSelectedScopeId] = useState<string>(defaultScopeId);
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setSelectedScopeId(defaultScopeId);
    const initialColumns = columns
      .filter((column) => column.enabledByDefault !== false)
      .map((column) => column.key);
    setSelectedColumnKeys(initialColumns.length ? initialColumns : columns.map((column) => column.key));
  }, [open, defaultScopeId, columns]);

  const activeScope = availableScopes.find((scope) => scope.id === selectedScopeId) ?? availableScopes[0];
  const exportRows = activeScope?.rows ?? [];
  const exportColumns = columns.filter((column) => selectedColumnKeys.includes(column.key));

  const allColumnsSelected = selectedColumnKeys.length === columns.length;
  const canExport = Boolean(exportRows.length && exportColumns.length);

  if (!open) {
    return null;
  }

  return (
    <div className="admx-modal" role="presentation">
      <div className="admx-modal__backdrop" onClick={onClose} />
      <div className="admx-modal__card csv-export-modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="admx-modal__header">
          <div>
            <h3>{title}</h3>
            <p>{exportRows.length} row(s) ready</p>
          </div>
        </header>

        <div className="admx-modal__body csv-export-modal__body">
          <div className="csv-export-modal__section">
            <p className="admx-label">Rows</p>
            <div className="admx-chip-row">
              {availableScopes.map((scope) => (
                <button
                  key={scope.id}
                  type="button"
                  className={selectedScopeId === scope.id ? "admx-chip admx-chip--active" : "admx-chip"}
                  onClick={() => setSelectedScopeId(scope.id)}
                >
                  {scope.label} ({scope.rows.length})
                </button>
              ))}
            </div>
          </div>

          <div className="csv-export-modal__section">
            <div className="csv-export-modal__section-head">
              <p className="admx-label">Columns</p>
              <button
                className="btn btn--secondary btn--sm"
                type="button"
                onClick={() =>
                  setSelectedColumnKeys(
                    allColumnsSelected ? [] : columns.map((column) => column.key),
                  )
                }
              >
                {allColumnsSelected ? "Unselect All" : "Select All"}
              </button>
            </div>
            <div className="csv-export-modal__columns">
              {columns.map((column) => {
                const checked = selectedColumnKeys.includes(column.key);
                return (
                  <label key={column.key} className="csv-export-modal__column">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setSelectedColumnKeys((current) => [...current, column.key]);
                          return;
                        }
                        setSelectedColumnKeys((current) => current.filter((key) => key !== column.key));
                      }}
                    />
                    <span>{column.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <footer className="admx-modal__footer">
          <button className="btn btn--secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn--primary"
            type="button"
            disabled={!canExport}
            onClick={() => {
              const csv = buildCsv(exportRows, exportColumns);
              downloadCsv(csv, filename);
              onClose();
            }}
          >
            Export CSV
          </button>
        </footer>
      </div>
    </div>
  );
}

