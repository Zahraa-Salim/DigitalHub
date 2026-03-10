// File: frontend/src/dashboard/components/Pagination.tsx
// Purpose: Renders the dashboard pagination component.
// It packages reusable admin UI and behavior for dashboard pages.

type PaginationProps = {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
};

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  const nextDisabled = page >= totalPages;
  const prevDisabled = page <= 1;

  return (
    <div className="pagination">
      <button
        className="btn btn--secondary pagination__nav-btn pagination__prev"
        type="button"
        disabled={prevDisabled}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </button>

      <p className="pagination__text">
        Page {page} of {totalPages}
      </p>

      <button
        className="btn btn--secondary pagination__nav-btn pagination__next"
        type="button"
        disabled={nextDisabled}
        onClick={() => onChange(page + 1)}
      >
        Next
      </button>
    </div>
  );
}

