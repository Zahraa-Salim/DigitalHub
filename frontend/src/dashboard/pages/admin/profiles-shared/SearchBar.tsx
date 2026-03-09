// File: frontend/src/dashboard/pages/admin/profiles-shared/SearchBar.tsx
// What this code does:
// 1) Implements admin dashboard screens and operator workflows.
// 2) Loads and binds management data to interactive controls.
// 3) Coordinates tables, forms, filters, and modal state.
// 4) Triggers API actions and surfaces user-facing feedback.
import { Search } from "lucide-react";

type SearchBarProps = {
  value: string;
  placeholder: string;
  ariaLabel: string;
  onChange: (value: string) => void;
};

export function SearchBar({ value, placeholder, ariaLabel, onChange }: SearchBarProps) {
  return (
    <div className="students-search">
      <Search size={18} className="students-search__icon" aria-hidden="true" />
      <input
        className="students-search__input"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
    </div>
  );
}
