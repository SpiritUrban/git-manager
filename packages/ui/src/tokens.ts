export const COLOR_TOKENS = {
  brand: {
    primary: '#6366f1', // Indigo 500
    hover: '#4f46e5',
    accent: '#3b82f6', // Blue 500
  },
  status: {
    favorite: '#f59e0b', // Amber 500
    missing: '#ef4444', // Red 500
    archived: '#6b7280', // Gray 500
    success: '#10b981', // Emerald 500
  },
  groupColors: [
    { id: 'indigo', label: 'Indigo', value: '#6366f1' },
    { id: 'blue', label: 'Blue', value: '#3b82f6' },
    { id: 'cyan', label: 'Cyan', value: '#06b6d4' },
    { id: 'emerald', label: 'Emerald', value: '#10b981' },
    { id: 'amber', label: 'Amber', value: '#f59e0b' },
    { id: 'rose', label: 'Rose', value: '#f43f5e' },
    { id: 'purple', label: 'Purple', value: '#a855f7' },
    { id: 'slate', label: 'Slate', value: '#64748b' },
  ],
} as const;
