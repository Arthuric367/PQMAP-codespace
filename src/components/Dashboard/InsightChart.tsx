import { useState, useRef, useEffect } from 'react';
import { TrendingUp, Download, Settings2 } from 'lucide-react';
import { PQEvent } from '../../types/database';
import html2canvas from 'html2canvas';
import InsightChartConfigModal from './InsightChartConfigModal';
import { supabase } from '../../lib/supabase';

interface InsightChartProps {
  events: PQEvent[];
}

interface InsightChartFilters {
  startDate: string;
  endDate: string;
  includeChildEvents: boolean;
  includeFalseEvents: boolean;
  includeSpecialEvents: boolean;
  selectedYears: number[];
}

interface MonthlyData {
  month: string;
  yearCounts: Record<number, number>; // Dynamic year counts
}

interface CircuitData {
  circuitId: string;
  count: number;
}

export default function InsightChart({ events }: InsightChartProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  // Load filters from localStorage
  const [filters, setFilters] = useState<InsightChartFilters>(() => {
    const saved = localStorage.getItem('insightChartFilters');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved filters:', e);
      }
    }
    // Default: last 3 years, mother events only, no false events, no special events
    const currentYear = new Date().getFullYear();
    return {
      startDate: '',
      endDate: '',
      includeChildEvents: false,
      includeFalseEvents: false,
      includeSpecialEvents: false,
      selectedYears: [currentYear - 2, currentYear - 1, currentYear]
    };
  });

  // Save filters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('insightChartFilters', JSON.stringify(filters));
  }, [filters]);

  const currentYear = new Date().getFullYear();
  const years = filters.selectedYears.length > 0 ? filters.selectedYears.sort((a, b) => a - b) : [currentYear - 2, currentYear - 1, currentYear];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showExportDropdown && !target.closest('.export-dropdown-container')) {
        setShowExportDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportDropdown]);

  // Filter: voltage_dip, optionally include child/false/special events
  const getVoltageDipMotherEvents = (): PQEvent[] => {
    return events.filter(event => {
      // Must be voltage_dip
      if (event.event_type !== 'voltage_dip') return false;

      // Date range filter
      if (filters.startDate && new Date(event.timestamp) < new Date(filters.startDate)) return false;
      if (filters.endDate && new Date(event.timestamp) > new Date(filters.endDate)) return false;

      // Mother/Child events filter
      if (!filters.includeChildEvents && !event.is_mother_event) return false;

      // False events filter
      if (!filters.includeFalseEvents && event.false_event === true) return false;

      // Special events filter (typhoon) - uses is_special_event boolean
      if (!filters.includeSpecialEvents && event.is_special_event) return false;

      return true;
    });
  };

  const voltageDipEvents = getVoltageDipMotherEvents();

  // Debug: Log the filtered events
  console.log('[InsightChart] Total events passed to InsightChart:', events.length);
  console.log('[InsightChart] Filtered voltage_dip events:', voltageDipEvents.length);
  console.log('[InsightChart] Sample events with meter_id:', voltageDipEvents.slice(0, 5).map(e => ({ 
    timestamp: e.timestamp, 
    meter_id: e.meter_id,
    substation: e.substation?.name 
  })));
  console.log('[InsightChart] Events without meter_id:', voltageDipEvents.filter(e => !e.meter_id).length);

  // Prepare monthly data for the upper chart (dynamic years)
  const getMonthlyData = (): MonthlyData[] => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData: MonthlyData[] = months.map((month) => ({
      month,
      yearCounts: {}
    }));

    // Initialize year counts for selected years
    years.forEach(year => {
      monthlyData.forEach(data => {
        data.yearCounts[year] = 0;
      });
    });

    voltageDipEvents.forEach(event => {
      const eventDate = new Date(event.timestamp);
      const eventYear = eventDate.getFullYear();
      const eventMonth = eventDate.getMonth(); // 0-11

      // Only count if year is in selected years
      if (years.includes(eventYear)) {
        monthlyData[eventMonth].yearCounts[eventYear]++;
      }
    });

    return monthlyData;
  };

  const monthlyData = getMonthlyData();
  const [circuitData, setCircuitData] = useState<CircuitData[]>([]);

  // Load circuit data whenever filters or events change
  useEffect(() => {
    const loadCircuitData = async () => {
      // Get filtered events
      const filteredEvents = getVoltageDipMotherEvents();
      
      const circuitCounts: Record<string, number> = {};

      // Group events by meter_id and count
      const meterCounts: Record<string, number> = {};
      filteredEvents.forEach(event => {
        if (event.meter_id) {
          meterCounts[event.meter_id] = (meterCounts[event.meter_id] || 0) + 1;
        }
      });

      console.log('[InsightChart] Total voltage dip events:', filteredEvents.length);
      console.log('[InsightChart] Events with meter_id:', Object.keys(meterCounts).length);
      console.log('[InsightChart] Sample meter IDs:', Object.keys(meterCounts).slice(0, 5));

      // Fetch circuit_id for each meter
      const meterIds = Object.keys(meterCounts);
      if (meterIds.length === 0) {
        console.log('[InsightChart] No meter IDs found in events');
        setCircuitData([]);
        return;
      }

      // First, check if pq_meters table has any data
      const { data: allMeters, error: allError } = await supabase
        .from('pq_meters')
        .select('id, meter_id, circuit_id')
        .limit(5);

      console.log('[InsightChart] Sample from pq_meters table:', allMeters?.length, allMeters);

      // Now try to fetch the specific meters - use 'id' field, not 'meter_id'
      const { data: meters, error } = await supabase
        .from('pq_meters')
        .select('id, meter_id, circuit_id')
        .in('id', meterIds); // Query by 'id' field, not 'meter_id'

      if (error) {
        console.error('[InsightChart] Error fetching meters:', error);
        setCircuitData([]);
        return;
      }

      console.log('[InsightChart] Meters fetched from DB:', meters?.length);
      console.log('[InsightChart] Sample meters:', meters?.slice(0, 10));

      // Check for missing meters
      const fetchedMeterIds = new Set(meters?.map(m => m.id) || []); // Use 'id' field
      const missingMeterIds = meterIds.filter(id => !fetchedMeterIds.has(id));
      if (missingMeterIds.length > 0) {
        console.warn('[InsightChart] Meter IDs in events but NOT in pq_meters table:', missingMeterIds);
      }

      // Map meter id to circuit_id
      const meterToCircuit: Record<string, string> = {};
      let nullCircuitCount = 0;
      let validCircuitCount = 0;
      
      meters?.forEach(meter => {
        if (meter.circuit_id) {
          meterToCircuit[meter.id] = meter.circuit_id; // Use meter.id as key
          validCircuitCount++;
        } else {
          meterToCircuit[meter.id] = 'NULL'; // Use meter.id as key
          nullCircuitCount++;
        }
      });
      
      console.log(`[InsightChart] Meters with valid circuit_id: ${validCircuitCount}`);
      console.log(`[InsightChart] Meters with NULL circuit_id: ${nullCircuitCount}`);
      console.log('[InsightChart] Sample circuit mappings:', 
        Object.entries(meterToCircuit).slice(0, 10).map(([meter, circuit]) => `${meter} -> ${circuit}`)
      );

      console.log('[InsightChart] Meter to circuit mapping size:', Object.keys(meterToCircuit).length);

      // Group by circuit_id
      Object.entries(meterCounts).forEach(([meterId, count]) => {
        const circuitId = meterToCircuit[meterId] || 'NULL';
        circuitCounts[circuitId] = (circuitCounts[circuitId] || 0) + count;
      });

      console.log('[InsightChart] Circuit counts:', circuitCounts);

      // Filter circuits with > 10 events and sort by count descending
      const result = Object.entries(circuitCounts)
        .filter(([_, count]) => count > 10)
        .sort((a, b) => b[1] - a[1])
        .map(([circuitId, count]) => ({
          circuitId,
          count
        }));
      
      setCircuitData(result);
    };
    
    loadCircuitData();
  }, [filters.startDate, filters.endDate, filters.includeChildEvents, filters.includeFalseEvents, filters.includeSpecialEvents, filters.selectedYears, events]);

  // Calculate max value for scaling the upper chart
  const maxMonthlyValue = Math.max(
    ...monthlyData.flatMap(d => Object.values(d.yearCounts)),
    1 // Prevent division by zero
  );

  // Calculate max value for scaling the lower chart
  const maxCircuitValue = Math.max(...circuitData.map(d => d.count), 1);

  const handleExportChart = async () => {
    if (!chartRef.current) return;
    
    setIsExporting(true);
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2
      });
      
      const link = document.createElement('a');
      link.download = `insight-for-improvement-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
      setShowExportDropdown(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100">
        <div ref={chartRef} className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-slate-700" />
              <div>
                <h2 className="text-xl font-bold text-slate-900">Insight for Improvement</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Voltage dip analysis ({years.length > 0 ? `${years[0]}-${years[years.length - 1]}` : 'No years selected'})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsConfigOpen(true)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                title="Configure Filters"
              >
                <Settings2 className="w-5 h-5 text-slate-600" />
              </button>
              <div className="relative export-dropdown-container">
                <button
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  disabled={isExporting}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50"
                  title="Export Chart"
                >
                  <Download className="w-5 h-5" />
                </button>
                {showExportDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
                    <button
                      onClick={handleExportChart}
                      disabled={isExporting}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export as Image
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

        {/* Upper Chart: Monthly Voltage Dips by Year */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-slate-700 mb-4">
            No. of Voltage Dips (0%-90%) by Month in {years.join(', ')}
          </h3>
          
          {/* Legend - Dynamic year colors */}
          <div className="flex items-center gap-6 mb-4 flex-wrap">
            {years.map((year, index) => {
              const colors = ['bg-amber-400', 'bg-blue-500', 'bg-slate-700', 'bg-green-500', 'bg-purple-500'];
              return (
                <div key={year} className="flex items-center gap-2">
                  <div className={`w-4 h-4 ${colors[index % colors.length]} rounded`}></div>
                  <span className="text-xs text-slate-600">{year}</span>
                </div>
              );
            })}
          </div>

          {years.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Please select at least one year in the configuration</p>
            </div>
          ) : (
            <div className="relative h-64">
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between text-xs text-slate-500 text-right pr-2">
                <span>{maxMonthlyValue}</span>
                <span>{Math.round(maxMonthlyValue * 0.75)}</span>
                <span>{Math.round(maxMonthlyValue * 0.5)}</span>
                <span>{Math.round(maxMonthlyValue * 0.25)}</span>
                <span>0</span>
              </div>

              {/* Chart area */}
              <div className="ml-10 flex flex-col" style={{ height: 'calc(100% - 24px)' }}>
                <div className="flex-1 flex items-end justify-between gap-1">
                  {monthlyData.map((data, index) => {
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center h-full">
                        {/* Bars container */}
                        <div className="w-full flex items-end justify-center gap-0.5 h-full">
                          {years.map((year, yearIndex) => {
                            const count = data.yearCounts[year] || 0;
                            const colors = ['bg-amber-400', 'bg-blue-500', 'bg-slate-700', 'bg-green-500', 'bg-purple-500'];
                            const barColor = colors[yearIndex % colors.length];

                            return (
                              <div key={year} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
                                {count > 0 ? (
                                  <>
                                    <span className="text-[10px] font-semibold text-slate-700 mb-1">
                                      {count}
                                    </span>
                                    <div
                                      className={`w-full ${barColor} rounded-t transition-all duration-300 min-h-[4px]`}
                                      style={{ height: `${Math.max((count / maxMonthlyValue) * 100, 2)}%` }}
                                    />
                                  </>
                                ) : (
                                  <div className="w-full h-0"></div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Month labels row */}
                <div className="flex justify-between gap-1 mt-2">
                  {monthlyData.map((data, index) => (
                    <div key={index} className="flex-1 text-center">
                      <span className="text-[10px] text-slate-600 font-medium">{data.month}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lower Chart: Voltage Dips by Circuit ID (>10 events) */}
        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-4">
            No. of Voltage Dips (0%-90%) by Circuit ID in {years.join(', ')}
          </h3>

          {circuitData.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No circuits with more than 10 voltage dip events</p>
            </div>
          ) : (
            <div className="space-y-3">
              {circuitData.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  {/* Circuit ID label */}
                  <div className="w-20 text-xs font-medium text-slate-700 text-right">
                    {item.circuitId === 'NULL' ? (
                      <span className="text-slate-400 italic">NULL</span>
                    ) : (
                      item.circuitId
                    )}
                  </div>
                  
                  {/* Bar container */}
                  <div className="flex-1 relative h-8 bg-slate-100 rounded overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-blue-500 transition-all duration-300 flex items-center justify-end pr-2"
                      style={{ width: `${(item.count / maxCircuitValue) * 100}%` }}
                    >
                      <span className="text-xs font-bold text-white">{item.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-xs font-semibold text-amber-900 mb-2">💡 General Insight</p>
          <p className="text-sm text-amber-800">
            {circuitData.length > 0 ? (
              <>
                Circuit <span className="font-bold">{circuitData[0].circuitId}</span> has the highest 
                number of voltage dip events with <span className="font-bold">{circuitData[0].count}</span> occurrences. 
                Focus improvement efforts on these fragile circuits.
              </>
            ) : (
              'All circuits are performing well with voltage dip events below threshold (≤10).'
            )}
          </p>
        </div>
        </div>
      </div>

      {/* Config Modal */}
      {isConfigOpen && (
        <InsightChartConfigModal
          filters={filters}
          onApply={(newFilters) => {
            setFilters(newFilters);
            setIsConfigOpen(false);
          }}
          onClose={() => setIsConfigOpen(false)}
        />
      )}
    </>
  );
}
