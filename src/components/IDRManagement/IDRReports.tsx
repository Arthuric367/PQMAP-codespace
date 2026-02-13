import { useState, useEffect } from 'react';
import { FileText, Upload, Filter, Search, Edit2, Trash2, Download, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { IDRRecord } from '../../types/database';
import IDRImportModal from './IDRImportModal';
import IDREditModal from './IDREditModal';
import toast from 'react-hot-toast';

export default function IDRReports() {
  const [idrRecords, setIDRRecords] = useState<IDRRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedIDR, setSelectedIDR] = useState<IDRRecord | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVoltageLevel, setFilterVoltageLevel] = useState<string>('');
  const [filterRegion, setFilterRegion] = useState<string>('');
  const [filterMappedStatus, setFilterMappedStatus] = useState<string>(''); // 'all', 'mapped', 'unmapped'
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  useEffect(() => {
    fetchIDRRecords();
  }, [currentPage, searchTerm, filterVoltageLevel, filterRegion, filterMappedStatus, filterDateFrom, filterDateTo]);

  const fetchIDRRecords = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('idr_records')
        .select('*, event:pq_events(id, timestamp, event_type, meter_id)', { count: 'exact' })
        .order('occurrence_time', { ascending: false });

      // Apply filters
      if (searchTerm) {
        query = query.or(`idr_no.ilike.%${searchTerm}%,source_substation.ilike.%${searchTerm}%,incident_location.ilike.%${searchTerm}%`);
      }

      if (filterVoltageLevel) {
        query = query.eq('voltage_level', filterVoltageLevel);
      }

      if (filterRegion) {
        query = query.eq('region', filterRegion);
      }

      if (filterMappedStatus === 'mapped') {
        query = query.eq('is_mapped', true);
      } else if (filterMappedStatus === 'unmapped') {
        query = query.eq('is_mapped', false);
      }

      if (filterDateFrom) {
        query = query.gte('occurrence_time', filterDateFrom);
      }

      if (filterDateTo) {
        query = query.lte('occurrence_time', filterDateTo);
      }

      // Pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setIDRRecords(data || []);
      setTotalRecords(count || 0);
    } catch (error) {
      console.error('Error fetching IDR records:', error);
      toast.error('Failed to load IDR records');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIDR = async (id: string, idrNo: string) => {
    if (!confirm(`Are you sure you want to delete IDR ${idrNo}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('idr_records')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success(`IDR ${idrNo} deleted successfully`);
      fetchIDRRecords();
    } catch (error) {
      console.error('Error deleting IDR:', error);
      toast.error('Failed to delete IDR record');
    }
  };

  const handleExportToExcel = async () => {
    try {
      // Fetch all records without pagination for export
      const { data, error } = await supabase
        .from('idr_records')
        .select('*')
        .order('occurrence_time', { ascending: false });

      if (error) throw error;

      // Convert to CSV
      const headers = [
        'IDR NO', 'OCCURRENCE TIME', 'VOLTAGE LEVEL', 'SOURCE SUBSTATION', 
        'INCIDENT LOCATION', 'DURATION (MS)', 'VL1 (%)', 'VL2 (%)', 'VL3 (%)', 
        'REGION', 'AFFECTED SENSITIVE CUSTOMER', 'MAPPED STATUS', 'MAPPED TO EVENT', 'CREATED AT'
      ];

      const csvRows = [headers.join(',')];
      
      data?.forEach(record => {
        const row = [
          record.idr_no,
          record.occurrence_time,
          record.voltage_level || '',
          record.source_substation || '',
          record.incident_location || '',
          record.duration_ms || '',
          record.v1 || '',
          record.v2 || '',
          record.v3 || '',
          record.region || '',
          record.affected_sensitive_customer ? 'Yes' : 'No',
          record.is_mapped ? 'Mapped' : 'Unmapped',
          record.event_id || '',
          new Date(record.created_at).toLocaleString()
        ];
        csvRows.push(row.join(','));
      });

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `IDR_Reports_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success('IDR records exported successfully');
    } catch (error) {
      console.error('Error exporting IDR records:', error);
      toast.error('Failed to export IDR records');
    }
  };

  const totalPages = Math.ceil(totalRecords / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            IDR Reports
          </h1>
          <p className="text-slate-600 mt-1">Imported / generated IDR records</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              showFilters
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>

          <button
            onClick={handleExportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Export to Excel
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import IDR Report File
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="grid grid-cols-5 gap-4">
            {/* Search */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Search (IDR NO, Substation, Location)
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Voltage Level */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Voltage Level
              </label>
              <select
                value={filterVoltageLevel}
                onChange={(e) => setFilterVoltageLevel(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All</option>
                <option value="400kV">400kV</option>
                <option value="132kV">132kV</option>
                <option value="11kV">11kV</option>
                <option value="380V">380V</option>
              </select>
            </div>

            {/* Region */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Region
              </label>
              <select
                value={filterRegion}
                onChange={(e) => setFilterRegion(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All</option>
                <option value="NR">NR</option>
                <option value="WER">WER</option>
              </select>
            </div>

            {/* Mapped Status */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Status
              </label>
              <select
                value={filterMappedStatus}
                onChange={(e) => setFilterMappedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All</option>
                <option value="mapped">Mapped</option>
                <option value="unmapped">Unmapped</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date From
              </label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date To
              </label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Clear Filters */}
            <div className="col-span-3 flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterVoltageLevel('');
                  setFilterRegion('');
                  setFilterMappedStatus('');
                  setFilterDateFrom('');
                  setFilterDateTo('');
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IDR Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-500">
            <div className="inline-block animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            <p className="mt-3">Loading IDR records...</p>
          </div>
        ) : idrRecords.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="font-medium text-lg">No IDR records found</p>
            <p className="text-sm mt-1">Import your first IDR report file to get started</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">IDR NO</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Occurrence Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Voltage Level</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Source Substation</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Incident Location</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Duration (MS)</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">VL1 (%)</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">VL2 (%)</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">VL3 (%)</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Region</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {idrRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-blue-600">
                        {record.idr_no}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {new Date(record.occurrence_time).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: false
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {record.voltage_level || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {record.source_substation || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        <div className="max-w-xs truncate" title={record.incident_location || ''}>
                          {record.incident_location || 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {record.duration_ms || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-slate-900">
                        {record.v1 !== null ? record.v1.toFixed(1) : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-slate-900">
                        {record.v2 !== null ? record.v2.toFixed(1) : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-slate-900">
                        {record.v3 !== null ? record.v3.toFixed(1) : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {record.region || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {record.is_mapped ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                            <CheckCircle className="w-3 h-3" />
                            Mapped
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                            <XCircle className="w-3 h-3" />
                            Unmapped
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedIDR(record);
                              setShowEditModal(true);
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit IDR"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteIDR(record.id, record.idr_no)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete IDR"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} records
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-slate-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-slate-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <IDRImportModal
          onClose={() => setShowImportModal(false)}
          onImportSuccess={() => {
            setShowImportModal(false);
            fetchIDRRecords();
          }}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedIDR && (
        <IDREditModal
          idrRecord={selectedIDR}
          onClose={() => {
            setShowEditModal(false);
            setSelectedIDR(null);
          }}
          onSaveSuccess={() => {
            fetchIDRRecords();
          }}
        />
      )}
    </div>
  );
}
