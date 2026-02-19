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
      <p className="pagination__text">
        Page {page} of {totalPages}
      </p>
      <div className="table-actions">
        <button
          className="btn btn--secondary pagination__nav-btn"
          type="button"
          disabled={prevDisabled}
          onClick={() => onChange(page - 1)}
        >
          Previous
        </button>
        <button
          className="btn btn--secondary pagination__nav-btn"
          type="button"
          disabled={nextDisabled}
          onClick={() => onChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
