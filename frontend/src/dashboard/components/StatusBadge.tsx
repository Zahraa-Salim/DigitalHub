import React from 'react';

interface StatusBadgeProps {
  status: 'draft' | 'published' | 'archived' | 'active' | 'inactive' | 'featured' | 'pending' | 'completed';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, size = 'md' }) => {
  const getStatusClass = (status: string): string => {
    const baseClass = `status-badge status-badge--${size}`;
    switch (status) {
      case 'published':
      case 'active':
      case 'completed':
      case 'featured':
        return `${baseClass} status-badge--success`;
      case 'draft':
      case 'pending':
        return `${baseClass} status-badge--warning`;
      case 'archived':
      case 'inactive':
        return `${baseClass} status-badge--danger`;
      default:
        return `${baseClass} status-badge--default`;
    }
  };

  const defaultLabels: Record<string, string> = {
    draft: 'Draft',
    published: 'Published',
    archived: 'Archived',
    active: 'Active',
    inactive: 'Inactive',
    featured: 'Featured',
    pending: 'Pending',
    completed: 'Completed',
  };

  return (
    <span className={getStatusClass(status)} title={label || defaultLabels[status]}>
      {label || defaultLabels[status]}
    </span>
  );
};
