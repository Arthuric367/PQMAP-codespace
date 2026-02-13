import { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { IDRRecord } from '../../types/database';
import toast from 'react-hot-toast';

interface IDREditModalProps {
  idrRecord: IDRRecord;
  onClose: () => void;
  onSaveSuccess: () => void;
}

export default function IDREditModal({ idrRecord, onClose, onSaveSuccess }: IDREditModalProps) {
  const [formData, setFormData] = useState<Partial<IDRRecord>>(idrRecord);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleSave = async () => {
    // Validate required fields
    const validationErrors: string[] = [];
    
    if (!formData.idr_no || formData.idr_no.trim() === '') {
      validationErrors.push('IDR NO is required');
    }
    
    if (!formData.occurrence_time) {
      validationErrors.push('Occurrence Time is required');
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    setErrors([]);

    try {
      const { error } = await supabase
        .from('idr_records')
        .update({
          idr_no: formData.idr_no,
          occurrence_time: formData.occurrence_time,
          voltage_level: formData.voltage_level,
          source_substation: formData.source_substation,
          incident_location: formData.incident_location,
          region: formData.region,
          duration_ms: formData.duration_ms,
          v1: formData.v1,
          v2: formData.v2,
          v3: formData.v3,
          affected_sensitive_customer: formData.affected_sensitive_customer,
          cause: formData.cause,
          equipment_type: formData.equipment_type,
          weather: formData.weather,
          remarks: formData.remarks,
          circuit: formData.circuit,
          faulty_component: formData.faulty_component,
          cause_group: formData.cause_group,
          object_part_group: formData.object_part_group,
          object_part_code: formData.object_part_code,
          damage_group: formData.damage_group,
          damage_code: formData.damage_code,
          fault_type: formData.fault_type,
          outage_type: formData.outage_type,
          weather_condition: formData.weather_condition,
          responsible_oc: formData.responsible_oc,
          total_cmi: formData.total_cmi,
          updated_at: new Date().toISOString(),
        })
        .eq('id', idrRecord.id);

      if (error) throw error;

      toast.success('IDR record updated successfully');
      onSaveSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating IDR:', error);
      toast.error('Failed to update IDR record');
      setErrors([error.message]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Edit IDR Record</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {errors.length > 0 && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900">Validation Errors</h3>
                  <ul className="text-sm text-red-700 mt-1 space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 text-sm uppercase tracking-wide border-b border-slate-200 pb-2">
                Core Information
              </h3>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  IDR NO <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.idr_no || ''}
                  onChange={(e) => setFormData({ ...formData, idr_no: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., INC 852080"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Occurrence Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.occurrence_time ? new Date(formData.occurrence_time).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setFormData({ ...formData, occurrence_time: new Date(e.target.value).toISOString() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Voltage Level</label>
                  <select
                    value={formData.voltage_level || ''}
                    onChange={(e) => setFormData({ ...formData, voltage_level: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select...</option>
                    <option value="400kV">400kV</option>
                    <option value="132kV">132kV</option>
                    <option value="11kV">11kV</option>
                    <option value="380V">380V</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Duration (MS)</label>
                  <input
                    type="number"
                    value={formData.duration_ms || ''}
                    onChange={(e) => setFormData({ ...formData, duration_ms: parseInt(e.target.value) || null })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Source Substation</label>
                <input
                  type="text"
                  value={formData.source_substation || ''}
                  onChange={(e) => setFormData({ ...formData, source_substation: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Incident Location</label>
                <input
                  type="text"
                  value={formData.incident_location || ''}
                  onChange={(e) => setFormData({ ...formData, incident_location: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Region</label>
                <select
                  value={formData.region || ''}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select...</option>
                  <option value="NR">NR</option>
                  <option value="WER">WER</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">VL1 (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.v1 || ''}
                    onChange={(e) => setFormData({ ...formData, v1: parseFloat(e.target.value) || null })}
                    className="w-full px-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">VL2 (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.v2 || ''}
                    onChange={(e) => setFormData({ ...formData, v2: parseFloat(e.target.value) || null })}
                    className="w-full px-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">VL3 (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.v3 || ''}
                    onChange={(e) => setFormData({ ...formData, v3: parseFloat(e.target.value) || null })}
                    className="w-full px-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.affected_sensitive_customer || false}
                    onChange={(e) => setFormData({ ...formData, affected_sensitive_customer: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  Affected Sensitive Customer
                </label>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 text-sm uppercase tracking-wide border-b border-slate-200 pb-2">
                Additional Details
              </h3>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cause</label>
                <textarea
                  value={formData.cause || ''}
                  onChange={(e) => setFormData({ ...formData, cause: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Equipment Type</label>
                <input
                  type="text"
                  value={formData.equipment_type || ''}
                  onChange={(e) => setFormData({ ...formData, equipment_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Weather</label>
                <input
                  type="text"
                  value={formData.weather || ''}
                  onChange={(e) => setFormData({ ...formData, weather: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Circuit</label>
                <input
                  type="text"
                  value={formData.circuit || ''}
                  onChange={(e) => setFormData({ ...formData, circuit: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Faulty Component</label>
                <input
                  type="text"
                  value={formData.faulty_component || ''}
                  onChange={(e) => setFormData({ ...formData, faulty_component: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Responsible OC</label>
                <input
                  type="text"
                  value={formData.responsible_oc || ''}
                  onChange={(e) => setFormData({ ...formData, responsible_oc: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                <textarea
                  value={formData.remarks || ''}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
