import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { PQEvent, EventType } from '../../types/database';
import { Download, CheckSquare, Square, Star, AlertCircle, Clock, Filter, X, Zap, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { EventAuditService } from '../../services/eventAuditService';

// Define filter interface inline
interface EventGroupingFilter {
  startDate: string;
  endDate: string;
  eventTypes: EventType[];
  severityLevels: string[];
  statusOptions: string[];
  voltageLevels: string[];
  meterIds: string[];
  minDuration: number;
  maxDuration: number;
  minRemainingVoltage: number;
  maxRemainingVoltage: number;
}

export default function EventGroupingMaintenance() {
  const [events, setEvents] = useState<(PQEvent & { voltage_level?: string; meter_no?: string; circuit_id?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [proposedMotherId, setProposedMotherId] = useState<string | null>(null);
  const [grouping, setGrouping] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Filters
  const [filters, setFilters] = useState<EventGroupingFilter>({
    startDate: '',
    endDate: '',
    eventTypes: ['voltage_dip', 'voltage_swell', 'interruption'], // Default to voltage dip events
    severityLevels: [],
    statusOptions: [],
    voltageLevels: [],
    meterIds: [],
    minDuration: 0,
    maxDuration: 300000,
    minRemainingVoltage: 0,
    maxRemainingVoltage: 100
  });
  
  const [showRecentlyUngroupedOnly, setShowRecentlyUngroupedOnly] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 120 seconds
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing ungrouped events...');
      loadData();
    }, 120000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, showRecentlyUngroupedOnly]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load ungrouped events (standalone events only)
      const { data: eventsData, error } = await supabase
        .from('pq_events')
        .select(`
          *,
          substation:substations(*),
          meter:pq_meters(*)
        `)
        .eq('is_mother_event', false)
        .eq('is_child_event', false)
        .in('event_type', ['voltage_dip', 'voltage_swell', 'interruption'])
        .order('timestamp', { ascending: false });

      if (error) throw error;

      // Enrich events with voltage level from meter
      const enrichedEvents = (eventsData || []).map(event => ({
        ...event,
        voltage_level: event.meter?.voltage_level || event.substation?.voltage_level || 'Unknown',
        meter_no: event.meter?.meter_id || '',
        circuit_id: event.meter?.circuit_id || ''
      }));

      setEvents(enrichedEvents);
      setLastRefresh(new Date());
      console.log(`✅ Loaded ${enrichedEvents.length} ungrouped events`);
    } catch (error) {
      console.error('❌ Error loading data:', error);
      toast.error('Failed to load ungrouped events');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const applyFilters = (eventsList: Array<PQEvent & { voltage_level?: string; meter_no?: string; circuit_id?: string }>): typeof eventsList => {
    return eventsList.filter(event => {
      // Date range
      if (filters.startDate && event.timestamp < filters.startDate) return false;
      if (filters.endDate && event.timestamp > filters.endDate) return false;

      // Event types
      if (filters.eventTypes.length > 0 && !filters.eventTypes.includes(event.event_type)) return false;

      // Severity
      if (filters.severityLevels.length > 0 && !filters.severityLevels.includes(event.severity)) return false;

      // Status
      if (filters.statusOptions.length > 0 && !filters.statusOptions.includes(event.status)) return false;

      // Voltage levels
      if (filters.voltageLevels.length > 0 && !filters.voltageLevels.includes(event.voltage_level || '')) return false;

      // Meters
      if (filters.meterIds.length > 0 && (!event.meter_id || !filters.meterIds.includes(event.meter_id))) return false;

      // Duration
      if (event.duration_ms !== null) {
        if (event.duration_ms < filters.minDuration || event.duration_ms > filters.maxDuration) return false;
      }

      // Remaining voltage
      if (event.remaining_voltage !== null) {
        if (event.remaining_voltage < filters.minRemainingVoltage || event.remaining_voltage > filters.maxRemainingVoltage) return false;
      }

      // Recently ungrouped filter (ungrouped within 24 hours)
      if (showRecentlyUngroupedOnly) {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        // Check audit logs for recent ungrouping
        if (!event.grouped_at || event.grouped_at < twentyFourHoursAgo) return false;
      }

      return true;
    });
  };

  const filteredEvents = applyFilters(events);

  // Pagination
  const totalPages = Math.ceil(filteredEvents.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

  // Toggle selection
  const toggleSelection = (eventId: string) => {
    const newSelection = new Set(selectedEventIds);
    if (newSelection.has(eventId)) {
      newSelection.delete(eventId);
    } else {
      newSelection.add(eventId);
    }
    setSelectedEventIds(newSelection);
  };

  // Select all / none
  const handleSelectAll = () => {
    if (selectedEventIds.size === paginatedEvents.length) {
      setSelectedEventIds(new Set());
    } else {
      setSelectedEventIds(new Set(paginatedEvents.map(e => e.id)));
    }
  };

  // Determine mother event (highest voltage level, then earliest timestamp)
  const determineMotherEvent = (eventIds: string[]): string | null => {
    const selectedEvents = events.filter(e => eventIds.includes(e.id));
    if (selectedEvents.length === 0) return null;

    // Voltage level priority: 400kV > 132kV > 11kV > 380V > Others
    const voltageOrder: Record<string, number> = {
      '400kV': 5,
      '132kV': 4,
      '11kV': 3,
      '380V': 2,
      'Others': 1,
      'Unknown': 0
    };

    // Sort by voltage level (descending), then timestamp (ascending)
    const sorted = [...selectedEvents].sort((a, b) => {
      const aLevel = voltageOrder[a.voltage_level || 'Unknown'] || 0;
      const bLevel = voltageOrder[b.voltage_level || 'Unknown'] || 0;
      
      if (aLevel !== bLevel) {
        return bLevel - aLevel; // Higher voltage first
      }
      
      // Same voltage level, use earliest timestamp
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    return sorted[0].id;
  };

  // Show grouping summary
  const handleShowSummary = () => {
    if (selectedEventIds.size < 2) {
      toast.error('Please select at least 2 events to group');
      return;
    }

    const motherId = determineMotherEvent(Array.from(selectedEventIds));
    setProposedMotherId(motherId);
    setShowSummaryModal(true);
  };

  // Check for conflicts before grouping
  const checkConflicts = async (eventIds: string[]): Promise<{ hasConflict: boolean; conflictedEvents: string[] }> => {
    const { data, error } = await supabase
      .from('pq_events')
      .select('id, is_mother_event, is_child_event')
      .in('id', eventIds);

    if (error) {
      console.error('Error checking conflicts:', error);
      return { hasConflict: false, conflictedEvents: [] };
    }

    const conflicted = (data || [])
      .filter(e => e.is_mother_event || e.is_child_event)
      .map(e => e.id);

    return {
      hasConflict: conflicted.length > 0,
      conflictedEvents: conflicted
    };
  };

  // Perform grouping
  const handleConfirmGrouping = async () => {
    if (!proposedMotherId) return;

    setGrouping(true);
    try {
      const eventIds = Array.from(selectedEventIds);
      
      // Check for conflicts
      const { hasConflict, conflictedEvents } = await checkConflicts(eventIds);
      if (hasConflict) {
        toast.error(
          `Conflict detected! ${conflictedEvents.length} event(s) have already been grouped by another user. Grouping cancelled.`,
          { duration: 5000 }
        );
        setShowSummaryModal(false);
        setGrouping(false);
        loadData(); // Refresh to show latest state
        return;
      }

      const childIds = eventIds.filter(id => id !== proposedMotherId);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      // Update mother event
      const { error: motherError } = await supabase
        .from('pq_events')
        .update({
          is_mother_event: true,
          is_child_event: false,
          grouping_type: 'manual',
          grouped_at: new Date().toISOString()
        })
        .eq('id', proposedMotherId);

      if (motherError) throw motherError;

      // Update child events
      const { error: childrenError } = await supabase
        .from('pq_events')
        .update({
          is_mother_event: false,
          is_child_event: true,
          parent_event_id: proposedMotherId,
          grouping_type: 'manual',
          grouped_at: new Date().toISOString()
        })
        .in('id', childIds);

      if (childrenError) throw childrenError;

      // Create audit log for mother
      await EventAuditService.logOperation(
        proposedMotherId,
        'grouped_manual',
        {
          performedBy: userId || 'unknown',
          changedFields: ['is_mother_event', 'grouping_type', 'grouped_at'],
          oldValues: { is_mother_event: false, grouping_type: null, grouped_at: null },
          newValues: { is_mother_event: true, grouping_type: 'manual', grouped_at: new Date().toISOString() },
          notes: `Manually grouped with ${childIds.length} child event(s)`
        }
      );

      // Create audit logs for children
      for (const childId of childIds) {
        await EventAuditService.logOperation(
          childId,
          'grouped_manual',
          {
            performedBy: userId || 'unknown',
            changedFields: ['is_child_event', 'parent_event_id', 'grouping_type', 'grouped_at'],
            oldValues: { is_child_event: false, parent_event_id: null, grouping_type: null, grouped_at: null },
            newValues: { is_child_event: true, parent_event_id: proposedMotherId, grouping_type: 'manual', grouped_at: new Date().toISOString() },
            notes: `Manually grouped as child of mother event ${proposedMotherId}`
          }
        );
      }

      toast.success(`${eventIds.length} events grouped successfully!`);
      setShowSummaryModal(false);
      setSelectedEventIds(new Set());
      loadData();
    } catch (error) {
      console.error('Error grouping events:', error);
      toast.error('Failed to group events. Please try again.');
    } finally {
      setGrouping(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const exportData = filteredEvents.map(event => ({
      'Event ID': event.id,
      'Timestamp': new Date(event.timestamp).toLocaleString('en-GB'),
      'Event Type': event.event_type,
      'Voltage Level': event.voltage_level || '',
      'Substation': event.substation?.name || '',
      'Meter ID': event.meter_no || '',
      'Circuit ID': event.circuit_id || '',
      'Duration (ms)': event.duration_ms || '',
      'Remaining Voltage (%)': event.remaining_voltage || '',
      'V1': event.v1 || '',
      'V2': event.v2 || '',
      'V3': event.v3 || '',
      'False Event': event.false_event ? 'Yes' : 'No',
      'Severity': event.severity,
      'Status': event.status
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ungrouped Events');
    XLSX.writeFile(wb, `Ungrouped_Events_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast.success('Exported to Excel successfully');
    setShowExportDropdown(false);
  };

  // Check if recently ungrouped (within 24 hours)
  const isRecentlyUngrouped = (event: typeof events[0]) => {
    if (!event.grouped_at) return false;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return new Date(event.grouped_at) >= twentyFourHoursAgo;
  };

  const selectedEvents = events.filter(e => selectedEventIds.has(e.id));
  const motherEvent = selectedEvents.find(e => e.id === proposedMotherId);
  const childEvents = selectedEvents.filter(e => e.id !== proposedMotherId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Event Grouping Maintenance</h1>
          <p className="text-slate-600 mt-1">
            Manually group ungrouped voltage dip events | Last refreshed: {lastRefresh.toLocaleTimeString('en-GB')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <div className="relative export-dropdown-container">
            <button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              title="Export"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            {showExportDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-30">
                <button
                  onClick={handleExportCSV}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Download className="w-4 h-4 text-green-600" />
                  <span>Export to Excel</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Total Ungrouped</p>
              <p className="text-3xl font-bold text-blue-900">{filteredEvents.length}</p>
            </div>
            <Zap className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Selected</p>
              <p className="text-3xl font-bold text-green-900">{selectedEventIds.size}</p>
            </div>
            <CheckSquare className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700">Recently Ungrouped</p>
              <p className="text-3xl font-bold text-orange-900">
                {filteredEvents.filter(e => isRecentlyUngrouped(e)).length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">Auto-Refresh</p>
              <p className="text-sm font-bold text-purple-900">Every 120s</p>
            </div>
            <RefreshCw className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Filter Toggle & Actions */}
      <div className="flex items-center justify-between bg-white rounded-xl p-4 border border-slate-200">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
        >
          <Filter className="w-5 h-5" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
        
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showRecentlyUngroupedOnly}
              onChange={(e) => setShowRecentlyUngroupedOnly(e.target.checked)}
              className="w-4 h-4 text-orange-600 border-slate-300 rounded focus:ring-2 focus:ring-orange-500"
            />
            <span className="text-sm font-medium text-slate-700">Show Recently Ungrouped Only (24h)</span>
          </label>
          
          <button
            onClick={handleShowSummary}
            disabled={selectedEventIds.size < 2}
            className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Group Selected ({selectedEventIds.size})
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl p-6 border border-slate-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Start Date */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Start Date</label>
              <input
                type="datetime-local"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">End Date</label>
              <input
                type="datetime-local"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Voltage Level */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Voltage Level</label>
              <select
                multiple
                value={filters.voltageLevels}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setFilters({ ...filters, voltageLevels: selected });
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="400kV">400kV</option>
                <option value="132kV">132kV</option>
                <option value="11kV">11kV</option>
                <option value="380V">380V</option>
                <option value="Others">Others</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => setFilters({
              ...filters,
              startDate: '',
              endDate: '',
              voltageLevels: [],
              severityLevels: []
            })}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Note about future validation */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-900">Future Enhancement</p>
          <p className="text-sm text-amber-700">
            Validation logic (e.g., grouping only events under the same meter hierarchy) will be implemented in a future update.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={handleSelectAll}
                    className="p-1 hover:bg-slate-200 rounded transition-colors"
                    title={selectedEventIds.size === paginatedEvents.length ? 'Deselect All' : 'Select All'}
                  >
                    {selectedEventIds.size === paginatedEvents.length ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Event Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Voltage Level</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Substation</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Meter ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Circuit ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Duration (ms)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Remaining V%</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">V1</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">V2</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">V3</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">False Event</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedEvents.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center">
                    <Zap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-xl font-semibold text-slate-600">No Ungrouped Events</p>
                    <p className="text-slate-500 mt-1">All events have been grouped or no events match your filters.</p>
                  </td>
                </tr>
              ) : (
                paginatedEvents.map((event) => (
                  <tr
                    key={event.id}
                    className={`hover:bg-slate-50 transition-colors ${selectedEventIds.has(event.id) ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleSelection(event.id)}
                        className="p-1 hover:bg-slate-200 rounded transition-colors"
                      >
                        {selectedEventIds.has(event.id) ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900">
                          {new Date(event.timestamp).toLocaleDateString('en-GB')}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(event.timestamp).toLocaleTimeString('en-GB')}
                        </span>
                        {isRecentlyUngrouped(event) && (
                          <span className="mt-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded">
                            Recently Ungrouped
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        event.event_type === 'voltage_dip' ? 'bg-red-100 text-red-700' :
                        event.event_type === 'voltage_swell' ? 'bg-orange-100 text-orange-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {event.event_type.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{event.voltage_level}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{event.substation?.name || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{event.meter_no || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{event.circuit_id || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{event.duration_ms || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{event.remaining_voltage?.toFixed(1) || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{event.v1?.toFixed(1) || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{event.v2?.toFixed(1) || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{event.v3?.toFixed(1) || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        event.false_event ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {event.false_event ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-1 border border-slate-300 rounded-lg text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">
              {startIndex + 1}-{Math.min(endIndex, filteredEvents.length)} of {filteredEvents.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-slate-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Modal */}
      {showSummaryModal && motherEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Confirm Grouping</h2>
                <p className="text-green-100 mt-1">Review proposed grouping before confirming</p>
              </div>
              <button
                onClick={() => setShowSummaryModal(false)}
                disabled={grouping}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Mother Event */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <h3 className="text-lg font-bold text-slate-900">Mother Event</h3>
                </div>
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-semibold text-slate-700">Timestamp:</span>
                      <span className="ml-2 text-slate-900">{new Date(motherEvent.timestamp).toLocaleString('en-GB')}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Voltage Level:</span>
                      <span className="ml-2 text-slate-900 font-bold">{motherEvent.voltage_level}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Substation:</span>
                      <span className="ml-2 text-slate-900">{motherEvent.substation?.name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Duration:</span>
                      <span className="ml-2 text-slate-900">{motherEvent.duration_ms} ms</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Child Events */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">
                  Child Events ({childEvents.length})
                </h3>
                <div className="space-y-2">
                  {childEvents.map((event, idx) => (
                    <div key={event.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">CHILD #{idx + 1}</span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          event.event_type === 'voltage_dip' ? 'bg-red-100 text-red-700' :
                          event.event_type === 'voltage_swell' ? 'bg-orange-100 text-orange-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {event.event_type.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="font-semibold text-slate-700">Timestamp:</span>
                          <span className="ml-2 text-slate-900">{new Date(event.timestamp).toLocaleString('en-GB')}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700">Voltage Level:</span>
                          <span className="ml-2 text-slate-900">{event.voltage_level}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700">Substation:</span>
                          <span className="ml-2 text-slate-900">{event.substation?.name || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700">Duration:</span>
                          <span className="ml-2 text-slate-900">{event.duration_ms} ms</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">Grouping Logic</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Mother event is determined by highest voltage level, then earliest timestamp.
                    All selected events will be grouped as one mother event with {childEvents.length} child event(s).
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 p-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowSummaryModal(false)}
                disabled={grouping}
                className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmGrouping}
                disabled={grouping}
                className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50 flex items-center gap-2"
              >
                {grouping ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Grouping...
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-5 h-5" />
                    Confirm Grouping
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
