import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api';
import type { Appointment } from '../types';
import { Calendar, User, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function BookingsTab({ businessId }: { businessId: number }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, [businessId]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/appointments/business/${businessId}`);
      setAppointments(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) return <div className="text-center py-12 text-gray-400">Loading bookings...</div>;

  if (appointments.length === 0) {
    return (
      <div className="bg-[#1A1C1E] p-12 text-center rounded-2xl shadow-sm border border-[#2C2D30]">
        <Calendar className="mx-auto text-gray-300 mb-4" size={48} />
        <h3 className="text-xl font-bold text-white mb-2">No Bookings Yet</h3>
        <p className="text-gray-400">Appointments for this business will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {appointments.map(app => (
        <div key={app.id} className="bg-[#1A1C1E] rounded-2xl shadow-sm border border-[#2C2D30] p-6 flex flex-col md:flex-row gap-6 justify-between items-center">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                app.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                app.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {app.status}
              </span>
              <h3 className="text-xl font-bold text-white">{app.service?.name}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-gray-400 text-sm mt-4">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-white" />
                {new Date(app.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
              <div className="flex items-center gap-2">
                <User size={16} className="text-white" />
                Customer: {app.customer?.firstName} {app.customer?.lastName} ({app.customer?.email})
              </div>
              <div className="flex items-center gap-2">
                <User size={16} className="text-white" />
                Staff: {app.staffMember?.firstName} {app.staffMember?.lastName}
              </div>
            </div>
            {app.notes && (
              <p className="mt-3 text-sm text-gray-400 italic">Notes: {app.notes}</p>
            )}
          </div>
          
          <div className="flex gap-2 shrink-0">
            {app.status === 'PENDING' && (
              <button 
                onClick={() => updateStatus(app.id, 'confirm')}
                className="flex items-center gap-1 text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <CheckCircle size={18} /> Confirm
              </button>
            )}
            {app.status !== 'CANCELLED' && (
              <button 
                onClick={() => updateStatus(app.id, 'cancel')}
                className="flex items-center gap-1 text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <XCircle size={18} /> Cancel
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
