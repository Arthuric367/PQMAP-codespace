import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface HarmonicSpectrumChartProps {
  eventId?: string;
}

export default function HarmonicSpectrumChart({ eventId: _eventId }: HarmonicSpectrumChartProps) {
  // Dummy data for harmonics H01-H23 (3 phases: Ua, Ub, Uc)
  // In real implementation, this would come from harmonic_events table
  const dummyData = [
    { harmonic: 'H01', Ua: 100, Ub: 100, Uc: 100 }, // Fundamental
    { harmonic: 'H02', Ua: 0.8, Ub: 0.7, Uc: 0.9 },
    { harmonic: 'H03', Ua: 3.2, Ub: 2.9, Uc: 3.5 },
    { harmonic: 'H04', Ua: 0.5, Ub: 0.6, Uc: 0.4 },
    { harmonic: 'H05', Ua: 6.8, Ub: 7.2, Uc: 6.5 },
    { harmonic: 'H06', Ua: 0.3, Ub: 0.4, Uc: 0.2 },
    { harmonic: 'H07', Ua: 5.1, Ub: 4.8, Uc: 5.3 },
    { harmonic: 'H08', Ua: 0.4, Ub: 0.5, Uc: 0.3 },
    { harmonic: 'H09', Ua: 1.2, Ub: 1.5, Uc: 1.0 },
    { harmonic: 'H10', Ua: 0.6, Ub: 0.7, Uc: 0.5 },
    { harmonic: 'H11', Ua: 3.8, Ub: 4.1, Uc: 3.5 },
    { harmonic: 'H12', Ua: 0.2, Ub: 0.3, Uc: 0.2 },
    { harmonic: 'H13', Ua: 2.9, Ub: 3.2, Uc: 2.6 },
    { harmonic: 'H14', Ua: 0.3, Ub: 0.4, Uc: 0.2 },
    { harmonic: 'H15', Ua: 1.1, Ub: 1.3, Uc: 0.9 },
    { harmonic: 'H16', Ua: 0.2, Ub: 0.3, Uc: 0.2 },
    { harmonic: 'H17', Ua: 2.1, Ub: 2.4, Uc: 1.8 },
    { harmonic: 'H18', Ua: 0.2, Ub: 0.2, Uc: 0.1 },
    { harmonic: 'H19', Ua: 1.5, Ub: 1.7, Uc: 1.3 },
    { harmonic: 'H20', Ua: 0.2, Ub: 0.3, Uc: 0.1 },
    { harmonic: 'H21', Ua: 0.8, Ub: 1.0, Uc: 0.6 },
    { harmonic: 'H22', Ua: 0.1, Ub: 0.2, Uc: 0.1 },
    { harmonic: 'H23', Ua: 0.5, Ub: 0.7, Uc: 0.4 },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-900 mb-1">Harmonic Spectrum Analysis</h3>
        <p className="text-sm text-slate-600">
          Displaying harmonic orders H01 (Fundamental) to H23 for all three phases
        </p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart 
          data={dummyData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            dataKey="harmonic" 
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fill: '#475569', fontSize: 11 }}
            label={{ 
              value: 'Harmonic Component', 
              position: 'insideBottom', 
              offset: -50,
              style: { fill: '#1e293b', fontWeight: 600, fontSize: 12 }
            }}
          />
          <YAxis 
            tick={{ fill: '#475569', fontSize: 11 }}
            label={{ 
              value: '% Magnitude (% of Nominal)', 
              angle: -90, 
              position: 'insideLeft',
              style: { fill: '#1e293b', fontWeight: 600, fontSize: 12 }
            }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '8px 12px'
            }}
            formatter={(value: number | undefined) => value !== undefined ? [`${value.toFixed(2)}%`, ''] : ['N/A', '']}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="square"
          />
          <Bar dataKey="Ua" fill="#f97316" name="Ua (Phase A)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Ub" fill="#a855f7" name="Ub (Phase B)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Uc" fill="#22c55e" name="Uc (Phase C)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-800">
          <strong>Note:</strong> This is a demonstration chart using sample data. 
          In production, this will display actual harmonic measurements from the PQMS system.
          Threshold lines (IEEE 519, EN 50160) will be added in future updates.
        </p>
      </div>
    </div>
  );
}
