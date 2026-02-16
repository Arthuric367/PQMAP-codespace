import { useState } from 'react';
import { X } from 'lucide-react';

interface InsightChartFilters {
  startDate: string;
  endDate: string;
  includeChildEvents: boolean;
  includeFalseEvents: boolean;
  includeSpecialEvents: boolean;
  selectedYears: number[];
}

interface InsightChartConfigModalProps {
  filters: InsightChartFilters;
  onApply: (filters: InsightChartFilters) => void;
  onClose: () => void;
}

// Helper function to format datetime to user-friendly display
const formatDateTime = (dateTimeString: string): string => {
  if (!dateTimeString) return '';
  
  const date = new Date(dateTimeString);
  if (isNaN(date.getTime())) return dateTimeString; // Return as-is if invalid
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  
  return `${day} ${month} ${year}, ${displayHours}:${displayMinutes} ${ampm}`;
};

// Helper function to ensure datetime format (add default time if only date provided)
const ensureDateTimeFormat = (dateString: string, isEndDate: boolean = false): string => {
  if (!dateString) return '';
  
  // Check if it's already in datetime format (contains 'T' or has time)
  if (dateString.includes('T') || dateString.includes(':')) {
    return dateString;
  }
  
  // Old date-only format - add default time
  // Start date: 00:00:00, End date: 23:59:59
  return isEndDate ? `${dateString}T23:59` : `${dateString}T00:00`;
};

export default function InsightChartConfigModal({ filters, onApply, onClose }: InsightChartConfigModalProps) {
  // Convert old date-only values to datetime format for backward compatibility
  const [startDate, setStartDate] = useState(ensureDateTimeFormat(filters.startDate || '', false));
  const [endDate, setEndDate] = useState(ensureDateTimeFormat(filters.endDate || '', true));
  const [includeChildEvents, setIncludeChildEvents] = useState(filters.includeChildEvents ?? false);
  const [includeFalseEvents, setIncludeFalseEvents] = useState(filters.includeFalseEvents ?? false);
  const [includeSpecialEvents, setIncludeSpecialEvents] = useState(filters.includeSpecialEvents ?? false);
  const [selectedYears, setSelectedYears] = useState<number[]>(filters.selectedYears || []);

  // Generate available years (current year + 10 years back)
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 11 }, (_, i) => currentYear - i);

  const handleToggleYear = (year: number) => {
    if (selectedYears.includes(year)) {
      setSelectedYears(selectedYears.filter(y => y !== year));
    } else {
      // Limit to 5 years maximum
      if (selectedYears.length >= 5) {
        alert('Maximum 5 years can be selected');
        return;
      }
      setSelectedYears([...selectedYears, year].sort((a, b) => a - b));
    }
  };

  const handleClearAll = () => {
    setStartDate('');
    setEndDate('');
    setIncludeChildEvents(false);
    setIncludeFalseEvents(false);
    setIncludeSpecialEvents(false);
    setSelectedYears([]);
  };

  const handleApply = () => {
    onApply({
      startDate,
      endDate,
      includeChildEvents,
      includeFalseEvents,
      includeSpecialEvents,
      selectedYears
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Insight Chart Configuration</h2>
            <p className="text-sm text-slate-600 mt-1">Configure filters and display options</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Date Range Filter */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Date & Time Range</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Start Date & Time</label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {startDate && (
                  <p className="text-xs text-slate-500 mt-1">{formatDateTime(startDate)}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">End Date & Time</label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {endDate && (
                  <p className="text-xs text-slate-500 mt-1">{formatDateTime(endDate)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Year Selection */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">
              Year Selection (Max 5 years) - {selectedYears.length} selected
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Select up to 5 years to display in the chart. Bars will be shown for each selected year.
            </p>
            <div className="grid grid-cols-6 gap-2">
              {availableYears.map((year) => (
                <button
                  key={year}
                  onClick={() => handleToggleYear(year)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    selectedYears.includes(year)
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>

          {/* Event Type Filters */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Event Type Filters</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeChildEvents}
                  onChange={(e) => setIncludeChildEvents(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-700">Include Child Events</span>
                  <p className="text-xs text-slate-500">Show both mother and child events in analysis</p>
                </div>
              </label>

              <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeFalseEvents}
                  onChange={(e) => setIncludeFalseEvents(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-700">Include False Events</span>
                  <p className="text-xs text-slate-500">Show events marked as false positives</p>
                </div>
              </label>

              <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSpecialEvents}
                  onChange={(e) => setIncludeSpecialEvents(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-700">Include Special Events (Typhoon)</span>
                  <p className="text-xs text-slate-500">Show events with special event markers (e.g., Typhoon)</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50 flex-shrink-0">
          <button
            onClick={handleClearAll}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Clear All
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
