import { useState } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface IDRImportModalProps {
  onClose: () => void;
  onImportSuccess: () => void;
}

interface ImportPreview {
  idr_no: string;
  occurrence_time: string;
  voltage_level: string | null;
  source_substation: string | null;
  incident_location: string | null;
  duration_ms: number | null;
  v1: number | null;
  v2: number | null;
  v3: number | null;
  region: string | null;
  affected_sensitive_customer: boolean;
  [key: string]: any;
}

export default function IDRImportModal({ onClose, onImportSuccess }: IDRImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState<ImportPreview[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setValidationErrors([]);
    setImportResults(null);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Map Excel columns to database fields
      const mappedData: ImportPreview[] = jsonData.map((row: any) => {
        // Normalize voltage level (support both "11" and "11kV" formats)
        let voltageLevel = row['VOLTAGE LEVEL'] || row['Voltage Level'] || null;
        if (voltageLevel) {
          voltageLevel = String(voltageLevel).trim();
          if (voltageLevel === '11' || voltageLevel === '11kV') voltageLevel = '11kV';
          if (voltageLevel === '132' || voltageLevel === '132kV') voltageLevel = '132kV';
          if (voltageLevel === '400' || voltageLevel === '400kV') voltageLevel = '400kV';
          if (voltageLevel === '380' || voltageLevel === '380V') voltageLevel = '380V';
        }

        return {
          idr_no: row['IDR NO'] || row['IDR No'] || row['idr_no'],
          occurrence_time: row['OCCURRENCE TIME'] || row['Occurrence Time'] || row['occurrence_time'],
          voltage_level: voltageLevel,
          source_substation: row['SOURCE SUBSTATION'] || row['Source Substation'] || row['source_substation'] || null,
          incident_location: row['INCIDENT LOCATION'] || row['Incident Location'] || row['incident_location'] || null,
          duration_ms: parseFloat(row['DURATION (MS)'] || row['Duration (MS)'] || row['duration_ms']) || null,
          v1: parseFloat(row['VL1 (%)'] || row['VL1'] || row['v1']) || null,
          v2: parseFloat(row['VL2 (%)'] || row['VL2'] || row['v2']) || null,
          v3: parseFloat(row['VL3 (%)'] || row['VL3'] || row['v3']) || null,
          region: row['REGION'] || row['Region'] || row['region'] || null,
          affected_sensitive_customer: 
            row['AFFECTED SENSITIVE CUSTOMER'] === 'Yes' || 
            row['Affected Sensitive Customer'] === 'Yes' ||
            row['affected_sensitive_customer'] === true ||
            row['affected_sensitive_customer'] === 'Yes',
          // Optional fields
          cause: row['CAUSE'] || row['Cause'] || row['cause'] || null,
          equipment_type: row['EQUIPMENT TYPE'] || row['Equipment Type'] || row['equipment_type'] || null,
          weather: row['WEATHER'] || row['Weather'] || row['weather'] || null,
          remarks: row['REMARKS'] || row['Remarks'] || row['remarks'] || null,
        };
      });

      // Validate required fields
      const errors: string[] = [];
      mappedData.forEach((record, index) => {
        const rowNum = index + 2; // +2 for Excel row number (1-indexed + header row)
        
        if (!record.idr_no) {
          errors.push(`Row ${rowNum}: IDR NO is required`);
        }
        
        if (!record.occurrence_time) {
          errors.push(`Row ${rowNum}: OCCURRENCE TIME is required`);
        }
        
        // Validate date format
        if (record.occurrence_time && isNaN(Date.parse(record.occurrence_time))) {
          errors.push(`Row ${rowNum}: Invalid date format in OCCURRENCE TIME`);
        }
      });

      if (errors.length > 0) {
        setValidationErrors(errors);
      } else {
        setPreviewData(mappedData);
      }

    } catch (error) {
      console.error('Error parsing Excel file:', error);
      toast.error('Failed to parse Excel file. Please check the file format.');
    }
  };

  const handleImport = async () => {
    if (previewData.length === 0) {
      toast.error('No valid data to import');
      return;
    }

    setImporting(true);
    const results = { success: 0, failed: 0, errors: [] as string[] };

    try {
      const { data: { user } } = await supabase.auth.getUser();

      for (const record of previewData) {
        try {
          // Check if IDR NO already exists
          const { data: existing } = await supabase
            .from('idr_records')
            .select('id')
            .eq('idr_no', record.idr_no)
            .single();

          if (existing) {
            results.failed++;
            results.errors.push(`IDR ${record.idr_no}: Already exists in database`);
            continue;
          }

          // Insert new record
          const { error } = await supabase
            .from('idr_records')
            .insert({
              idr_no: record.idr_no,
              occurrence_time: new Date(record.occurrence_time).toISOString(),
              voltage_level: record.voltage_level,
              source_substation: record.source_substation,
              incident_location: record.incident_location,
              duration_ms: record.duration_ms,
              v1: record.v1,
              v2: record.v2,
              v3: record.v3,
              region: record.region,
              affected_sensitive_customer: record.affected_sensitive_customer,
              cause: record.cause,
              equipment_type: record.equipment_type,
              weather: record.weather,
              remarks: record.remarks,
              uploaded_by: user?.id || null,
              upload_source: 'excel_import',
              is_mapped: false,
              event_id: null,
            });

          if (error) {
            results.failed++;
            results.errors.push(`IDR ${record.idr_no}: ${error.message}`);
          } else {
            results.success++;
          }
        } catch (error: any) {
          results.failed++;
          results.errors.push(`IDR ${record.idr_no}: ${error.message}`);
        }
      }

      setImportResults(results);

      if (results.success > 0) {
        toast.success(`Successfully imported ${results.success} IDR records`);
        if (results.failed === 0) {
          setTimeout(() => {
            onImportSuccess();
          }, 2000);
        }
      } else {
        toast.error('Failed to import any records');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        'IDR NO': 'INC 852080',
        'OCCURRENCE TIME': '07/12/2025 20:23:00',
        'VOLTAGE LEVEL': '132',
        'SOURCE SUBSTATION': 'SYS',
        'INCIDENT LOCATION': '(TMLR0003) Lee Po Bldg - HKTA Yuen Yuen Pri Sch',
        'DURATION (MS)': '76',
        'VL1 (%)': '96.8',
        'VL2 (%)': '76.1',
        'VL3 (%)': '67.9',
        'REGION': 'NR',
        'AFFECTED SENSITIVE CUSTOMER': 'No',
        'CAUSE': '',
        'EQUIPMENT TYPE': '',
        'WEATHER': '',
        'REMARKS': ''
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'IDR Template');
    XLSX.writeFile(wb, 'IDR_Import_Template.xlsx');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">Import IDR Report File</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!importResults ? (
            <>
              {/* File Upload */}
              <div className="mb-6">
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="idr-file-upload"
                  />
                  <label
                    htmlFor="idr-file-upload"
                    className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Click to upload Excel file
                  </label>
                  <p className="text-sm text-slate-500 mt-2">
                    Supported formats: .xlsx, .xls
                  </p>
                  {file && (
                    <p className="text-sm text-green-600 mt-2 font-medium">
                      ✓ Selected: {file.name}
                    </p>
                  )}
                </div>

                <button
                  onClick={downloadTemplate}
                  className="mt-3 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Download className="w-4 h-4" />
                  Download Excel Template
                </button>
              </div>

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-900 mb-2">Validation Errors</h3>
                      <ul className="text-sm text-red-700 space-y-1">
                        {validationErrors.slice(0, 10).map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                        {validationErrors.length > 10 && (
                          <li className="font-medium">
                            ... and {validationErrors.length - 10} more errors
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview Table */}
              {previewData.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-slate-900 mb-3">
                    Preview ({previewData.length} records)
                  </h3>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-96">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">IDR NO</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Time</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">V.Level</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Substation</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Region</th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600">Sensitive</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {previewData.slice(0, 20).map((record, index) => (
                            <tr key={index} className="hover:bg-slate-50">
                              <td className="px-3 py-2 font-medium text-blue-600">{record.idr_no}</td>
                              <td className="px-3 py-2">{record.occurrence_time}</td>
                              <td className="px-3 py-2">{record.voltage_level || 'N/A'}</td>
                              <td className="px-3 py-2">{record.source_substation || 'N/A'}</td>
                              <td className="px-3 py-2">{record.region || 'N/A'}</td>
                              <td className="px-3 py-2 text-center">
                                {record.affected_sensitive_customer ? (
                                  <CheckCircle className="w-4 h-4 text-green-600 mx-auto" />
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                          {previewData.length > 20 && (
                            <tr>
                              <td colSpan={6} className="px-3 py-2 text-center text-slate-500 text-xs">
                                ... and {previewData.length - 20} more records
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Import Results */
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-green-900">
                      Import Completed
                    </h3>
                    <p className="text-sm text-green-700 mt-1">
                      Successfully imported {importResults.success} records
                    </p>
                  </div>
                </div>
              </div>

              {importResults.failed > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-900">
                        {importResults.failed} Failed Imports
                      </h3>
                      <ul className="text-sm text-red-700 mt-2 space-y-1 max-h-48 overflow-y-auto">
                        {importResults.errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors"
          >
            {importResults ? 'Close' : 'Cancel'}
          </button>
          {!importResults && (
            <button
              onClick={handleImport}
              disabled={importing || previewData.length === 0 || validationErrors.length > 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? 'Importing...' : `Import ${previewData.length} Records`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
