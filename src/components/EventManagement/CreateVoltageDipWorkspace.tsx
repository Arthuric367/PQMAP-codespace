import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, AlertCircle, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Substation, PQMeter, SeverityLevel } from '../../types/database';

interface EventRow {
  id: string;
  is_mother: boolean;
  timestamp: string;
  voltage_level: string;
  substation_id: string;
  meter_id: string; // PQ Meter *
  circuit_id: string; // Tx No
  v1: number;
  v2: number;
  v3: number;
  duration_ms: number;
  min_volt_recorded: boolean;
  fr_trigger: boolean; // Maps to false_event
  remarks: string;
}

interface SystemFlags {
  non_clp_system_fault: boolean;
  send_notification: boolean;
}

export default function CreateVoltageDipWorkspace() {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [substations, setSubstations] = useState<Substation[]>([]);
  const [meters, setMeters] = useState<PQMeter[]>([]);
  const [meterSearchTerm, setMeterSearchTerm] = useState<Record<string, string>>({});
  const [showMeterDropdown, setShowMeterDropdown] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [systemFlags, setSystemFlags] = useState<SystemFlags>({
    non_clp_system_fault: false,
    send_notification: false
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
    // Add initial empty row
    addRow();
  }, []);

  // Close meter dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.meter-dropdown-container')) {
        setShowMeterDropdown({});
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    try {
      const { data: substationsData } = await supabase
        .from('substations')
        .select('*')
        .order('name');

      const { data: metersData } = await supabase
        .from('pq_meters')
        .select('*')
        .order('meter_id');

      setSubstations(substationsData || []);
      setMeters(metersData || []);
    } catch (error) {
      console.error('❌ Error loading data:', error);
      alert('Failed to load substations and meters. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const addRow = () => {
    const newRow: EventRow = {
      id: crypto.randomUUID(),
      is_mother: rows.length === 0, // First row is mother by default
      timestamp: new Date().toISOString().slice(0, 16),
      voltage_level: '132kV',
      substation_id: '',
      meter_id: '',
      circuit_id: '',
      v1: 98.2,
      v2: 96.7,
      v3: 95.8,
      duration_ms: 60,
      min_volt_recorded: false,
      fr_trigger: false,
      remarks: ''
    };
    setRows([...rows, newRow]);
  };

  const deleteRow = (id: string) => {
    if (rows.length === 1) {
      alert('Cannot delete the last row. At least one event is required.');
      return;
    }
    setRows(rows.filter(r => r.id !== id));
  };

  const updateRow = (id: string, field: keyof EventRow, value: any) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
    // Clear validation error for this field
    const errorKey = `${id}_${field}`;
    if (validationErrors[errorKey]) {
      const newErrors = { ...validationErrors };
      delete newErrors[errorKey];
      setValidationErrors(newErrors);
    }
  };

  const handleMotherCheckChange = (id: string, checked: boolean) => {
    if (checked) {
      // Uncheck all other mother checkboxes (enforce single mother)
      setRows(rows.map(r => ({ ...r, is_mother: r.id === id })));
    } else {
      // Don't allow unchecking if it's the only mother
      const currentMother = rows.find(r => r.is_mother);
      if (currentMother?.id === id) {
        alert('At least one Mother Event must be selected.');
        return;
      }
      updateRow(id, 'is_mother', false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;

    // Check if exactly one mother event exists
    const motherEvents = rows.filter(r => r.is_mother);
    if (motherEvents.length !== 1) {
      alert('Please select exactly ONE Mother Event.');
      return false;
    }

    // Validate each row
    rows.forEach(row => {
      if (!row.timestamp) {
        errors[`${row.id}_timestamp`] = 'Required';
        isValid = false;
      }
      if (!row.substation_id) {
        errors[`${row.id}_substation_id`] = 'Required';
        isValid = false;
      }
      if (!row.meter_id || row.meter_id.trim() === '') {
        errors[`${row.id}_meter_id`] = 'Required';
        isValid = false;
      }
      if (!row.circuit_id || row.circuit_id.trim() === '') {
        errors[`${row.id}_circuit_id`] = 'Required';
        isValid = false;
      }
      if (row.v1 < 0 || row.v1 > 100) {
        errors[`${row.id}_v1`] = 'Must be 0-100';
        isValid = false;
      }
      if (row.v2 < 0 || row.v2 > 100) {
        errors[`${row.id}_v2`] = 'Must be 0-100';
        isValid = false;
      }
      if (row.v3 < 0 || row.v3 > 100) {
        errors[`${row.id}_v3`] = 'Must be 0-100';
        isValid = false;
      }
      if (row.duration_ms <= 0) {
        errors[`${row.id}_duration_ms`] = 'Must be > 0';
        isValid = false;
      }
    });

    setValidationErrors(errors);
    return isValid;
  };

  const calculateSeverity = (v1: number, v2: number, v3: number): SeverityLevel => {
    const minVoltage = Math.min(v1, v2, v3);
    if (minVoltage < 50) return 'critical';
    if (minVoltage < 70) return 'high';
    if (minVoltage < 85) return 'medium';
    return 'low';
  };

  const handleBatchSave = async () => {
    if (!validateForm()) {
      alert('Please fix validation errors before saving.');
      return;
    }

    if (!confirm(`Save ${rows.length} event(s) (1 Mother + ${rows.length - 1} Children)?`)) {
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const motherRow = rows.find(r => r.is_mother)!;
      const childRows = rows.filter(r => !r.is_mother);

      // 1. Create Mother Event
      const motherEventData = {
        event_type: 'voltage_dip' as const,
        timestamp: motherRow.timestamp,
        substation_id: motherRow.substation_id,
        meter_id: motherRow.meter_id || null,
        circuit_id: motherRow.circuit_id,
        v1: motherRow.v1,
        v2: motherRow.v2,
        v3: motherRow.v3,
        remaining_voltage: Math.min(motherRow.v1, motherRow.v2, motherRow.v3),
        duration_ms: motherRow.duration_ms,
        min_volt_recorded: motherRow.min_volt_recorded,
        false_event: motherRow.fr_trigger,
        non_clp_system_fault: systemFlags.non_clp_system_fault,
        remarks: motherRow.remarks,
        is_mother_event: true,
        is_child_event: false,
        parent_event_id: null,
        grouping_type: 'manual' as const,
        grouped_at: new Date().toISOString(),
        manual_create_idr: true,
        status: 'new' as const,
        severity: calculateSeverity(motherRow.v1, motherRow.v2, motherRow.v3),
        affected_phases: ['A', 'B', 'C'],
        customer_count: 0,
        is_special_event: false,
        is_late_event: false
      };

      const { data: motherEvent, error: motherError } = await supabase
        .from('pq_events')
        .insert(motherEventData)
        .select()
        .single();

      if (motherError) throw new Error(`Failed to create Mother Event: ${motherError.message}`);

      console.log('✅ Mother Event created:', motherEvent.id);

      // 2. Create Child Events
      const childEventIds: string[] = [];
      for (const childRow of childRows) {
        const childEventData = {
          event_type: 'voltage_dip' as const,
          timestamp: childRow.timestamp,
          substation_id: childRow.substation_id,
          meter_id: childRow.meter_id || null,
          circuit_id: childRow.circuit_id,
          v1: childRow.v1,
          v2: childRow.v2,
          v3: childRow.v3,
          remaining_voltage: Math.min(childRow.v1, childRow.v2, childRow.v3),
          duration_ms: childRow.duration_ms,
          min_volt_recorded: childRow.min_volt_recorded,
          false_event: childRow.fr_trigger,
          non_clp_system_fault: systemFlags.non_clp_system_fault,
          remarks: childRow.remarks,
          is_mother_event: false,
          is_child_event: true,
          parent_event_id: motherEvent.id,
          grouping_type: 'manual' as const,
          grouped_at: new Date().toISOString(),
          manual_create_idr: true,
          status: 'new' as const,
          severity: calculateSeverity(childRow.v1, childRow.v2, childRow.v3),
          affected_phases: ['A', 'B', 'C'],
          customer_count: 0,
          is_special_event: false,
          is_late_event: false
        };

        const { data: childEvent, error: childError } = await supabase
          .from('pq_events')
          .insert(childEventData)
          .select()
          .single();

        if (childError) {
          console.error('❌ Failed to create child event:', childError);
          continue;
        }

        childEventIds.push(childEvent.id);
        console.log('✅ Child Event created:', childEvent.id);
      }

      // 3. Trigger Notification (Demo Mode)
      if (systemFlags.send_notification) {
        await triggerNotification(motherEvent.id);
      }

      // 4. Create Audit Log
      await supabase.from('event_audit_logs').insert({
        event_id: motherEvent.id,
        operation_type: 'event_created',
        operation_details: {
          source: 'manual_workspace',
          child_count: childEventIds.length,
          child_event_ids: childEventIds,
          manual_create: true,
          non_clp_system_fault: systemFlags.non_clp_system_fault,
          notification_sent: systemFlags.send_notification
        },
        user_id: user?.id || null
      });

      alert(`✅ Successfully created Mother Event with ${childEventIds.length} child event(s)!`);
      
      // Close the workspace tab
      window.close();
    } catch (error: any) {
      console.error('❌ Error saving events:', error);
      alert(`Failed to save events: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const triggerNotification = async (eventId: string) => {
    try {
      // Find matching notification rules (simplified for demo)
      const { data: rules } = await supabase
        .from('notification_rules')
        .select('*')
        .eq('active', true);

      // Create notification log entry (demo mode - no actual sending)
      if (rules && rules.length > 0) {
        const rule = rules[0]; // Use first active rule for demo
        await supabase.from('notification_logs').insert({
          rule_id: rule.id,
          event_id: eventId,
          template_id: rule.template_id,
          recipient_type: 'adhoc',
          channel: 'email',
          status: 'suppressed',
          suppression_reason: 'Demo mode - notification not sent (manual event creation)',
          triggered_by: { system: false, manual_creation: true }
        });
        console.log('📧 Notification suppressed (demo mode)');
      }
    } catch (error) {
      console.error('⚠️ Error triggering notification:', error);
      // Don't fail the entire save if notification fails
    }
  };

  const handleClose = () => {
    if (rows.length > 0 && !confirm('Close without saving? All unsaved data will be lost.')) {
      return;
    }
    window.close();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Create Voltage Dip Event</h1>
              <p className="text-sm text-slate-600">Manually create voltage events with Mother-Child relationships</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-2">Instructions:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Add incident rows using the "+ Add Incident" button</li>
              <li>Select <strong>exactly ONE</strong> Mother Event (first row by default)</li>
              <li>Fill in all required fields (marked with *)</li>
              <li>VL1/VL2/VL3 are voltage percentages (0-100%)</li>
              <li>Click "Save All Events" to create the event group</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Event Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 text-left font-semibold text-slate-700">FI</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700">Incident Time *</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700">Voltage Level *</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700">Source Substation *</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700">PQ Meter *</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700">Tx No *</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700">VL1 (%) *</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700">VL2 (%) *</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700">VL3 (%) *</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700">Duration (ms) *</th>
                <th className="px-3 py-3 text-center font-semibold text-slate-700">Min Volt</th>
                <th className="px-3 py-3 text-center font-semibold text-slate-700">FR Trig</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700">Remarks</th>
                <th className="px-3 py-3 text-center font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((row) => (
                <tr key={row.id} className={row.is_mother ? 'bg-blue-50' : ''}>
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={row.is_mother}
                      onChange={(e) => handleMotherCheckChange(row.id, e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      title="Mark as Mother Event"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="datetime-local"
                      value={row.timestamp}
                      onChange={(e) => updateRow(row.id, 'timestamp', e.target.value)}
                      className={`w-40 px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 ${
                        validationErrors[`${row.id}_timestamp`] ? 'border-red-500' : 'border-slate-300'
                      }`}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <select
                      value={row.voltage_level}
                      onChange={(e) => updateRow(row.id, 'voltage_level', e.target.value)}
                      className="w-24 px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="132kV">132kV</option>
                      <option value="400kV">400kV</option>
                      <option value="11kV">11kV</option>
                      <option value="380V">380V</option>
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <select
                      value={row.substation_id}
                      onChange={(e) => updateRow(row.id, 'substation_id', e.target.value)}
                      className={`w-44 px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 ${
                        validationErrors[`${row.id}_substation_id`] ? 'border-red-500' : 'border-slate-300'
                      }`}
                    >
                      <option value="">Select...</option>
                      {substations.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3 relative meter-dropdown-container">
                    <input
                      type="text"
                      value={meterSearchTerm[row.id] || meters.find(m => m.id === row.meter_id)?.meter_id || ''}
                      onChange={(e) => {
                        setMeterSearchTerm({ ...meterSearchTerm, [row.id]: e.target.value });
                        setShowMeterDropdown({ ...showMeterDropdown, [row.id]: true });
                      }}
                      onFocus={() => setShowMeterDropdown({ ...showMeterDropdown, [row.id]: true })}
                      placeholder="Search meter..."
                      className={`w-44 px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 ${
                        validationErrors[`${row.id}_meter_id`] ? 'border-red-500' : 'border-slate-300'
                      }`}
                    />
                    {showMeterDropdown[row.id] && (
                      <div className="absolute z-10 mt-1 w-64 bg-white border border-slate-300 rounded shadow-lg max-h-48 overflow-y-auto">
                        {meters
                          .filter(m => {
                            // Filter by substation if selected, otherwise show all
                            const matchesSubstation = !row.substation_id || m.substation_id === row.substation_id;
                            // Filter by search term
                            const searchTerm = (meterSearchTerm[row.id] || '').toLowerCase();
                            const matchesSearch = !searchTerm || m.meter_id.toLowerCase().includes(searchTerm);
                            return matchesSubstation && matchesSearch;
                          })
                          .map(m => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                updateRow(row.id, 'meter_id', m.id);
                                setMeterSearchTerm({ ...meterSearchTerm, [row.id]: m.meter_id });
                                setShowMeterDropdown({ ...showMeterDropdown, [row.id]: false });
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                            >
                              {m.meter_id}
                            </button>
                          ))}
                        {meters.filter(m => {
                          const matchesSubstation = !row.substation_id || m.substation_id === row.substation_id;
                          const searchTerm = (meterSearchTerm[row.id] || '').toLowerCase();
                          const matchesSearch = !searchTerm || m.meter_id.toLowerCase().includes(searchTerm);
                          return matchesSubstation && matchesSearch;
                        }).length === 0 && (
                          <div className="px-3 py-2 text-sm text-slate-500 italic">No meters found</div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="text"
                      value={row.circuit_id}
                      onChange={(e) => updateRow(row.id, 'circuit_id', e.target.value)}
                      placeholder="e.g., T1"
                      className={`w-24 px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 ${
                        validationErrors[`${row.id}_circuit_id`] ? 'border-red-500' : 'border-slate-300'
                      }`}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      value={row.v1}
                      onChange={(e) => updateRow(row.id, 'v1', parseFloat(e.target.value))}
                      min="0"
                      max="100"
                      step="0.1"
                      className={`w-20 px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 ${
                        validationErrors[`${row.id}_v1`] ? 'border-red-500' : 'border-slate-300'
                      }`}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      value={row.v2}
                      onChange={(e) => updateRow(row.id, 'v2', parseFloat(e.target.value))}
                      min="0"
                      max="100"
                      step="0.1"
                      className={`w-20 px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 ${
                        validationErrors[`${row.id}_v2`] ? 'border-red-500' : 'border-slate-300'
                      }`}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      value={row.v3}
                      onChange={(e) => updateRow(row.id, 'v3', parseFloat(e.target.value))}
                      min="0"
                      max="100"
                      step="0.1"
                      className={`w-20 px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 ${
                        validationErrors[`${row.id}_v3`] ? 'border-red-500' : 'border-slate-300'
                      }`}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="number"
                      value={row.duration_ms}
                      onChange={(e) => updateRow(row.id, 'duration_ms', parseInt(e.target.value))}
                      min="1"
                      className={`w-24 px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 ${
                        validationErrors[`${row.id}_duration_ms`] ? 'border-red-500' : 'border-slate-300'
                      }`}
                    />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={row.min_volt_recorded}
                      onChange={(e) => updateRow(row.id, 'min_volt_recorded', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={row.fr_trigger}
                      onChange={(e) => updateRow(row.id, 'fr_trigger', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="text"
                      value={row.remarks}
                      onChange={(e) => updateRow(row.id, 'remarks', e.target.value)}
                      placeholder="Remarks"
                      className="w-40 px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={() => deleteRow(row.id)}
                      disabled={rows.length === 1}
                      className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete Row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Row Button */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
          <button
            onClick={addRow}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Incident
          </button>
        </div>
      </div>

      {/* System-Level Flags */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">System-Level Flags</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={systemFlags.non_clp_system_fault}
              onChange={(e) => setSystemFlags({ ...systemFlags, non_clp_system_fault: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <div>
              <span className="font-medium text-slate-700">Non-CLP System Fault</span>
              <p className="text-sm text-slate-500">Fault originated outside the CLP network</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={systemFlags.send_notification}
              onChange={(e) => setSystemFlags({ ...systemFlags, send_notification: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <div>
              <span className="font-medium text-slate-700">Send Notification</span>
              <p className="text-sm text-slate-500">Trigger notification (demo mode - log only)</p>
            </div>
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow-sm p-6">
        <div className="text-sm text-slate-600">
          <strong>{rows.length}</strong> incident(s) - <strong>{rows.filter(r => r.is_mother).length}</strong> Mother, <strong>{rows.filter(r => !r.is_mother).length}</strong> Children
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleClose}
            disabled={saving}
            className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleBatchSave}
            disabled={saving || rows.length === 0}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save All Events
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
