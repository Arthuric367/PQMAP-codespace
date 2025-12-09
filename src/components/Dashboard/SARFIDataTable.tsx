import { SARFIDataPoint } from '../../types/database';

interface SARFIDataTableProps {
  data: SARFIDataPoint[];
}

export default function SARFIDataTable({ data }: SARFIDataTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="mt-6 bg-white rounded-xl border border-slate-200 p-8 text-center">
        <p className="text-slate-500">No data available for the selected filters</p>
      </div>
    );
  }

  return (
    <div className="mt-6 bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
        <h3 className="text-lg font-bold text-slate-900">SARFI Data by Meter</h3>
        <p className="text-sm text-slate-600 mt-1">
          Incident counts per SARFI index with weighting factors
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider sticky left-0 bg-slate-50 z-10">
                Meter No.
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Location
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                SARFI-10
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                SARFI-30
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                SARFI-50
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                SARFI-70
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                SARFI-80
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                SARFI-90
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider bg-blue-50">
                Weight Factor
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row) => (
              <tr 
                key={row.meter_id}
                className="hover:bg-slate-50 transition-colors"
              >
                <td className="px-4 py-3 text-sm font-medium text-slate-900 sticky left-0 bg-white group-hover:bg-slate-50">
                  {row.meter_no}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {row.location}
                </td>
                <td className="px-4 py-3 text-sm text-center text-slate-900">
                  {row.sarfi_10}
                </td>
                <td className="px-4 py-3 text-sm text-center text-slate-900">
                  {row.sarfi_30}
                </td>
                <td className="px-4 py-3 text-sm text-center text-slate-900">
                  {row.sarfi_50}
                </td>
                <td className="px-4 py-3 text-sm text-center text-slate-900">
                  {row.sarfi_70}
                </td>
                <td className="px-4 py-3 text-sm text-center text-slate-900">
                  {row.sarfi_80}
                </td>
                <td className="px-4 py-3 text-sm text-center text-slate-900">
                  {row.sarfi_90}
                </td>
                <td className="px-4 py-3 text-sm text-center font-semibold text-blue-600 bg-blue-50/50">
                  {row.weight_factor.toFixed(4)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 border-t border-slate-200">
            <tr>
              <td colSpan={2} className="px-4 py-3 text-sm font-bold text-slate-900">
                Total / Average
              </td>
              <td className="px-4 py-3 text-sm text-center font-bold text-slate-900">
                {data.reduce((sum, row) => sum + row.sarfi_10, 0)}
              </td>
              <td className="px-4 py-3 text-sm text-center font-bold text-slate-900">
                {data.reduce((sum, row) => sum + row.sarfi_30, 0)}
              </td>
              <td className="px-4 py-3 text-sm text-center font-bold text-slate-900">
                {data.reduce((sum, row) => sum + row.sarfi_50, 0)}
              </td>
              <td className="px-4 py-3 text-sm text-center font-bold text-slate-900">
                {data.reduce((sum, row) => sum + row.sarfi_70, 0)}
              </td>
              <td className="px-4 py-3 text-sm text-center font-bold text-slate-900">
                {data.reduce((sum, row) => sum + row.sarfi_80, 0)}
              </td>
              <td className="px-4 py-3 text-sm text-center font-bold text-slate-900">
                {data.reduce((sum, row) => sum + row.sarfi_90, 0)}
              </td>
              <td className="px-4 py-3 text-sm text-center font-bold text-blue-600 bg-blue-50">
                {(data.reduce((sum, row) => sum + row.weight_factor, 0) / data.length).toFixed(4)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
        Showing {data.length} meters · Weight factor represents the ratio for SARFI calculations
      </div>
    </div>
  );
}
