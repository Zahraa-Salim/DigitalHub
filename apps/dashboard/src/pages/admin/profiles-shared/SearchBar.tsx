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
