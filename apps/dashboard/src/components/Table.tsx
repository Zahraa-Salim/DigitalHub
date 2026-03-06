import type { ReactNode } from "react";

type TableColumn<T> = {
  key: string;
  label: string;
  className?: string;
  render: (row: T) => ReactNode;
};

type TableProps<T> = {
  columns: Array<TableColumn<T>>;
  rows: T[];
  rowKey: (row: T) => string | number;
  emptyMessage?: string;
};

export function Table<T>({ columns, rows, rowKey, emptyMessage = "No records found." }: TableProps<T>) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((column) => (
                  <td key={column.key} className={column.className}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length}>
                <div className="empty-state">
                  <p className="empty-state__title">No data</p>
                  <p className="empty-state__description">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
