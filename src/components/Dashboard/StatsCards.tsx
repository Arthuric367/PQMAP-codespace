import { Activity, TrendingUp, Zap } from 'lucide-react';
import { PQEvent, Substation } from '../../types/database';

interface StatsCardsProps {
  events: PQEvent[];
  substations: Substation[];
}

export default function StatsCards({ events, substations }: StatsCardsProps) {
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentEvents = events.filter(e => new Date(e.timestamp) > last24Hours);
  
  // Calculate PQ events this month
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  const eventsThisMonth = events.filter(e => {
    const eventDate = new Date(e.timestamp);
    return eventDate.getFullYear() === currentYear && 
           eventDate.getMonth() + 1 === currentMonth;
  });

  // Calculate SARFI-70 for current month (same logic as SARFI70Monitor)
  const validSarfiEvents = events.filter(
    e => e.event_type === 'voltage_dip' && 
         e.is_mother_event && 
         !e.false_event &&
         (() => {
           const eventDate = new Date(e.timestamp);
           return eventDate.getFullYear() === currentYear && 
                  eventDate.getMonth() + 1 === currentMonth;
         })()
  );
  const sarfi70ThisMonth = validSarfiEvents.reduce((sum, event) => sum + (event.sarfi_70 || 0), 0);

  const stats = [
    {
      label: 'Total Events (24h)',
      value: recentEvents.length,
      icon: Activity,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      label: 'PQ Events This Month',
      value: eventsThisMonth.length,
      icon: Zap,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      label: 'SARFI-70 This Month',
      value: sarfi70ThisMonth.toFixed(4),
      icon: TrendingUp,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6 border border-slate-100 hover:shadow-xl transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600 mb-2">{stat.label}</p>
                <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
              </div>
              <div className={`${stat.bgColor} p-3 rounded-xl`}>
                <Icon className={`w-6 h-6 ${stat.textColor}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
