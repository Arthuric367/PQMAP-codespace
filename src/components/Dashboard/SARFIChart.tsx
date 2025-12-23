import { useState, useEffect, useRef } from 'react';
import { TrendingUp, Settings2, Download, FileSpreadsheet, FileText, FileImage } from 'lucide-react';
import { SARFIMetrics, SARFIFilters, SARFIProfile, SARFIDataPoint } from '../../types/database';
import SARFIConfigModal from './SARFIConfigModal';
import SARFIDataTable from './SARFIDataTable';
import SARFIProfileEditModal from './SARFIProfileEditModal';
import * as XLSX from 'xlsx';

interface SARFIChartProps {
  metrics: SARFIMetrics[];
  profiles?: SARFIProfile[];
  tableData?: SARFIDataPoint[];
}

export default function SARFIChart({ metrics, profiles: profilesProp = [], tableData: initialTableData = [] }: SARFIChartProps) {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const chartRef = useRef<HTMLDivElement>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<SARFIProfile | null>(null);
  const [profiles, setProfiles] = useState<SARFIProfile[]>(profilesProp);
  const [tableData, setTableData] = useState<SARFIDataPoint[]>(initialTableData);
  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const [profilesFetched, setProfilesFetched] = useState(false); // Flag to prevent re-fetching
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [filters, setFilters] = useState<SARFIFilters>(() => {
    // Load saved filters from localStorage
    const saved = localStorage.getItem('sarfi_filters');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fall through to default
      }
    }
    return {
      profileId: '',
      voltageLevel: 'All',
      excludeSpecialEvents: false,
      dataType: 'magnitude',
      showDataTable: false,
    };
  });

  // Fetch profiles from database (only once)
  useEffect(() => {
    // Skip if already fetched or profiles provided as prop
    if (profilesFetched || profilesProp.length > 0) {
      return;
    }

    async function fetchProfiles() {
      const { fetchSARFIProfiles } = await import('../../services/sarfiService');
      try {
        const data = await fetchSARFIProfiles();
        setProfiles(data);
        setProfilesFetched(true); // Mark as fetched to prevent re-fetching
        
        // Auto-select active profile if none selected
        const currentFilters = JSON.parse(localStorage.getItem('sarfi_filters') || '{}');
        if (!currentFilters.profileId && data.length > 0) {
          const activeProfile = data.find(p => p.is_active) || data[0];
          setFilters(prev => ({ ...prev, profileId: activeProfile.id }));
        }
      } catch (error) {
        console.error('❌ Error fetching SARFI profiles:', error);
      }
    }

    fetchProfiles();
  }, []); // Empty dependency array - only run once on mount

  // Save filters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('sarfi_filters', JSON.stringify(filters));
  }, [filters]);

  // Fetch table data when showDataTable is enabled and filters change
  useEffect(() => {
    async function fetchTableData() {
      if (!filters.showDataTable || !filters.profileId) {
        setTableData([]);
        return;
      }

      setIsLoadingTable(true);
      try {
        const { fetchFilteredSARFIData } = await import('../../services/sarfiService');
        const data = await fetchFilteredSARFIData(filters);
        setTableData(data);
      } catch (error) {
        console.error('❌ Error fetching SARFI table data:', error);
        setTableData([]);
      } finally {
        setIsLoadingTable(false);
      }
    }

    fetchTableData();
  }, [filters.showDataTable, filters.profileId, filters.voltageLevel, filters.excludeSpecialEvents]);

  const handleApplyFilters = (newFilters: SARFIFilters) => {
    setFilters(newFilters);
  };

  const handleEditProfile = (profile: SARFIProfile) => {
    setEditingProfile(profile);
    setIsEditProfileOpen(true);
    setIsConfigOpen(false);
  };

  const handleProfileSaved = async () => {
    // Reload profiles
    const { fetchSARFIProfiles } = await import('../../services/sarfiService');
    try {
      const data = await fetchSARFIProfiles();
      setProfiles(data);
      
      // Reload table data if showing
      if (filters.showDataTable && filters.profileId) {
        const { fetchFilteredSARFIData } = await import('../../services/sarfiService');
        const tableData = await fetchFilteredSARFIData(filters);
        setTableData(tableData);
      }
    } catch (error) {
      console.error('❌ Error reloading profiles:', error);
    }
  };

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

  // Export to Excel with chart image + data table
  const handleExportExcel = async () => {
    setIsExporting(true);
    setShowExportDropdown(false);

    try {
      const wb = XLSX.utils.book_new();
      
      // Prepare header section
      const headerData = [
        ['SARFI Metrics Report'],
        ['Generated:', new Date().toLocaleString()],
        ['Profile:', profiles.find(p => p.id === filters.profileId)?.name || 'N/A'],
        ['Voltage Level:', filters.voltageLevel],
        ['Exclude Special Events:', filters.excludeSpecialEvents ? 'Yes' : 'No'],
        [],
        ['Chart Image: See rows 7-19 (future enhancement)'],
        []
      ];

      // Prepare chart data for table
      const chartTableData = [
        ['Month', 'SARFI-70', 'SARFI-80', 'SARFI-90']
      ];
      
      chartData.forEach(d => {
        chartTableData.push([
          d.label,
          d.sarfi_70.toFixed(2),
          d.sarfi_80.toFixed(2),
          d.sarfi_90.toFixed(2)
        ]);
      });

      chartTableData.push(
        [],
        ['Averages:'],
        ['SARFI-70', (chartData.reduce((acc, d) => acc + d.sarfi_70, 0) / chartData.length).toFixed(2)],
        ['SARFI-80', (chartData.reduce((acc, d) => acc + d.sarfi_80, 0) / chartData.length).toFixed(2)],
        ['SARFI-90', (chartData.reduce((acc, d) => acc + d.sarfi_90, 0) / chartData.length).toFixed(2)]
      );

      // Add meter data if available
      if (tableData.length > 0) {
        chartTableData.push(
          [],
          [],
          ['SARFI Data by Meter'],
          ['Meter No.', 'Location', 'SARFI-10', 'SARFI-30', 'SARFI-50', 'SARFI-70', 'SARFI-80', 'SARFI-90', 'Weight Factor']
        );

        tableData.forEach(row => {
          chartTableData.push([
            row.meter_no,
            row.location,
            row.sarfi_10.toString(),
            row.sarfi_30.toString(),
            row.sarfi_50.toString(),
            row.sarfi_70.toString(),
            row.sarfi_80.toString(),
            row.sarfi_90.toString(),
            row.weight_factor.toFixed(4)
          ]);
        });

        // Add totals
        chartTableData.push([
          'Total / Average',
          '',
          tableData.reduce((sum, row) => sum + row.sarfi_10, 0).toString(),
          tableData.reduce((sum, row) => sum + row.sarfi_30, 0).toString(),
          tableData.reduce((sum, row) => sum + row.sarfi_50, 0).toString(),
          tableData.reduce((sum, row) => sum + row.sarfi_70, 0).toString(),
          tableData.reduce((sum, row) => sum + row.sarfi_80, 0).toString(),
          tableData.reduce((sum, row) => sum + row.sarfi_90, 0).toString(),
          (tableData.reduce((sum, row) => sum + row.weight_factor, 0) / tableData.length).toFixed(4)
        ]);
      }

      // Combine header and data
      const allData = [...headerData, ...chartTableData];
      const ws = XLSX.utils.aoa_to_sheet(allData);

      // Set column widths
      ws['!cols'] = [
        { wch: 20 }, // Month/Meter No
        { wch: 25 }, // Location
        { wch: 12 }, // SARFI-10/70
        { wch: 12 }, // SARFI-30/80
        { wch: 12 }, // SARFI-50/90
        { wch: 12 }, // SARFI-70
        { wch: 12 }, // SARFI-80
        { wch: 12 }, // SARFI-90
        { wch: 15 }  // Weight Factor
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'SARFI Metrics');
      XLSX.writeFile(wb, `SARFI_Metrics_${new Date().toISOString().slice(0, 10)}.xlsx`);

      console.log('✅ Excel export completed');
    } catch (error) {
      console.error('❌ Error exporting to Excel:', error);
      alert('Failed to export to Excel. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    setIsExporting(true);
    setShowExportDropdown(false);

    try {
      const headers = ['Month', 'SARFI-70', 'SARFI-80', 'SARFI-90'];
      const rows = chartData.map(d => [
        d.label,
        d.sarfi_70.toFixed(2),
        d.sarfi_80.toFixed(2),
        d.sarfi_90.toFixed(2)
      ]);

      const csvContent = [
        `# SARFI Metrics Report`,
        `# Generated: ${new Date().toLocaleString()}`,
        `# Profile: ${profiles.find(p => p.id === filters.profileId)?.name || 'N/A'}`,
        `# Voltage Level: ${filters.voltageLevel}`,
        '',
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `SARFI_Metrics_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();

      console.log('✅ CSV export completed');
    } catch (error) {
      console.error('❌ Error exporting to CSV:', error);
      alert('Failed to export to CSV. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const aggregatedData = metrics.reduce((acc, metric) => {
    const key = `${metric.period_year}-${metric.period_month}`;
    if (!acc[key]) {
      acc[key] = {
        year: metric.period_year,
        month: metric.period_month,
        sarfi_70: 0,
        sarfi_80: 0,
        sarfi_90: 0,
        count: 0,
      };
    }
    acc[key].sarfi_70 += metric.sarfi_70;
    acc[key].sarfi_80 += metric.sarfi_80;
    acc[key].sarfi_90 += metric.sarfi_90;
    acc[key].count += 1;
    return acc;
  }, {} as Record<string, any>);

  const chartData = Object.values(aggregatedData).map((d: any) => ({
    label: `${monthNames[d.month - 1]} ${d.year}`,
    sarfi_70: d.sarfi_70 / d.count,
    sarfi_80: d.sarfi_80 / d.count,
    sarfi_90: d.sarfi_90 / d.count,
  }));

  const maxValue = Math.max(
    ...chartData.flatMap(d => [d.sarfi_70, d.sarfi_80, d.sarfi_90])
  );

  return (
    <>
      <div ref={chartRef} className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6 border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-slate-700" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">SARFI Metrics Trend</h2>
              <p className="text-sm text-slate-600">System Average RMS Variation Frequency Index</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 mr-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-xs text-slate-600">SARFI-70</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                <span className="text-xs text-slate-600">SARFI-80</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-teal-500"></div>
                <span className="text-xs text-slate-600">SARFI-90</span>
              </div>
            </div>
            
            {/* Export Button */}
            <div className="relative export-dropdown-container">
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                disabled={isExporting || chartData.length === 0}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export SARFI data"
              >
                <Download className="w-5 h-5" />
              </button>

              {showExportDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
                  <button
                    onClick={handleExportExcel}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                    Export to Excel
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-blue-600" />
                    Export to CSV
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsConfigOpen(true)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors group"
              title="Configure SARFI filters"
            >
              <Settings2 className="w-5 h-5 text-slate-600 group-hover:text-blue-600 transition-colors" />
            </button>
          </div>
        </div>

      <div className="relative h-64">
        <div className="absolute inset-0 flex items-end justify-between gap-2">
          {chartData.map((data, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex items-end justify-center gap-0.5 h-48">
                <div
                  className="bg-gradient-to-t from-blue-500 to-blue-400 rounded-t w-full transition-all hover:opacity-80"
                  style={{ height: `${(data.sarfi_70 / maxValue) * 100}%` }}
                  title={`SARFI-70: ${data.sarfi_70.toFixed(2)}`}
                />
                <div
                  className="bg-gradient-to-t from-cyan-500 to-cyan-400 rounded-t w-full transition-all hover:opacity-80"
                  style={{ height: `${(data.sarfi_80 / maxValue) * 100}%` }}
                  title={`SARFI-80: ${data.sarfi_80.toFixed(2)}`}
                />
                <div
                  className="bg-gradient-to-t from-teal-500 to-teal-400 rounded-t w-full transition-all hover:opacity-80"
                  style={{ height: `${(data.sarfi_90 / maxValue) * 100}%` }}
                  title={`SARFI-90: ${data.sarfi_90.toFixed(2)}`}
                />
              </div>
              <span className="text-xs text-slate-600 font-medium">{data.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-600 mb-1">Avg SARFI-70</p>
            <p className="text-lg font-bold text-slate-900">
              {(chartData.reduce((acc, d) => acc + d.sarfi_70, 0) / chartData.length).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600 mb-1">Avg SARFI-80</p>
            <p className="text-lg font-bold text-slate-900">
              {(chartData.reduce((acc, d) => acc + d.sarfi_80, 0) / chartData.length).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600 mb-1">Avg SARFI-90</p>
            <p className="text-lg font-bold text-slate-900">
              {(chartData.reduce((acc, d) => acc + d.sarfi_90, 0) / chartData.length).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
      </div>

      {/* Data Table (conditional - only shown when showDataTable is enabled) */}
      {filters.showDataTable && (
        <>
          {isLoadingTable ? (
            <div className="mt-6 bg-white rounded-xl border border-slate-200 p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-slate-600">Loading SARFI data table...</p>
            </div>
          ) : tableData.length > 0 ? (
            <SARFIDataTable data={tableData} />
          ) : (
            <div className="mt-6 bg-white rounded-xl border border-slate-200 p-8 text-center">
              <p className="text-slate-500">No data available for the selected filters</p>
              <p className="text-sm text-slate-400 mt-2">
                Try adjusting the voltage level or profile selection
              </p>
            </div>
          )}
        </>
      )}

      {/* Configuration Modal */}
      <SARFIConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        filters={filters}
        onApply={handleApplyFilters}
        profiles={profiles}
        onEditProfile={handleEditProfile}
      />

      {/* Profile Edit Modal */}
      <SARFIProfileEditModal
        isOpen={isEditProfileOpen}
        onClose={() => {
          setIsEditProfileOpen(false);
          setEditingProfile(null);
        }}
        profile={editingProfile}
        onSave={handleProfileSaved}
      />
    </>
  );
}
