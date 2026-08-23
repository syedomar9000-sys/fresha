import { useState, useEffect } from 'react';
import api from '../api';
import { BarChart3, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import type { Analytics } from '../types';

export default function AnalyticsTab({ businessId }: { businessId: number }) {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get(`/analytics/${businessId}`);
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [businessId]);

  if (loading) return <div className="text-center py-12">Loading analytics...</div>;
  if (!data) return <div className="text-center py-12">No data available</div>;

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <BarChart3 className="text-white" /> Business Analytics
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#1A1C1E] p-6 rounded-2xl shadow-sm border border-[#2C2D30] flex items-center gap-4">
          <div className="bg-[#2C2D30] p-4 rounded-xl text-white">
            <DollarSign size={32} />
          </div>
          <div>
            <div className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-1">Total Revenue</div>
            <div className="text-3xl font-black text-white">${data.totalRevenue}</div>
          </div>
        </div>
        
        <div className="bg-[#1A1C1E] p-6 rounded-2xl shadow-sm border border-[#2C2D30] flex items-center gap-4">
          <div className="bg-green-100 p-4 rounded-xl text-green-600">
            <TrendingUp size={32} />
          </div>
          <div>
            <div className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-1">Total Bookings</div>
            <div className="text-3xl font-black text-white">{data.totalBookings}</div>
          </div>
        </div>
      </div>
      
      <div className="bg-[#1A1C1E] p-6 rounded-2xl shadow-sm border border-[#2C2D30] mt-6">
        <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Calendar size={20} className="text-gray-400" /> Weekly Booking Trends
        </h4>
        {data.weeklyBookings.length === 0 ? (
          <p className="text-gray-400 italic">No historical data yet.</p>
        ) : (
          <div className="space-y-4">
            {data.weeklyBookings.map((wb, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-[#101113] rounded-xl">
                <span className="font-medium text-gray-300">Week of {new Date(wb.week).toLocaleDateString()}</span>
                <span className="bg-[#2C2D30] text-white px-3 py-1 rounded-full font-bold text-sm">
                  {wb.count} bookings
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
