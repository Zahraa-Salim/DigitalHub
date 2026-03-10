// File: frontend/src/dashboard/components/AdvancedFilterPanel.tsx
// Purpose: Renders the dashboard advanced filter panel component.
// It packages reusable admin UI and behavior for dashboard pages.

import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

export interface FilterCondition {
  id: string;
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between' | 'in' | 'isEmpty' | 'isNotEmpty';
  value: string | string[];
}

type FilterOperator = FilterCondition["operator"];

interface AdvancedFilterPanelProps {
  filters: FilterCondition[];
  onFiltersChange: (filters: FilterCondition[]) => void;
  availableFields: Array<{
    name: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'select' | 'checkbox';
    options?: Array<{ value: string; label: string }>;
  }>;
  onApply?: () => void;
  onReset?: () => void;
  isLoading?: boolean;
}

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'startsWith', label: 'Starts with' },
  { value: 'endsWith', label: 'Ends with' },
  { value: 'greaterThan', label: 'Greater than' },
  { value: 'lessThan', label: 'Less than' },
  { value: 'between', label: 'Between' },
  { value: 'in', label: 'In' },
  { value: 'isEmpty', label: 'Is empty' },
  { value: 'isNotEmpty', label: 'Is not empty' },
];

export const AdvancedFilterPanel: React.FC<AdvancedFilterPanelProps> = ({
  filters,
  onFiltersChange,
  availableFields,
  onApply,
  onReset,
  isLoading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const addFilter = () => {
    if (availableFields.length === 0) return;
    const newFilter: FilterCondition = {
      id: Date.now().toString(),
      field: availableFields[0].name,
      operator: 'equals',
      value: '',
    };
    onFiltersChange([...filters, newFilter]);
  };

  const removeFilter = (id: string) => {
    onFiltersChange(filters.filter((f) => f.id !== id));
  };

  const updateFilter = (id: string, updates: Partial<FilterCondition>) => {
    onFiltersChange(
      filters.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const handleApply = () => {
    onApply?.();
    setIsOpen(false);
  };

  const handleReset = () => {
    onReset?.();
    onFiltersChange([]);
  };

  const getFieldType = (fieldName: string) => {
    return availableFields.find((f) => f.name === fieldName)?.type || 'text';
  };

  return (
    <div className="advanced-filter-panel">
      <button
        className="btn btn--secondary btn--sm"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="filter-panel-content"
      >
        {filters.length > 0 ? `Filters (${filters.length})` : 'Advanced Filters'}
      </button>

      {isOpen && (
        <div
          id="filter-panel-content"
          className="advanced-filter-panel__content"
          role="region"
          aria-label="Advanced filter options"
        >
          <div className="advanced-filter-panel__conditions">
            {filters.length === 0 ? (
              <p className="advanced-filter-panel__empty">No filters applied</p>
            ) : null}

            {filters.map((filter) => (
              <div key={filter.id} className="filter-condition">
                <select
                  className="field__control filter-condition__field"
                  value={filter.field}
                  onChange={(e) => updateFilter(filter.id, { field: e.target.value })}
                  disabled={isLoading}
                >
                  {availableFields.map((field) => (
                    <option key={field.name} value={field.name}>
                      {field.label}
                    </option>
                  ))}
                </select>

                <select
                  className="field__control filter-condition__operator"
                  value={filter.operator}
                  onChange={(e) =>
                    updateFilter(filter.id, { operator: e.target.value as FilterOperator })
                  }
                  disabled={isLoading}
                >
                  {OPERATORS.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>

                {!['isEmpty', 'isNotEmpty'].includes(filter.operator) && (
                  <input
                    className="field__control filter-condition__value"
                    type={getFieldType(filter.field) === 'date' ? 'date' : 'text'}
                    value={typeof filter.value === 'string' ? filter.value : ''}
                    onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                    placeholder="Value"
                    disabled={isLoading}
                  />
                )}

                <button
                  className="btn btn--danger btn--sm"
                  onClick={() => removeFilter(filter.id)}
                  disabled={isLoading}
                  aria-label={`Remove filter for ${filter.field}`}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="advanced-filter-panel__actions">
            <button
              className="btn btn--secondary btn--sm"
              onClick={addFilter}
              disabled={isLoading || availableFields.length === 0}
            >
              <Plus size={16} />
              Add Filter
            </button>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              {onReset && (
                <button
                  className="btn btn--secondary btn--sm"
                  onClick={handleReset}
                  disabled={isLoading || filters.length === 0}
                >
                  Reset
                </button>
              )}

              {onApply && (
                <button
                  className="btn btn--primary btn--sm"
                  onClick={handleApply}
                  disabled={isLoading || filters.length === 0}
                >
                  Apply
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

