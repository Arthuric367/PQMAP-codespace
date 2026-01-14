import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { NotificationRule } from '../types/database';
import { Bell, Plus, Edit2, Trash2 } from 'lucide-react';

export default function Notifications() {
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    const { data } = await supabase
      .from('notification_rules')
      .select(`
        *,
        template:notification_templates(name, code)
      `)
      .order('created_at', { ascending: false });

    if (data) setRules(data);
    setLoading(false);
  };

  const toggleRule = async (ruleId: string, active: boolean) => {
    await supabase
      .from('notification_rules')
      .update({ active: !active })
      .eq('id', ruleId);

    loadRules();
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-8 h-8 text-slate-700" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Notification System</h1>
            <p className="text-slate-600 mt-1">Configure alerts and notification rules</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all">
          <Plus className="w-5 h-5" />
          <span className="font-semibold">New Rule</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Active Rules</p>
              <p className="text-3xl font-bold text-green-600">{rules.filter(r => r.active).length}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-xl">
              <Bell className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Inactive Rules</p>
              <p className="text-3xl font-bold text-slate-600">{rules.filter(r => !r.active).length}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl">
              <Bell className="w-6 h-6 text-slate-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Total Groups</p>
              <p className="text-3xl font-bold text-blue-600">
                {new Set(rules.flatMap(r => r.notification_groups || [])).size}
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl">
              <Bell className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Notification Rules</h2>
        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-slate-900">{rule.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      rule.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {rule.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-slate-600">Template:</span>
                      <p className="font-semibold text-slate-900">
                        {(rule as any).template?.name || 'No template'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-600">Channels:</span>
                      <p className="font-semibold text-slate-900">{rule.channels?.length || 0}</p>
                    </div>
                    <div>
                      <span className="text-slate-600">Groups:</span>
                      <p className="font-semibold text-slate-900">{rule.notification_groups?.length || 0}</p>
                    </div>
                    <div>
                      <span className="text-slate-600">Priority:</span>
                      <p className="font-semibold text-slate-900">{rule.priority}</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <span className="text-slate-600 text-sm">Conditions:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {rule.conditions && rule.conditions.length > 0 ? (
                        rule.conditions.map((condition: any, index: number) => (
                          <span key={index} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg">
                            {condition.field} {condition.operator} {condition.value}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500 text-xs">No conditions (matches all events)</span>
                      )}
                    </div>
                  </div>

                  {rule.channels && rule.channels.length > 0 && (
                    <div className="mt-3">
                      <span className="text-slate-600 text-sm">Channels:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {rule.channels.map((channel: string, index: number) => (
                          <span key={index} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-lg capitalize">
                            {channel}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {rule.mother_event_only && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-purple-700 bg-purple-50 px-3 py-2 rounded-lg inline-block">
                      <span className="font-semibold">Mother Event Only</span>
                    </div>
                  )}

                  {rule.typhoon_mode_enabled && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg inline-block">
                      <span className="font-semibold">Typhoon Mode: Enabled</span>
                    </div>
                  )}

                  {rule.include_waveform && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded-lg inline-block">
                      <span className="font-semibold">Include Waveform</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => toggleRule(rule.id, rule.active)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      rule.active
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {rule.active ? 'Disable' : 'Enable'}
                  </button>
                  <button className="p-2 hover:bg-slate-100 rounded-lg transition-all">
                    <Edit2 className="w-4 h-4 text-slate-600" />
                  </button>
                  <button className="p-2 hover:bg-red-50 rounded-lg transition-all">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <div className="bg-amber-500 p-2 rounded-lg">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 mb-2">Typhoon Mode</h3>
            <p className="text-sm text-slate-700 mb-4">
              During typhoons, non-critical alerts can be suppressed to reduce notification overload.
              Rules with typhoon mode enabled will pause notifications during severe weather events.
            </p>
            <button className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all font-semibold text-sm">
              Configure Typhoon Mode
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
