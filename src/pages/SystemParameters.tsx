import { Settings } from 'lucide-react';

export default function SystemParameters() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-slate-900">System Parameters</h1>
        </div>
        <p className="text-slate-600">
          Configure system-wide settings for notifications, event detection, and operational parameters
        </p>
      </div>

      {/* Under Construction */}
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <Settings className="w-24 h-24 text-slate-300 mx-auto mb-6" />
        <h2 className="text-2xl font-semibold text-slate-900 mb-3">Under Construction</h2>
        <p className="text-slate-600 text-lg">To be updated later.</p>
        <p className="text-sm text-slate-500 mt-4">
          This module will include configuration options for:
        </p>
        <div className="mt-6 max-w-xl mx-auto">
          <ul className="text-left space-y-2 text-slate-600">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Notification thresholds and alert rules</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Event detection parameters and sensitivity levels</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Data retention policies and archival settings</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>System integration configurations</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>User preference defaults</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
