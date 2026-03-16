// File: frontend/src/dashboard/pages/admin/profiles-shared/Filters.tsx
// Purpose: Renders the admin filters page in the dashboard.
// It combines dashboard data loading, actions, and page-level UI for this screen.

type FilterOption = {
  label: string;
  value: string;
};

type FilterSelect = {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
};

type FiltersProps = {
  selects: FilterSelect[];
};

export function Filters({ selects }: FiltersProps) {
  return (
    <section className="students-filters">
      <div className="students-filters__grid">
        {selects.map((select) => (
          <label key={select.label} className="students-field">
            <span className="students-field__label">{select.label}</span>
            <select
              className="students-field__control"
              value={select.value}
              onChange={(event) => select.onChange(event.target.value)}
            >
              {select.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </section>
  );
}

