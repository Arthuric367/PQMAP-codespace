import { useState } from 'react';
import { X, Settings } from 'lucide-react';

export interface AffectedCustomerFilters {
  startDate: string;
  endDate: string;
  excludeSpecialEvents: boolean;
}

interface AffectedCustomerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: AffectedCustomerFilters;
  onApply: (filters: AffectedCustomerFilters) => void;
}

export default function AffectedCustomerConfigModal({ 
  isOpen, 
  onClose, 
  filters, 
  onApply 
}: AffectedCustomerConfigModalProps) {
  const [localFilters, setLocalFilters] = useState<AffectedCustomerFilters>(filters);

  if (!isOpen) return null;

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleCancel = () => {
    setLocalFilters(filters); // Reset to original
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleCancel}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-white" />
            <h2 className="text-xl font-bold text-white">Affected Customer Filters</h2>
          </div>
          <button
            onClick={handleCancel}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={localFilters.startDate}
                  onChange={(e) => setLocalFilters({ ...localFilters, startDate: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={localFilters.endDate}
                  onChange={(e) => setLocalFilters({ ...localFilters, endDate: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Exclude Special Events */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Exclude Special Events
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                Exclude events during typhoon or maintenance mode
              </p>
            </div>
            <button
              onClick={() => setLocalFilters({ 
                ...localFilters, 
                excludeSpecialEvents: !localFilters.excludeSpecialEvents 
              })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                localFilters.excludeSpecialEvents ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  localFilters.excludeSpecialEvents ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <p className="text-xs text-slate-500 bg-blue-50 p-3 rounded-lg">
            ℹ️ The chart displays the top 10 customers by event count in the selected date range.
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex gap-3 justify-end">
          <button
            onClick={handleCancel}
            className="px-5 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-md"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
