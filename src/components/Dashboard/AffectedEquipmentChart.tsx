import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '../../lib/supabase';

interface EquipmentTypeData {
  equipment_type: string;
  count: number;
  percentage: number;
}

interface AffectedEquipmentChartProps {
  startDate?: string;
  endDate?: string;
  includeChildEvents?: boolean;
  includeFalseEvents?: boolean;
  topN?: number;
}

const CHART_COLORS = [
  '#f97316', // orange
  '#a855f7', // purple
  '#22c55e', // green
  '#3b82f6', // blue
  '#ef4444', // red
  '#eab308', // yellow
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#8b5cf6', // violet
  '#f59e0b', // amber
];

export default function AffectedEquipmentChart({
  startDate,
  endDate,
  includeChildEvents = true,
  includeFalseEvents = false,
  topN = 10,
}: AffectedEquipmentChartProps) {
  const [data, setData] = useState<EquipmentTypeData[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEquipmentData();
  }, [startDate, endDate, includeChildEvents, includeFalseEvents, topN]);

  const fetchEquipmentData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query for IDR records
      let query = supabase
        .from('idr_records')
        .select('equipment_type, event:pq_events!idr_records_event_id_fkey(is_child_event, false_event)', { count: 'exact' });

      // Apply date filters
      if (startDate) {
        query = query.gte('occurrence_time', startDate);
      }
      if (endDate) {
        query = query.lte('occurrence_time', endDate);
      }

      // Fetch all records (we'll filter in memory for child/false events)
      const { data: idrRecords, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      if (!idrRecords || idrRecords.length === 0) {
        setData([]);
        setTotalEvents(0);
        setLoading(false);
        return;
      }

      // Filter records based on child events and false events settings
      const filteredRecords = idrRecords.filter((record: any) => {
        const event = record.event;
        
        // If includeChildEvents is false, exclude child events
        if (!includeChildEvents && event?.is_child_event) {
          return false;
        }
        
        // If includeFalseEvents is false, exclude false events
        if (!includeFalseEvents && event?.false_event) {
          return false;
        }
        
        return true;
      });

      // Aggregate by equipment_type
      const equipmentCounts: Record<string, number> = {};
      
      filteredRecords.forEach((record: any) => {
        const equipmentType = record.equipment_type || 'Unknown';
        equipmentCounts[equipmentType] = (equipmentCounts[equipmentType] || 0) + 1;
      });

      // Convert to array and calculate percentages
      const total = filteredRecords.length;
      const equipmentArray: EquipmentTypeData[] = Object.entries(equipmentCounts)
        .map(([equipment_type, count]) => ({
          equipment_type,
          count,
          percentage: (count / total) * 100,
        }))
        .sort((a, b) => b.count - a.count) // Sort by count descending
        .slice(0, topN); // Take top N

      setData(equipmentArray);
      setTotalEvents(total);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching equipment data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load equipment data');
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-semibold text-gray-900 dark:text-white mb-1">
            {data.equipment_type}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Events: <span className="font-semibold text-gray-900 dark:text-white">{data.count}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Percentage: <span className="font-semibold text-gray-900 dark:text-white">{data.percentage.toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading equipment data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-2">
          <p className="text-red-600 dark:text-red-400 font-semibold">Error loading data</p>
          <p className="text-gray-600 dark:text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-2">
          <p className="text-gray-600 dark:text-gray-400 font-semibold">No equipment data found</p>
          <p className="text-gray-500 dark:text-gray-500 text-sm">
            Try adjusting your date range or filter settings
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Statistics */}
      <div className="flex items-center justify-between px-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Events Analyzed</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalEvents}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600 dark:text-gray-400">Equipment Types</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.length}</p>
        </div>
      </div>

      {/* Horizontal Bar Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-700" />
          <XAxis
            type="number"
            tickFormatter={(value) => `${value.toFixed(0)}`}
            className="text-gray-600 dark:text-gray-400"
          />
          <YAxis
            type="category"
            dataKey="equipment_type"
            width={150}
            className="text-gray-600 dark:text-gray-400"
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" radius={[0, 8, 8, 0]}>
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Percentage Breakdown Table */}
      <div className="px-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Percentage Breakdown
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {data.map((item, index) => (
            <div
              key={item.equipment_type}
              className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
            >
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                ></div>
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                  {item.equipment_type}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {item.count}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[3rem] text-right">
                  {item.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
