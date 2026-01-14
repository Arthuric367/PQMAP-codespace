import { useState } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { GroupedField, TimeGrouping, NumericGrouping, CategoricalGrouping } from '../../../types/report';

interface GroupingEditorProps {
  fields: GroupedField[];
  availableFields: string[];
  onSave: (fields: GroupedField[]) => void;
  onClose: () => void;
}

export default function GroupingEditor({ fields, availableFields, onSave, onClose }: GroupingEditorProps) {
  const [groupedFields, setGroupedFields] = useState<GroupedField[]>(fields);
  const [editingField, setEditingField] = useState<GroupedField | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateNew = () => {
    const newField: GroupedField = {
      id: crypto.randomUUID(),
      name: 'New Group',
      enabled: true,
      grouping: {
        type: 'time',
        sourceField: 'Timestamp',
        interval: 1,
        unit: 'months',
      } as TimeGrouping,
    };
    setEditingField(newField);
    setIsCreating(true);
  };

  const handleSaveField = () => {
    if (!editingField) return;

    if (isCreating) {
      setGroupedFields([...groupedFields, editingField]);
    } else {
      setGroupedFields(groupedFields.map(f => f.id === editingField.id ? editingField : f));
    }
    setEditingField(null);
    setIsCreating(false);
  };

  const handleDeleteField = (id: string) => {
    setGroupedFields(groupedFields.filter(f => f.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Field Grouping Editor</h2>
            <p className="text-purple-100 text-sm mt-1">Group fields for better analysis and visualization</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-purple-100">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Existing Fields */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Grouped Fields ({groupedFields.length})</h3>
              <button
                onClick={handleCreateNew}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Grouping
              </button>
            </div>

            {groupedFields.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
                <p className="text-slate-600 mb-4">No grouped fields yet</p>
                <button
                  onClick={handleCreateNew}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Create Your First Group
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {groupedFields.map(field => (
                  <div
                    key={field.id}
                    className={`border rounded-lg p-4 transition-colors ${
                      field.enabled 
                        ? 'bg-slate-50 border-slate-200 hover:border-purple-300' 
                        : 'bg-slate-100 border-slate-300 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.enabled}
                            onChange={(e) => {
                              setGroupedFields(groupedFields.map(f => 
                                f.id === field.id ? { ...f, enabled: e.target.checked } : f
                              ));
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                        <div className="flex-1">
                        <h4 className="font-semibold text-slate-900 mb-1">{field.name}</h4>
                        <p className="text-sm text-slate-600 mb-2">
                          Type: <span className="font-medium capitalize">{field.grouping.type}</span> | 
                          Source: <span className="font-medium">{field.grouping.sourceField}</span>
                        </p>
                        {field.grouping.type === 'time' && (
                          <p className="text-xs text-slate-500">
                            Interval: {field.grouping.interval} {field.grouping.unit}
                          </p>
                        )}
                        {field.grouping.type === 'numeric' && (
                          <p className="text-xs text-slate-500">
                            Ranges: {field.grouping.ranges.length} defined
                          </p>
                        )}
                        {field.grouping.type === 'categorical' && (
                          <p className="text-xs text-slate-500">
                            Groups: {field.grouping.groups.length} defined
                          </p>
                        )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingField(field);
                            setIsCreating(false);
                          }}
                          className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteField(field.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Editor Modal */}
          {editingField && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="bg-purple-600 text-white p-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold">
                    {isCreating ? 'Create New Grouping' : 'Edit Grouping'}
                  </h3>
                  <button
                    onClick={() => {
                      setEditingField(null);
                      setIsCreating(false);
                    }}
                    className="text-white hover:text-purple-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Group Name</label>
                    <input
                      type="text"
                      value={editingField.name}
                      onChange={(e) => setEditingField({ ...editingField, name: e.target.value })}
                      className="w-full border border-slate-300 rounded px-3 py-2"
                      placeholder="e.g., Monthly Events"
                    />
                  </div>

                  {/* Grouping Type */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Grouping Type</label>
                    <select
                      value={editingField.grouping.type}
                      onChange={(e) => {
                        const type = e.target.value as 'time' | 'numeric' | 'categorical';
                        let newGrouping: TimeGrouping | NumericGrouping | CategoricalGrouping;
                        
                        if (type === 'time') {
                          newGrouping = {
                            type: 'time',
                            sourceField: 'Timestamp',
                            interval: 1,
                            unit: 'months',
                          };
                        } else if (type === 'numeric') {
                          newGrouping = {
                            type: 'numeric',
                            sourceField: 'Duration (ms)',
                            ranges: [
                              { label: '0-100ms', min: 0, max: 100 },
                              { label: '100-500ms', min: 100, max: 500 },
                              { label: '500ms+', min: 500, max: Infinity },
                            ],
                          };
                        } else {
                          newGrouping = {
                            type: 'categorical',
                            sourceField: 'Substation',
                            groups: [
                              { label: 'Group 1', values: [] },
                            ],
                          };
                        }
                        setEditingField({ ...editingField, grouping: newGrouping });
                      }}
                      className="w-full border border-slate-300 rounded px-3 py-2"
                    >
                      <option value="time">Time Interval</option>
                      <option value="numeric">Numeric Range</option>
                      <option value="categorical">Categorical</option>
                    </select>
                  </div>

                  {/* Source Field */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Source Field</label>
                    <select
                      value={editingField.grouping.sourceField}
                      onChange={(e) =>
                        setEditingField({
                          ...editingField,
                          grouping: { ...editingField.grouping, sourceField: e.target.value } as any,
                        })
                      }
                      className="w-full border border-slate-300 rounded px-3 py-2"
                    >
                      {availableFields.map(field => (
                        <option key={field} value={field}>{field}</option>
                      ))}
                    </select>
                  </div>

                  {/* Time Grouping Configuration */}
                  {editingField.grouping.type === 'time' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Interval</label>
                          <input
                            type="number"
                            min="1"
                            value={editingField.grouping.interval}
                            onChange={(e) =>
                              setEditingField({
                                ...editingField,
                                grouping: { ...editingField.grouping, interval: parseInt(e.target.value) } as TimeGrouping,
                              })
                            }
                            className="w-full border border-slate-300 rounded px-3 py-2"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                          <select
                            value={editingField.grouping.unit}
                            onChange={(e) =>
                              setEditingField({
                                ...editingField,
                                grouping: { ...editingField.grouping, unit: e.target.value } as TimeGrouping,
                              })
                            }
                            className="w-full border border-slate-300 rounded px-3 py-2"
                          >
                            <option value="days">Days</option>
                            <option value="weeks">Weeks</option>
                            <option value="months">Months</option>
                            <option value="quarters">Quarters</option>
                            <option value="years">Years</option>
                          </select>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        Example: 15 days, 3 months, 1 quarter, etc.
                      </p>
                    </>
                  )}

                  {/* Numeric Grouping Configuration */}
                  {editingField.grouping.type === 'numeric' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Define Ranges</label>
                      <div className="space-y-2">
                        {editingField.grouping.ranges.map((range, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={range.label}
                              onChange={(e) => {
                                const newRanges = [...(editingField.grouping as NumericGrouping).ranges];
                                newRanges[idx].label = e.target.value;
                                setEditingField({
                                  ...editingField,
                                  grouping: { ...editingField.grouping, ranges: newRanges } as NumericGrouping,
                                });
                              }}
                              placeholder="Label"
                              className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm"
                            />
                            <input
                              type="number"
                              value={range.min}
                              onChange={(e) => {
                                const newRanges = [...(editingField.grouping as NumericGrouping).ranges];
                                newRanges[idx].min = parseFloat(e.target.value);
                                setEditingField({
                                  ...editingField,
                                  grouping: { ...editingField.grouping, ranges: newRanges } as NumericGrouping,
                                });
                              }}
                              placeholder="Min"
                              className="w-24 border border-slate-300 rounded px-2 py-1 text-sm"
                            />
                            <input
                              type="number"
                              value={range.max === Infinity ? '' : range.max}
                              onChange={(e) => {
                                const newRanges = [...(editingField.grouping as NumericGrouping).ranges];
                                newRanges[idx].max = e.target.value ? parseFloat(e.target.value) : Infinity;
                                setEditingField({
                                  ...editingField,
                                  grouping: { ...editingField.grouping, ranges: newRanges } as NumericGrouping,
                                });
                              }}
                              placeholder="Max (leave empty for +)"
                              className="w-32 border border-slate-300 rounded px-2 py-1 text-sm"
                            />
                            <button
                              onClick={() => {
                                if (editingField.grouping.type !== 'numeric') return;
                                const newRanges = editingField.grouping.ranges.filter((_: any, i: number) => i !== idx);
                                setEditingField({
                                  ...editingField,
                                  grouping: { ...editingField.grouping, ranges: newRanges } as NumericGrouping,
                                });
                              }}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          if (editingField.grouping.type !== 'numeric') return;
                          const newRanges = [
                            ...(editingField.grouping as NumericGrouping).ranges,
                            { label: 'New Range', min: 0, max: 100 },
                          ];
                          setEditingField({
                            ...editingField,
                            grouping: { ...editingField.grouping, ranges: newRanges } as NumericGrouping,
                          });
                        }}
                        className="mt-2 px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                      >
                        + Add Range
                      </button>
                    </div>
                  )}

                  {/* Categorical Grouping Configuration */}
                  {editingField.grouping.type === 'categorical' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Define Groups</label>
                      <div className="space-y-3">
                        {editingField.grouping.groups.map((group, idx) => (
                          <div key={idx} className="border border-slate-200 rounded-lg p-3">
                            <div className="flex gap-2 items-center mb-2">
                              <input
                                type="text"
                                value={group.label}
                                onChange={(e) => {
                                  if (editingField.grouping.type !== 'categorical') return;
                                  const newGroups = [...(editingField.grouping as CategoricalGrouping).groups];
                                  newGroups[idx].label = e.target.value;
                                  setEditingField({
                                    ...editingField,
                                    grouping: { ...editingField.grouping, groups: newGroups } as CategoricalGrouping,
                                  });
                                }}
                                placeholder="Group Label"
                                className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm font-medium"
                              />
                              <button
                                onClick={() => {
                                  if (editingField.grouping.type !== 'categorical') return;
                                  const newGroups = (editingField.grouping as CategoricalGrouping).groups.filter((_: any, i: number) => i !== idx);
                                  setEditingField({
                                    ...editingField,
                                    grouping: { ...editingField.grouping, groups: newGroups } as CategoricalGrouping,
                                  });
                                }}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <textarea
                              value={group.values.join(', ')}
                              onChange={(e) => {
                                if (editingField.grouping.type !== 'categorical') return;
                                const newGroups = [...(editingField.grouping as CategoricalGrouping).groups];
                                newGroups[idx].values = e.target.value.split(',').map(v => v.trim()).filter(Boolean);
                                setEditingField({
                                  ...editingField,
                                  grouping: { ...editingField.grouping, groups: newGroups } as CategoricalGrouping,
                                });
                              }}
                              placeholder="Enter values separated by commas (e.g., APA, BKW, CLP)"
                              className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                              rows={2}
                            />
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          if (editingField.grouping.type !== 'categorical') return;
                          const newGroups = [
                            ...(editingField.grouping as CategoricalGrouping).groups,
                            { label: 'New Group', values: [] },
                          ];
                          setEditingField({
                            ...editingField,
                            grouping: { ...editingField.grouping, groups: newGroups } as CategoricalGrouping,
                          });
                        }}
                        className="mt-2 px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                      >
                        + Add Group
                      </button>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200 p-4 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditingField(null);
                      setIsCreating(false);
                    }}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveField}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Grouping
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 flex justify-between items-center bg-slate-50">
          <p className="text-sm text-slate-600">
            {groupedFields.length} grouped field{groupedFields.length !== 1 ? 's' : ''} defined
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(groupedFields)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Apply Groupings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
