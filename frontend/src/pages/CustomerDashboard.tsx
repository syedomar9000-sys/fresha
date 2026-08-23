import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Calendar, User as UserIcon, LogOut, X, Clock, MapPin, Star, MessageSquare } from 'lucide-react';
import api from '../api';
import type { Appointment } from '../types';

export default function CustomerDashboard() {
  const { user, logout } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewAppId, setReviewAppId] = useState<number | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const res = await api.get('/appointments/mine/');
      setAppointments(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  };

  const cancelAppointment = (id: number) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-medium text-gray-900">Are you sure you want to cancel this appointment?</p>
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
                await api.patch(`/appointments/${id}/cancel/`);
                toast.success('Your appointment has been cancelled successfully.', { id: toastId });
                fetchAppointments();
              } catch (err) {
                console.error(err);
                toast.error('Failed to cancel appointment. Please try again.', { id: toastId });
              }
            }}
          >
            Yes, cancel
          </button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const handlePay = async (appointmentId: number) => {
    const toastId = toast.loading('Redirecting to payment...');
    try {
      const checkoutRes = await api.post('/payments/checkout-session', {
        appointment_id: appointmentId,
        success_url: `${window.location.origin}/booking/success`,
        cancel_url: `${window.location.origin}/booking/cancel`
      });
      window.location.href = checkoutRes.data.url;
    } catch (err) {
      console.error(err);
      toast.error('Failed to initiate payment.', { id: toastId });
    }
  };

  const submitReview = async () => {
    if (!reviewAppId) return;
    try {
      await api.post('/reviews/', {
        appointment_id: reviewAppId,
        rating,
        comment
      });
      toast.success('Review submitted successfully!');
      setReviewModalOpen(false);
      setReviewAppId(null);
      setComment('');
      setRating(5);
      fetchAppointments();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.[0] || 'Failed to submit review.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-black hover:opacity-80 transition-opacity">
            BookIt
          </Link>
          <div className="flex items-center gap-6">
            <span className="text-gray-600 font-medium hidden sm:inline">Hello, {user?.firstName || user?.username}</span>
            <Link to="/" className="text-black font-medium hover:text-gray-600 transition-colors">
              Explore Services
            </Link>
            <button
              onClick={logout}
              className="flex items-center text-gray-500 hover:text-red-500 transition-colors"
            >
              <LogOut size={20} className="mr-1" /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">My Bookings</h2>
        
        {loading ? (
          <div className="text-gray-500">Loading your bookings...</div>
        ) : appointments.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl shadow-sm border border-gray-100">
            <Calendar className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No bookings found</h3>
            <p className="text-gray-500">You don't have any upcoming or past appointments.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((app) => (
              <div key={app.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-6 justify-between items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      app.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                      app.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {app.status}
                    </span>
                    <h3 className="text-xl font-bold text-gray-900">{app.service?.name}</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-gray-600 text-sm mt-4">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-gray-900" />
                      {new Date(app.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-gray-900" />
                      {app.service?.categoryName || 'Business location'}
                    </div>
                    <div className="flex items-center gap-2">
                      <UserIcon size={16} className="text-gray-900" />
                      with {app.staffMember?.firstName} {app.staffMember?.lastName}
                    </div>
                  </div>
                </div>
                
                {app.status !== 'CANCELLED' && (
                  <div className="flex flex-col gap-2 shrink-0">
                    {app.status === 'PENDING_PAYMENT' && (
                      <button 
                        onClick={() => handlePay(app.id)}
                        className="flex items-center justify-center gap-1 text-white bg-black hover:bg-gray-900 px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        Pay Now
                      </button>
                    )}
                    <button 
                      onClick={() => cancelAppointment(app.id)}
                      className="flex items-center justify-center gap-1 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      <X size={18} /> Cancel Booking
                    </button>
                  </div>
                )}
                
                {app.status === 'COMPLETED' && (
                  <div className="flex flex-col gap-2 shrink-0">
                    <button 
                      onClick={() => {
                        setReviewAppId(app.id);
                        setReviewModalOpen(true);
                      }}
                      className="flex items-center justify-center gap-1 text-amber-600 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      <Star size={18} /> Leave Review
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Review Modal */}
      {reviewModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="text-black" /> Leave a Review
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button 
                    key={star}
                    onClick={() => setRating(star)}
                    className="focus:outline-none"
                  >
                    <Star size={32} className={star <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"} />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">Comment</label>
              <textarea 
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={4}
                placeholder="Share your experience..."
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none resize-none"
              ></textarea>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setReviewModalOpen(false)}
                className="px-4 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button 
                onClick={submitReview}
                className="px-6 py-2 rounded-lg font-medium text-white bg-black hover:bg-gray-900"
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
