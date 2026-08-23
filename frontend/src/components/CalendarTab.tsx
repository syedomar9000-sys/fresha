import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api';
import type { Appointment } from '../types';
import { Calendar as CalendarIcon, Clock, User as UserIcon, CheckCircle, XCircle } from 'lucide-react';

export default function CalendarTab({ businessId }: { businessId: number }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = async () => {
    try {
      const res = await api.get(`/appointments/business/${businessId}/`);
      setAppointments(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [businessId]);

  const updateStatus = async (id: number, action: 'confirm' | 'cancel') => {
    if (action === 'cancel') {
      toast((t) => (
        <div className="flex flex-col gap-3">
          <p className="font-medium text-gray-900">Are you sure you want to cancel this booking?</p>
          <div className="flex gap-2 justify-end">
            <button 
              className="px-3 py-1.5 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-medium"
              onClick={() => toast.dismiss(t.id)}
            >
              No, keep it
            </button>
            <button 
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
              onClick={async () => {
                toast.dismiss(t.id);
                const toastId = toast.loading('Cancelling appointment...');
                try {
                  await api.patch(`/appointments/${id}/${action}/`);
                  toast.success(`Appointment ${action}ed successfully.`, { id: toastId });
                  fetchAppointments();
                } catch (err) {
                  console.error(err);
                  toast.error(`Failed to ${action} appointment.`, { id: toastId });
                }
              }}
            >
              Yes, cancel
            </button>
          </div>
        </div>
      ), { duration: Infinity });
      return;
    }
    
    // For confirm action, run directly
    const toastId = toast.loading(`Processing...`);
    try {
      await api.patch(`/appointments/${id}/${action}/`);
      toast.success(`Appointment ${action}ed successfully.`, { id: toastId });
      fetchAppointments();
    } catch (err) {
      console.error(err);
      toast.error(`Failed to ${action} appointment.`, { id: toastId });
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading calendar...</div>;

  // Simple calendar list grouped by date
  const grouped = appointments.reduce((acc, app) => {
    const dateStr = new Date(app.startTime).toLocaleDateString();
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(app);
    return acc;
  }, {} as Record<string, Appointment[]>);

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <CalendarIcon className="text-white" /> Appointment Calendar
      </h3>
      
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center p-12 bg-[#101113] rounded-2xl border border-dashed border-[#2C2D30]">
          <p className="text-gray-400">No appointments scheduled.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([date, apps]) => (
            <div key={date}>
              <h4 className="text-lg font-bold text-white mb-4 sticky top-0 bg-[#101113] p-2 rounded-lg z-10">
                {date}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {apps.map(app => (
                  <div key={app.id} className="bg-[#1A1C1E] p-4 rounded-xl border border-[#2C2D30] shadow-sm border-l-4 border-l-indigo-500 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-white">{app.service?.name}</div>
                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                          app.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                          app.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                          app.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {app.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400 space-y-1">
                        <div className="flex items-center gap-1"><Clock size={14} /> {new Date(app.startTime).toLocaleTimeString([], {timeStyle: 'short'})}</div>
                        <div className="flex items-center gap-1"><UserIcon size={14} /> {app.customer?.firstName} {app.customer?.lastName}</div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-4 pt-4 border-t border-[#2C2D30]">
                      {app.status === 'PENDING' && (
                        <button 
                          onClick={() => updateStatus(app.id, 'confirm')}
                          className="flex-1 flex justify-center items-center gap-1 text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg font-medium transition-colors text-sm"
                        >
                          <CheckCircle size={16} /> Confirm
                        </button>
                      )}
                      {app.status !== 'CANCELLED' && (
                        <button 
                          onClick={() => updateStatus(app.id, 'cancel')}
                          className="flex-1 flex justify-center items-center gap-1 text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg font-medium transition-colors text-sm"
                        >
                          <XCircle size={16} /> Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
