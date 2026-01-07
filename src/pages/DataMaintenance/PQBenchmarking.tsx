import { useState, useEffect } from 'react';
import { Award, Download, Upload, FileDown, Edit2, Trash2, Plus, Save, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { PQBenchmarkStandard, PQBenchmarkThreshold } from '../../types/database';
import {
  fetchBenchmarkStandards,
  fetchStandardThresholds,
  createBenchmarkStandard,
  updateBenchmarkStandard,
  deleteBenchmarkStandard,
  addThreshold,
  updateThreshold,
  deleteThreshold,
  importThresholdsCSV,
  validateThresholdUnique
} from '../../services/benchmarkingService';
import * as XLSX from 'xlsx';

type SortField = 'min_voltage' | 'duration';
type SortOrder = 'asc' | 'desc';

export default function PQBenchmarking() {
  const [standards, setStandards] = useState<PQBenchmarkStandard[]>([]);
  const [selectedStandardId, setSelectedStandardId] = useState<string>('');
  const [thresholds, setThresholds] = useState<PQBenchmarkThreshold[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Sorting states
  const [sortField, setSortField] = useState<SortField>('duration');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  
  // Editing states
  const [editingThresholdId, setEditingThresholdId] = useState<string | null>(null);
  const [editingVoltage, setEditingVoltage] = useState<string>('');
  const [editingDuration, setEditingDuration] = useState<string>('');
  
  // Import/Export states
  const [showImportDropdown, setShowImportDropdown] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: Array<{ row: number; message: string }>;
  } | null>(null);

  // Add threshold modal states
  const [showAddThresholdModal, setShowAddThresholdModal] = useState(false);
  const [newVoltage, setNewVoltage] = useState<string>('');
  const [newDuration, setNewDuration] = useState<string>('');

  // Standard management modal states
  const [showStandardModal, setShowStandardModal] = useState(false);
  const [editingStandard, setEditingStandard] = useState<PQBenchmarkStandard | null>(null);
  const [standardName, setStandardName] = useState<string>('');
  const [standardDescription, setStandardDescription] = useState<string>('');

  // Load standards on mount
  useEffect(() => {
    loadStandards();
  }, []);

  // Load thresholds when standard changes
  useEffect(() => {
    if (selectedStandardId) {
      loadThresholds();
    } else {
      setThresholds([]);
    }
  }, [selectedStandardId]);

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showImportDropdown && !target.closest('.import-dropdown-container')) {
        setShowImportDropdown(false);
      }
      if (showExportDropdown && !target.closest('.export-dropdown-container')) {
        setShowExportDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showImportDropdown, showExportDropdown]);

  const loadStandards = async () => {
    try {
      const data = await fetchBenchmarkStandards();
      setStandards(data);
      
      // Auto-select first standard if available
      if (data.length > 0 && !selectedStandardId) {
        setSelectedStandardId(data[0].id);
      }
    } catch (error) {
      console.error('❌ Error loading standards:', error);
      alert('Failed to load PQ benchmarking standards');
    }
  };

  const loadThresholds = async () => {
    setIsLoading(true);
    try {
      const data = await fetchStandardThresholds(selectedStandardId);
      setThresholds(data);
    } catch (error) {
      console.error('❌ Error loading thresholds:', error);
      alert('Failed to load thresholds');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedThresholds = [...thresholds].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    const multiplier = sortOrder === 'asc' ? 1 : -1;
    return (aValue - bValue) * multiplier;
  });

  const handleEditStart = (threshold: PQBenchmarkThreshold) => {
    setEditingThresholdId(threshold.id);
    setEditingVoltage(threshold.min_voltage.toString());
    setEditingDuration(threshold.duration.toString());
  };

  const handleEditCancel = () => {
    setEditingThresholdId(null);
    setEditingVoltage('');
    setEditingDuration('');
  };

  const handleEditSave = async (thresholdId: string) => {
    const voltage = parseFloat(editingVoltage);
    const duration = parseFloat(editingDuration);

    // Validation
    if (isNaN(voltage) || voltage < 0 || voltage > 100) {
      alert('Min. Voltage must be between 0 and 100%');
      return;
    }

    if (isNaN(duration) || duration < 0 || duration > 1) {
      alert('Duration must be between 0 and 1 second');
      return;
    }

    // Check uniqueness
    const isUnique = await validateThresholdUnique(selectedStandardId, voltage, duration, thresholdId);
    if (!isUnique) {
      alert('A threshold with this voltage and duration already exists');
      return;
    }

    try {
      await updateThreshold(thresholdId, {
        min_voltage: voltage,
        duration: duration
      });
      await loadThresholds();
      setEditingThresholdId(null);
      setEditingVoltage('');
      setEditingDuration('');
    } catch (error) {
      console.error('❌ Error updating threshold:', error);
      alert('Failed to update threshold');
    }
  };

  const handleDeleteThreshold = async (thresholdId: string) => {
    if (!confirm('Are you sure you want to delete this threshold?')) {
      return;
    }

    try {
      await deleteThreshold(thresholdId);
      await loadThresholds();
    } catch (error) {
      console.error('❌ Error deleting threshold:', error);
      alert('Failed to delete threshold');
    }
  };

  const handleAddThreshold = async () => {
    const voltage = parseFloat(newVoltage);
    const duration = parseFloat(newDuration);

    // Validation
    if (isNaN(voltage) || voltage < 0 || voltage > 100) {
      alert('Min. Voltage must be between 0 and 100%');
      return;
    }

    if (isNaN(duration) || duration < 0 || duration > 1) {
      alert('Duration must be between 0 and 1 second');
      return;
    }

    // Check uniqueness
    const isUnique = await validateThresholdUnique(selectedStandardId, voltage, duration);
    if (!isUnique) {
      alert('A threshold with this voltage and duration already exists');
      return;
    }

    try {
      await addThreshold({
        standard_id: selectedStandardId,
        min_voltage: voltage,
        duration: duration
      });
      await loadThresholds();
      setShowAddThresholdModal(false);
      setNewVoltage('');
      setNewDuration('');
    } catch (error: any) {
      console.error('❌ Error adding threshold:', error);
      alert(error.message || 'Failed to add threshold');
    }
  };

  // Standard CRUD operations
  const handleCreateStandard = () => {
    setEditingStandard(null);
    setStandardName('');
    setStandardDescription('');
    setShowStandardModal(true);
  };

  const handleEditStandard = (standard: PQBenchmarkStandard) => {
    setEditingStandard(standard);
    setStandardName(standard.name);
    setStandardDescription(standard.description || '');
    setShowStandardModal(true);
  };

  const handleSaveStandard = async () => {
    if (!standardName.trim()) {
      alert('Standard name is required');
      return;
    }

    try {
      if (editingStandard) {
        await updateBenchmarkStandard(editingStandard.id, {
          name: standardName,
          description: standardDescription || null
        });
      } else {
        await createBenchmarkStandard({
          name: standardName,
          description: standardDescription || undefined
        });
      }
      await loadStandards();
      setShowStandardModal(false);
      setEditingStandard(null);
      setStandardName('');
      setStandardDescription('');
    } catch (error: any) {
      console.error('❌ Error saving standard:', error);
      alert(error.message || 'Failed to save standard');
    }
  };

  const handleDeleteStandard = async (standardId: string) => {
    if (!confirm('Are you sure you want to delete this standard? All thresholds will also be deleted.')) {
      return;
    }

    try {
      await deleteBenchmarkStandard(standardId);
      await loadStandards();
      if (selectedStandardId === standardId) {
        setSelectedStandardId('');
      }
    } catch (error) {
      console.error('❌ Error deleting standard:', error);
      alert('Failed to delete standard');
    }
  };

  // Export functions
  const handleDownloadTemplate = () => {
    const headers = ['min_voltage', 'duration'];
    const exampleData = [
      ['# PQ Benchmarking Threshold Import Template'],
      [`# Standard: ${standards.find(s => s.id === selectedStandardId)?.name || 'N/A'}`],
      [`# Generated: ${new Date().toLocaleString()}`],
      ['# Instructions: Enter voltage (0-100%) and duration (0-1 seconds) values.'],
      ['# Format: min_voltage (decimal with 3 places), duration (decimal with 3 places)'],
      [],
      headers,
      ['100.000', '0.020'],
      ['70.000', '0.500']
    ];

    const csv = exampleData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `PQ_Benchmark_Template_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setShowImportDropdown(false);
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setShowImportModal(true);
    setImportResults(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      
      if (lines.length < 2) {
        alert('CSV file is empty or invalid');
        setIsImporting(false);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim());
      if (!headers.includes('min_voltage') || !headers.includes('duration')) {
        alert('CSV must contain min_voltage and duration columns');
        setIsImporting(false);
        return;
      }

      const voltageIndex = headers.indexOf('min_voltage');
      const durationIndex = headers.indexOf('duration');

      const csvData: Array<{ min_voltage: number; duration: number }> = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const voltage = parseFloat(values[voltageIndex]);
        const duration = parseFloat(values[durationIndex]);

        if (!isNaN(voltage) && !isNaN(duration)) {
          csvData.push({ min_voltage: voltage, duration: duration });
        }
      }

      const results = await importThresholdsCSV(selectedStandardId, csvData);
      setImportResults(results);
      
      if (results.success > 0) {
        await loadThresholds();
      }
    } catch (error) {
      console.error('❌ Error importing CSV:', error);
      alert('Failed to import CSV file');
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const handleExportExcel = async () => {
    setShowExportDropdown(false);

    try {
      const standard = standards.find(s => s.id === selectedStandardId);
      const headerData = [
        ['PQ Benchmarking Standard Report'],
        ['Standard:', standard?.name || 'N/A'],
        ['Description:', standard?.description || 'N/A'],
        ['Generated:', new Date().toLocaleString()],
        ['Total Thresholds:', thresholds.length.toString()],
        [],
        ['Min. Voltage (%)', 'Duration (s)']
      ];

      const dataRows = thresholds.map(t => [
        t.min_voltage.toFixed(3),
        t.duration.toFixed(3)
      ]);

      const allData = [...headerData, ...dataRows];
      const ws = XLSX.utils.aoa_to_sheet(allData);

      ws['!cols'] = [
        { wch: 20 },
        { wch: 20 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'PQ Benchmark');
      XLSX.writeFile(wb, `PQ_Benchmark_${standard?.name || 'Export'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (error) {
      console.error('❌ Error exporting to Excel:', error);
      alert('Failed to export to Excel');
    }
  };

  const handleExportCSV = () => {
    setShowExportDropdown(false);

    try {
      const standard = standards.find(s => s.id === selectedStandardId);
      const headers = ['min_voltage', 'duration'];
      const rows = thresholds.map(t => [
        t.min_voltage.toFixed(3),
        t.duration.toFixed(3)
      ]);

      const csvContent = [
        `# PQ Benchmarking Standard Report`,
        `# Standard: ${standard?.name || 'N/A'}`,
        `# Generated: ${new Date().toLocaleString()}`,
        '',
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `PQ_Benchmark_${standard?.name || 'Export'}_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
    } catch (error) {
      console.error('❌ Error exporting to CSV:', error);
      alert('Failed to export to CSV');
    }
  };

  const selectedStandard = standards.find(s => s.id === selectedStandardId);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Award className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-slate-900">PQ Benchmarking Standard</h1>
        </div>
        <p className="text-slate-600">
          Manage international PQ benchmarking standards and voltage/duration thresholds
        </p>
      </div>

      {/* Standard Selector & Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 max-w-md">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Benchmarking Standard
            </label>
            <div className="flex gap-2">
              <select
                value={selectedStandardId}
                onChange={(e) => setSelectedStandardId(e.target.value)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a standard...</option>
                {standards.map(standard => (
                  <option key={standard.id} value={standard.id}>
                    {standard.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleCreateStandard}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                title="Create New Standard"
              >
                <Plus className="w-5 h-5" />
              </button>
              {selectedStandardId && (
                <>
                  <button
                    onClick={() => handleEditStandard(selectedStandard!)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    title="Edit Standard"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteStandard(selectedStandardId)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    title="Delete Standard"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Import Button */}
            <div className="relative import-dropdown-container">
              <button
                onClick={() => setShowImportDropdown(!showImportDropdown)}
                disabled={!selectedStandardId}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Import
              </button>

              {showImportDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-30">
                  <label className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer text-slate-700">
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span>Import CSV</span>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleImportCSV}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={handleDownloadTemplate}
                    className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <FileDown className="w-4 h-4 text-green-600" />
                    <span>Download Template</span>
                  </button>
                </div>
              )}
            </div>

            {/* Export Button */}
            <div className="relative export-dropdown-container">
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                disabled={!selectedStandardId || thresholds.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>

              {showExportDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
                  <button
                    onClick={handleExportExcel}
                    className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <Download className="w-4 h-4 text-green-600" />
                    <span>Export to Excel</span>
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <Download className="w-4 h-4 text-blue-600" />
                    <span>Export to CSV</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {selectedStandard && (
          <div className="text-sm text-slate-600 pt-4 border-t border-slate-200">
            <div className="mb-2">
              <span className="font-medium">Description:</span> {selectedStandard.description || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Total Thresholds:</span> {thresholds.length}
            </div>
          </div>
        )}
      </div>

      {/* Add Threshold Button - Above Table */}
      {selectedStandardId && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowAddThresholdModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Threshold
          </button>
        </div>
      )}

      {/* Data Table */}
      {!selectedStandardId ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Award className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg">Select a benchmarking standard to view thresholds</p>
        </div>
      ) : isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600">Loading thresholds...</p>
        </div>
      ) : thresholds.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500">No thresholds defined for this standard</p>
          <p className="text-sm text-slate-400 mt-2">Click "Add Threshold" to get started</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 select-none"
                    onClick={() => handleSort('min_voltage')}
                  >
                    <div className="flex items-center gap-2">
                      <span>Min. Voltage (%)</span>
                      {sortField === 'min_voltage' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                      ) : (
                        <ArrowUpDown className="w-4 h-4 text-slate-300" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 select-none"
                    onClick={() => handleSort('duration')}
                  >
                    <div className="flex items-center gap-2">
                      <span>Duration (s)</span>
                      {sortField === 'duration' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                      ) : (
                        <ArrowUpDown className="w-4 h-4 text-slate-300" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sortedThresholds.map((threshold) => (
                  <tr key={threshold.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {editingThresholdId === threshold.id ? (
                        <input
                          type="number"
                          value={editingVoltage}
                          onChange={(e) => setEditingVoltage(e.target.value)}
                          min="0"
                          max="100"
                          step="0.001"
                          className="w-32 px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      ) : (
                        threshold.min_voltage.toFixed(3)
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {editingThresholdId === threshold.id ? (
                        <input
                          type="number"
                          value={editingDuration}
                          onChange={(e) => setEditingDuration(e.target.value)}
                          min="0"
                          max="1"
                          step="0.001"
                          className="w-32 px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        threshold.duration.toFixed(3)
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      {editingThresholdId === threshold.id ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditSave(threshold.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                            title="Save"
                          >
                            <Save className="w-5 h-5" />
                          </button>
                          <button
                            onClick={handleEditCancel}
                            className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg"
                            title="Cancel"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditStart(threshold)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Edit"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteThreshold(threshold.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Standard Edit Modal */}
      {showStandardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">
                {editingStandard ? 'Edit Standard' : 'Create New Standard'}
              </h3>
              <button
                onClick={() => {
                  setShowStandardModal(false);
                  setEditingStandard(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Standard Name *
                </label>
                <input
                  type="text"
                  value={standardName}
                  onChange={(e) => setStandardName(e.target.value)}
                  placeholder="e.g., IEC 61000-4-34"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={standardDescription}
                  onChange={(e) => setStandardDescription(e.target.value)}
                  placeholder="Brief description of the standard..."
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => {
                  setShowStandardModal(false);
                  setEditingStandard(null);
                }}
                className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStandard}
                disabled={!standardName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {editingStandard ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Threshold Modal */}
      {showAddThresholdModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Add Threshold</h3>
              <button
                onClick={() => {
                  setShowAddThresholdModal(false);
                  setNewVoltage('');
                  setNewDuration('');
                }}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Min. Voltage (%) *
                </label>
                <input
                  type="number"
                  value={newVoltage}
                  onChange={(e) => setNewVoltage(e.target.value)}
                  min="0"
                  max="100"
                  step="0.001"
                  placeholder="0.000 - 100.000"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Duration (s) *
                </label>
                <input
                  type="number"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  min="0"
                  max="1"
                  step="0.001"
                  placeholder="0.000 - 1.000"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => {
                  setShowAddThresholdModal(false);
                  setNewVoltage('');
                  setNewDuration('');
                }}
                className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAddThreshold}
                disabled={!newVoltage || !newDuration}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Add Threshold
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Results Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Import Results</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {isImporting ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-slate-600 text-lg">Processing import...</p>
                </div>
              ) : importResults ? (
                <div>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm text-green-600 font-medium">Successful</p>
                      <p className="text-3xl font-bold text-green-700">{importResults.success}</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-600 font-medium">Failed</p>
                      <p className="text-3xl font-bold text-red-700">{importResults.failed}</p>
                    </div>
                  </div>

                  {importResults.errors.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-3">Error Details:</h4>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                        {importResults.errors.map((error, idx) => (
                          <div key={idx} className="text-sm text-red-700 mb-2">
                            <span className="font-medium">Row {error.row}:</span> {error.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="flex-shrink-0 p-6 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setShowImportModal(false)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
