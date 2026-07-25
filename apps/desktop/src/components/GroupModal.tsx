import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Button, Input, COLOR_TOKENS } from '@git-manager/ui';
import { useAppStore } from '../store/useAppStore.js';

export const GroupModal: React.FC = () => {
  const { groupModalState, setGroupModalState, saveGroup } = useAppStore();
  const { isOpen, group } = groupModalState;

  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');

  useEffect(() => {
    if (group) {
      setName(group.name);
      setColor(group.color);
    } else {
      setName('');
      setColor('#6366f1');
    }
  }, [group, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await saveGroup({
      id: group?.id,
      name: name.trim(),
      color,
    });

    setGroupModalState(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100">
            {group ? 'Edit Group' : 'Create Group'}
          </h2>
          <button
            onClick={() => setGroupModalState(false)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            label="Group Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Frontend, Work, Mobile"
            required
            autoFocus
          />

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-2 block">Group Color</label>
            <div className="flex flex-wrap gap-2.5">
              {COLOR_TOKENS.groupColors.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === c.value ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setGroupModalState(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" icon={<Save className="w-4 h-4" />}>
              Save Group
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
