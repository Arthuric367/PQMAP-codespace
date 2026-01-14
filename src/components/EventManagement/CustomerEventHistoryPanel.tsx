import { useState, useEffect } from 'react';
import { X, Download, Calendar, Filter, TrendingUp, Zap, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PQEvent, Customer, Substation, EventCustomerImpact, PQMeter } from '../../types/database';
import * as XLSX from 'xlsx';

interface CustomerEventHistoryPanelProps {
  customer: Customer;
  onClose: () => void;
}

interface EventWithDetails extends PQEvent {
  substation?: Substation;
  impact?: EventCustomerImpact;
  meter?: PQMeter;
}

type SortField = 'timestamp' | 'duration_ms' | 'v1' | 'v2' | 'v3';

export default function CustomerEventHistoryPanel({ customer, onClose }: CustomerEventHistoryPanelProps) {
  console.log('🎯 [CustomerEventHistoryPanel] Component mounted with customer:', {
    id: customer.id,
    name: customer.name,
    account_number: customer.account_number,
    address: customer.address
  });

  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  
  // Filter states
  const [startDate, setStartDate] = useState(() => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return sixMonthsAgo.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [severityFilter, setSeverityFilter] = useState<string[]>([]);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  
  // Sort states
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadEvents();
  }, [customer.id, startDate, endDate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showExportDropdown && !target.closest('.export-dropdown-container')) {
        setShowExportDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportDropdown]);

  const loadEvents = async () => {
    console.log('🔄 [loadEvents] Starting query with params:', {
      customer_id: customer.id,
      customer_name: customer.name,
      startDate,
      endDate,
      dateRange: `${startDate} to ${endDate}`
    });

    setLoading(true);
    try {
      // Query events where customer was impacted
      // NOTE: Cannot order by nested field 'event.timestamp' in PostgREST
      // Will sort in JavaScript after fetching
      const { data: impactData, error } = await supabase
        .from('event_customer_impact')
        .select(`
          *,
          event:event_id (
            *,
            substation:substation_id (
              id,
              name,
              code
            ),
            meter:meter_id (
              id,
              circuit_id,
              voltage_level
            )
          )
        `)
        .eq('customer_id', customer.id);

      console.log('📊 [loadEvents] Query result:', {
        error,
        impactDataCount: impactData?.length || 0,
        firstImpact: impactData?.[0] ? {
          id: impactData[0].id,
          event_id: impactData[0].event_id,
          hasEvent: !!impactData[0].event,
          eventTimestamp: impactData[0].event?.timestamp,
          eventType: impactData[0].event?.event_type,
          eventSeverity: impactData[0].event?.severity
        } : 'No impacts'
      });

      if (error) {
        console.error('❌ [loadEvents] Supabase error:', error);
        throw error;
      }

      // Transform data to EventWithDetails format and filter by date range
      const eventsWithDetails: EventWithDetails[] = (impactData || [])
        .filter(impact => {
          if (!impact.event) return false;
          
          // Apply date filter in JavaScript (PostgREST can't filter nested fields reliably)
          const eventDate = new Date(impact.event.timestamp);
          const startDateTime = new Date(startDate + 'T00:00:00');
          const endDateTime = new Date(endDate + 'T23:59:59');
          
          return eventDate >= startDateTime && eventDate <= endDateTime;
        })
        .map(impact => ({
          ...impact.event,
          substation: impact.event.substation,
          meter: impact.event.meter,
          impact: impact
        }))
        .sort((a, b) => {
          // Sort by timestamp descending (newest first)
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });

      console.log('✅ [loadEvents] Transformed events:', {
        totalImpacts: impactData?.length || 0,
        impactsWithEvents: eventsWithDetails.length,
        impactsFiltered: (impactData?.length || 0) - eventsWithDetails.length,
        dateRange: `${startDate} to ${endDate}`,
        eventIds: eventsWithDetails.map(e => e.id).slice(0, 5),
        sampleTimestamps: eventsWithDetails.slice(0, 3).map(e => e.timestamp)
      });

      setEvents(eventsWithDetails);
      
      console.log('🏁 [loadEvents] Query complete. Setting events:', eventsWithDetails.length);
    } catch (error) {
      console.error('❌ [loadEvents] Error loading customer events:', error);
      setEvents([]);
      console.log('🏁 [loadEvents] Query failed. Events cleared.');
    } finally {
      setLoading(false);
    }
  };

  // Apply severity filter
  const filteredEvents = severityFilter.length > 0
    ? events.filter(event => severityFilter.includes(event.severity))
    : events;

  // Apply sorting
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    // Handle null/undefined
    if (aVal === null || aVal === undefined) return sortDirection === 'asc' ? 1 : -1;
    if (bVal === null || bVal === undefined) return sortDirection === 'asc' ? -1 : 1;

    // Handle string comparison
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Apply pagination
  const totalPages = Math.ceil(sortedEvents.length / itemsPerPage);
  const paginatedEvents = sortedEvents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-blue-600" />
      : <ArrowDown className="w-3 h-3 text-blue-600" />;
  };

  const handleSeverityToggle = (severity: string) => {
    setSeverityFilter(prev => 
      prev.includes(severity) 
        ? prev.filter(s => s !== severity)
        : [...prev, severity]
    );
    setCurrentPage(1);
  };

  const handleQuickDateFilter = (months: number) => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - months);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setCurrentPage(1);
  };

  const handleExportExcel = () => {
    const exportData = sortedEvents.map(event => ({
      'Timestamp': new Date(event.timestamp).toLocaleString(),
      'Event Type': event.event_type,
      'Severity': event.severity,
      'Voltage Level': event.meter?.voltage_level || 'N/A',
      'Substation Code': event.substation?.code || 'N/A',
      'Substation Name': event.substation?.name || 'N/A',
      'Circuit ID': event.meter?.circuit_id || 'N/A',
      'V1 (%)': event.v1?.toFixed(2) || 'N/A',
      'V2 (%)': event.v2?.toFixed(2) || 'N/A',
      'V3 (%)': event.v3?.toFixed(2) || 'N/A',
      'Duration (ms)': event.duration_ms || 0,
      'Status': event.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customer Events');

    // Set column widths
    const colWidths = [
      { wch: 20 }, // Timestamp
      { wch: 15 }, // Event Type
      { wch: 10 }, // Severity
      { wch: 12 }, // Voltage Level
      { wch: 12 }, // Substation Code
      { wch: 25 }, // Substation Name
      { wch: 15 }, // Circuit ID
      { wch: 10 }, // V1
      { wch: 10 }, // V2
      { wch: 10 }, // V3
      { wch: 12 }, // Duration
      { wch: 12 }  // Status
    ];
    worksheet['!cols'] = colWidths;

    const fileName = `Customer_${customer.account_number}_Events_${Date.now()}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    setShowExportDropdown(false);
  };

  const handleExportCSV = () => {
    const headers = [
      'Timestamp', 'Event Type', 'Severity', 'Voltage Level', 
      'Substation Code', 'Substation Name', 'Circuit ID',
      'V1 (%)', 'V2 (%)', 'V3 (%)', 'Duration (ms)', 'Status'
    ];

    const rows = sortedEvents.map(event => [
      new Date(event.timestamp).toLocaleString(),
      event.event_type,
      event.severity,
      event.meter?.voltage_level || 'N/A',
      event.substation?.code || 'N/A',
      event.substation?.name || 'N/A',
      event.meter?.circuit_id || 'N/A',
      event.v1?.toFixed(2) || 'N/A',
      event.v2?.toFixed(2) || 'N/A',
      event.v3?.toFixed(2) || 'N/A',
      event.duration_ms || 0,
      event.status
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Customer_${customer.account_number}_Events_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    setShowExportDropdown(false);
  };

  // Calculate impact summary
  const getMostCommonVoltageLevel = () => {
    const voltageCounts = sortedEvents.reduce((acc, event) => {
      const voltageLevel = event.meter?.voltage_level;
      if (voltageLevel) {
        acc[voltageLevel] = (acc[voltageLevel] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    if (Object.keys(voltageCounts).length === 0) return 'N/A';

    return Object.entries(voltageCounts)
      .sort((a, b) => b[1] - a[1])[0][0];
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>

      {/* Slide-over Panel */}
      <div className="absolute inset-y-0 right-0 max-w-5xl w-full flex">
        <div className="w-full bg-white shadow-xl flex flex-col animate-fadeIn">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-white">Event History</h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-blue-100">
                <div>
                  <span className="font-medium">Customer:</span> {customer.name}
                </div>
                <div>
                  <span className="font-medium">Account #:</span> {customer.account_number}
                </div>
              </div>
              {customer.address && (
                <div className="text-sm text-blue-100 mt-1">
                  <span className="font-medium">Address:</span> {customer.address}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Impact Summary */}
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold text-slate-900">{sortedEvents.length}</div>
                  <div className="text-xs text-slate-600">Total Events</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                <div>
                  <div className="text-2xl font-bold text-slate-900">{getMostCommonVoltageLevel()}</div>
                  <div className="text-xs text-slate-600">Most Common Voltage</div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white px-6 py-4 border-b border-slate-200 space-y-4">
            {/* Date Range Filters */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
                <Calendar className="w-3 h-3 inline mr-1" />
                Date Range
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Quick Filters */}
                <button
                  onClick={() => handleQuickDateFilter(1)}
                  className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                >
                  Last Month
                </button>
                <button
                  onClick={() => handleQuickDateFilter(3)}
                  className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                >
                  Last 3 Months
                </button>
                <button
                  onClick={() => handleQuickDateFilter(6)}
                  className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors font-medium"
                >
                  Last 6 Months
                </button>
                <button
                  onClick={() => handleQuickDateFilter(12)}
                  className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                >
                  Last Year
                </button>
                
                {/* Custom Date Inputs */}
                <div className="flex items-center gap-2 ml-4">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="text-slate-500">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Severity Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
                <Filter className="w-3 h-3 inline mr-1" />
                Severity Filter
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {['critical', 'high', 'medium', 'low'].map(severity => (
                  <button
                    key={severity}
                    onClick={() => handleSeverityToggle(severity)}
                    className={`px-3 py-1 text-xs rounded transition-colors capitalize ${
                      severityFilter.includes(severity)
                        ? getSeverityBadgeColor(severity) + ' ring-2 ring-offset-1'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {severity}
                  </button>
                ))}
                {severityFilter.length > 0 && (
                  <button
                    onClick={() => {
                      setSeverityFilter([]);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-1 text-xs bg-red-100 text-red-600 hover:bg-red-200 rounded transition-colors"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table Header with Export */}
          <div className="bg-white px-6 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Showing {paginatedEvents.length} of {sortedEvents.length} events
            </div>
            <div className="relative export-dropdown-container">
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                disabled={sortedEvents.length === 0}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export"
              >
                <Download className="w-4 h-4" />
                Export
              </button>

              {showExportDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
                  <button
                    onClick={handleExportExcel}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export to Excel
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export to CSV
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Table Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : paginatedEvents.length === 0 ? (
              <div className="text-center py-12">
                <Zap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No events found for this customer in the selected date range.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b-2 border-slate-200">
                    <tr>
                      <th
                        className="py-3 px-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => handleSort('timestamp')}
                      >
                        <div className="flex items-center gap-1">
                          Timestamp
                          {getSortIcon('timestamp')}
                        </div>
                      </th>
                      <th className="py-3 px-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Event Type
                      </th>
                      <th className="py-3 px-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Severity
                      </th>
                      <th className="py-3 px-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Voltage
                      </th>
                      <th className="py-3 px-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Substation
                      </th>
                      <th className="py-3 px-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Circuit ID
                      </th>
                      <th
                        className="py-3 px-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => handleSort('v1')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          V1 (%)
                          {getSortIcon('v1')}
                        </div>
                      </th>
                      <th
                        className="py-3 px-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => handleSort('v2')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          V2 (%)
                          {getSortIcon('v2')}
                        </div>
                      </th>
                      <th
                        className="py-3 px-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => handleSort('v3')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          V3 (%)
                          {getSortIcon('v3')}
                        </div>
                      </th>
                      <th
                        className="py-3 px-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => handleSort('duration_ms')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Duration
                          {getSortIcon('duration_ms')}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {paginatedEvents.map(event => (
                      <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 text-slate-900 whitespace-nowrap">
                          {new Date(event.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          {event.event_type}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSeverityBadgeColor(event.severity)}`}>
                            {event.severity}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-900 font-medium">
                          {event.meter?.voltage_level || 'N/A'}
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          {event.substation ? `${event.substation.code} - ${event.substation.name}` : 'N/A'}
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-mono text-xs">
                          {event.meter?.circuit_id || 'N/A'}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-900 font-mono">
                          {event.v1?.toFixed(2) || 'N/A'}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-900 font-mono">
                          {event.v2?.toFixed(2) || 'N/A'}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-900 font-mono">
                          {event.v3?.toFixed(2) || 'N/A'}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700">
                          {event.duration_ms ? `${event.duration_ms} ms` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="bg-white px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 text-sm rounded transition-colors ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
