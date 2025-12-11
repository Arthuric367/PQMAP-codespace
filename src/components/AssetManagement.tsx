import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { PQMeter, Substation } from '../types/database';
import { Database, Activity, X, Check, Info } from 'lucide-react';

export default function AssetManagement() {
  const [meters, setMeters] = useState<PQMeter[]>([]);
  const [substations, setSubstations] = useState<Substation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selectedMeter, setSelectedMeter] = useState<PQMeter | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [metersRes, substationsRes] = await Promise.all([
        supabase.from('pq_meters').select('*'),
        supabase.from('substations').select('*'),
      ]);

      if (!metersRes.error) setMeters(metersRes.data);
      if (!substationsRes.error) setSubstations(substationsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const substationMap = substations.reduce((acc, s) => {
    acc[s.id] = s;
    return acc;
  }, {} as Record<string, Substation>);

  const filteredMeters = meters.filter(m => filter === 'all' || m.status === filter);

  const statusStats = {
    active: meters.filter(m => m.status === 'active').length,
    abnormal: meters.filter(m => m.status === 'abnormal').length,
    inactive: meters.filter(m => m.status === 'inactive').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Database className="w-8 h-8 text-slate-700" />
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Asset Management</h1>
          <p className="text-slate-600 mt-1">Monitor power quality meters and equipment</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Active Meters</p>
              <p className="text-3xl font-bold text-green-600">{statusStats.active}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-xl">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Abnormal Meters</p>
              <p className="text-3xl font-bold text-orange-600">{statusStats.abnormal}</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-xl">
              <Activity className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Inactive Meters</p>
              <p className="text-3xl font-bold text-red-600">{statusStats.inactive}</p>
            </div>
            <div className="bg-red-50 p-3 rounded-xl">
              <Activity className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Meter Inventory</h2>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="abnormal">Abnormal</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-2 text-sm font-semibold text-slate-700">Name</th>
                <th className="text-left py-2 px-2 text-sm font-semibold text-slate-700">Site ID</th>
                <th className="text-left py-2 px-2 text-sm font-semibold text-slate-700">Volt Level</th>
                <th className="text-left py-2 px-2 text-sm font-semibold text-slate-700">Substation</th>
                <th className="text-left py-2 px-2 text-sm font-semibold text-slate-700">Circuit</th>
                <th className="text-left py-2 px-2 text-sm font-semibold text-slate-700">Location</th>
                <th className="text-left py-2 px-2 text-sm font-semibold text-slate-700">OC</th>
                <th className="text-left py-2 px-2 text-sm font-semibold text-slate-700">Brand</th>
                <th className="text-left py-2 px-2 text-sm font-semibold text-slate-700">Model</th>
                <th className="text-left py-2 px-2 text-sm font-semibold text-slate-700">Nominal</th>
                <th className="text-center py-2 px-2 text-sm font-semibold text-slate-700">Active</th>
                <th className="text-center py-2 px-2 text-sm font-semibold text-slate-700">Other</th>
              </tr>
            </thead>
            <tbody>
              {filteredMeters.map((meter) => {
                const substation = substationMap[meter.substation_id];
                return (
                  <tr key={meter.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-2 text-sm font-medium text-slate-900">{meter.meter_id}</td>
                    <td className="py-2 px-2 text-sm text-slate-700">{meter.site_id || '-'}</td>
                    <td className="py-2 px-2 text-sm text-slate-700">{meter.voltage_level || '-'}</td>
                    <td className="py-2 px-2 text-sm text-slate-700">{substation?.name || 'Unknown'}</td>
                    <td className="py-2 px-2 text-sm text-slate-700">{meter.circuit_id || '-'}</td>
                    <td className="py-2 px-2 text-sm text-slate-700">{meter.location || '-'}</td>
                    <td className="py-2 px-2 text-sm text-slate-700">{meter.oc || '-'}</td>
                    <td className="py-2 px-2 text-sm text-slate-700">{meter.brand || '-'}</td>
                    <td className="py-2 px-2 text-sm text-slate-700">{meter.model || '-'}</td>
                    <td className="py-2 px-2 text-sm text-slate-700">
                      {meter.nominal_voltage ? `${meter.nominal_voltage} kV` : '-'}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {meter.active !== undefined ? (
                        meter.active ? (
                          <Check className="w-4 h-4 text-green-600 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-red-600 mx-auto" />
                        )
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        onClick={() => setSelectedMeter(meter)}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="View Details"
                      >
                        <Info className="w-4 h-4 mx-auto" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Meter Detail Modal */}
      {selectedMeter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Meter Details</h3>
              <button
                onClick={() => setSelectedMeter(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Meter ID</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedMeter.meter_id}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Site ID</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedMeter.site_id || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Status</p>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      selectedMeter.status === 'active' ? 'bg-green-100 text-green-700' :
                      selectedMeter.status === 'abnormal' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {selectedMeter.status}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Active</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {selectedMeter.active !== undefined ? (
                        selectedMeter.active ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <Check className="w-4 h-4" /> Yes
                          </span>
                        ) : (
                          <span className="text-red-600 flex items-center gap-1">
                            <X className="w-4 h-4" /> No
                          </span>
                        )
                      ) : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Location & Network */}
              <div>
                <h4 className="text-lg font-semibold text-slate-900 mb-4">Location & Network</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Substation</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {substationMap[selectedMeter.substation_id]?.name || 'Unknown'}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Location</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedMeter.location || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Circuit</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedMeter.circuit_id || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Region</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedMeter.region || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">OC</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedMeter.oc || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">IP Address</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedMeter.ip_address || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Equipment Specifications */}
              <div>
                <h4 className="text-lg font-semibold text-slate-900 mb-4">Equipment Specifications</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Brand</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedMeter.brand || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Model</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedMeter.model || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Meter Type</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedMeter.meter_type || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Voltage Level</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedMeter.voltage_level || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Nominal Voltage</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {selectedMeter.nominal_voltage ? `${selectedMeter.nominal_voltage} kV` : '-'}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">CT Type</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedMeter.ct_type || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Asset Tracking */}
              <div>
                <h4 className="text-lg font-semibold text-slate-900 mb-4">Asset Tracking</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Asset Number</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedMeter.asset_number || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Serial Number</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedMeter.serial_number || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Firmware Version</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedMeter.firmware_version || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Framework Version</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedMeter.framework_version || '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Installed Date</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {selectedMeter.installed_date 
                        ? new Date(selectedMeter.installed_date).toLocaleDateString()
                        : '-'}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Last Communication</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {selectedMeter.last_communication 
                        ? new Date(selectedMeter.last_communication).toLocaleString()
                        : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4">
              <button
                onClick={() => setSelectedMeter(null)}
                className="w-full bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
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
