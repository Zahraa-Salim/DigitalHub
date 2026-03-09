import type { ReactNode } from "react";
import { cn } from "../utils/cn";

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

type FilterBarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  selects?: FilterSelect[];
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  extra?: ReactNode;
};

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  selects = [],
  actionLabel,
  onAction,
  className,
  extra,
}: FilterBarProps) {
  return (
    <div className={cn("card filters-grid", className)}>
      <label className="field posts-filters__search">
        <span className="field__label">Search</span>
        <input
          className="field__control field__control--icon-search"
          type="search"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
        />
      </label>

      {selects.map((select) => (
        <label className="field" key={select.label}>
          <span className="field__label">{select.label}</span>
          <select
            className="field__control"
            value={select.value}
            onChange={(event) => select.onChange(event.target.value)}
          >
            {select.options.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}

      {extra}

      {actionLabel && onAction ? (
        <div className="posts-filters__actions">
          <button className="btn btn--primary" type="button" onClick={onAction}>
            {actionLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
