import { useState } from 'react';
import { X, Calendar } from 'lucide-react';
import { AffectedCustomerFilters } from './AffectedCustomerConfigModal';

interface AffectedCustomerProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: AffectedCustomerFilters;
  onSave: (profile: AffectedCustomerFilters) => void;
}

export default function AffectedCustomerProfileEditModal({
  isOpen,
  onClose,
  profile,
  onSave,
}: AffectedCustomerProfileEditModalProps) {
  const [localProfile, setLocalProfile] = useState<AffectedCustomerFilters>(profile);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localProfile);
  };

  // Quick date filters
  const handleQuickDate = (filter: string) => {
    const endDate = new Date();
    const startDate = new Date();

    switch (filter) {
      case 'today':
        // Today
        break;
      case 'last7days':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'lastMonth':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'thisYear':
        startDate.setMonth(0, 1); // January 1st
        break;
    }

    setLocalProfile({
      ...localProfile,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6" />
            <div>
              <h3 className="text-lg font-semibold">Edit Profile</h3>
              <p className="text-sm text-blue-100">Adjust date range and filter settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Date Range Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-slate-700">
                Date Range
              </label>
              {/* Quick Filters */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleQuickDate('today')}
                  className="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={() => handleQuickDate('last7days')}
                  className="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => handleQuickDate('lastMonth')}
                  className="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                >
                  Last Month
                </button>
                <button
                  onClick={() => handleQuickDate('thisYear')}
                  className="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                >
                  This Year
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={localProfile.startDate}
                  onChange={(e) =>
                    setLocalProfile({ ...localProfile, startDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={localProfile.endDate}
                  onChange={(e) =>
                    setLocalProfile({ ...localProfile, endDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>

          {/* Exclude Special Events */}
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
            <input
              type="checkbox"
              id="excludeSpecialEvents"
              checked={localProfile.excludeSpecialEvents}
              onChange={(e) =>
                setLocalProfile({ ...localProfile, excludeSpecialEvents: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="excludeSpecialEvents" className="text-sm text-slate-700 cursor-pointer">
              Exclude Special Events
              <span className="block text-xs text-slate-500 mt-0.5">
                Filter out events marked as special or planned maintenance
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg font-medium"
          >
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
}
