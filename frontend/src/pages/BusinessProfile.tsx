import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { MapPin, Calendar as CalendarIcon, ChevronLeft, Phone, Mail, Star, Clock } from 'lucide-react';
import type { Business, Service, StaffMember, Review } from '../types';

export default function BusinessProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [availableSlots, setAvailableSlots] = useState<{staffId: number, staffName: string, startTime: string, endTime: string}[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [bookingError, setBookingError] = useState('');
  
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const bRes = await api.get(`/businesses/${slug}/`);
        setBusiness(bRes.data);
        const businessId = bRes.data.id;
        
        const [servRes, staffRes, reviewsRes] = await Promise.all([
          api.get(`/services/?business_id=${businessId}`),
          api.get(`/staff/?business_id=${businessId}`),
          api.get(`/reviews/?business_id=${businessId}`) // Note: ReviewViewSet doesn't support business_id natively, let me check that.
        ]);
        setServices(servRes.data);
        setStaff(staffRes.data);
        setReviews(reviewsRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingData(false);
      }
    };
    if (slug) fetchData();
  }, [slug]);

  useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedService || !selectedDate) {
        setAvailableSlots([]);
        return;
      }
      try {
        setLoadingSlots(true);
        const res = await api.get(`/appointments/availability/${selectedService.id}?date=${selectedDate}`);
        setAvailableSlots(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [selectedService, selectedDate]);

  const handleBook = async (slot: any) => {
    if (!user) {
      toast('Please log in to book an appointment.', { icon: '🔒' });
      navigate('/login');
      return;
    }
    const toastId = toast.loading('Booking your appointment...');
    try {
      setBookingError('');
      const res = await api.post('/appointments/', {
        service_id: selectedService?.id,
        staff_id: slot.staffId,
        date: selectedDate,
        start_time_str: slot.startTime
      });
      
      const appointment = res.data;
      if (appointment.status === 'PENDING_PAYMENT') {
        toast.loading('Redirecting to payment...', { id: toastId });
        try {
          const checkoutRes = await api.post('/payments/checkout-session', {
            appointment_id: appointment.id,
            success_url: `${window.location.origin}/booking/success`,
            cancel_url: `${window.location.origin}/booking/cancel`
          });
          window.location.href = checkoutRes.data.url;
        } catch (paymentErr: any) {
          toast.success('Appointment booked successfully!', { id: toastId });
          setBookingError('Payment system is not set up yet. Your appointment is saved as unpaid.');
          // Refresh slots so the booked one disappears
          const slotsRes = await api.get(`/appointments/availability/${selectedService?.id}?date=${selectedDate}`);
          setAvailableSlots(slotsRes.data);
        }
      } else {
        toast.success('Your booking has been confirmed successfully.', { id: toastId });
        navigate('/dashboard');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.[0] || err.response?.data?.detail || 'Error creating booking. Slot might be taken.';
      setBookingError(errorMsg);
      toast.error(errorMsg, { id: toastId });
      // Also refresh slots just in case
      const slotsRes = await api.get(`/appointments/availability/${selectedService?.id}?date=${selectedDate}`);
      setAvailableSlots(slotsRes.data);
    }
  };

  if (loadingData) return <div className="min-h-screen flex items-center justify-center bg-white"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div></div>;
  if (!business) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-xl font-medium">Business not found.</div>;

  const groupedServices = services.reduce((acc, service) => {
    const cat = service.categoryName || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  const avgRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : '5.0';

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-24 text-gray-900 font-sans">
      {/* Top Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-black transition-colors font-medium">
            <ChevronLeft size={20} /> Back to Search
          </Link>
          <div className="font-black text-xl tracking-tight">BookIt</div>
        </div>
      </nav>

      {/* Cover Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-10 lg:py-16">
          <div className="flex flex-col lg:flex-row gap-10 lg:items-start justify-between">
            <div className="w-full lg:w-2/3">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 mb-6 tracking-tight leading-tight">
                {business.name}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-base sm:text-lg text-gray-600 mb-8 font-medium">
                <div className="flex items-center gap-2 bg-gray-100 px-4 py-1.5 rounded-full text-black">
                  <Star size={18} className="fill-black" />
                  <span>{avgRating}</span>
                  <span className="text-gray-500 font-normal">({reviews.length} reviews)</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={20} className="text-gray-400" />
                  <span>{business.address}, {business.city}</span>
                </div>
              </div>
            </div>
            
            {/* Contact Card */}
            <div className="w-full lg:w-1/3 bg-gray-50 rounded-3xl p-8 border border-gray-200 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-6 text-xl">Contact Information</h3>
              <div className="space-y-4 text-base text-gray-600">
                {business.phoneNumber && (
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-gray-100">
                      <Phone size={18} className="text-black"/>
                    </div>
                    <span className="font-medium text-gray-900">{business.phoneNumber}</span>
                  </div>
                )}
                {business.contactEmail && (
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-gray-100">
                      <Mail size={18} className="text-black"/>
                    </div>
                    <span className="font-medium text-gray-900">{business.contactEmail}</span>
                  </div>
                )}
                {!business.phoneNumber && !business.contactEmail && (
                  <p className="text-gray-500 italic">No contact info provided.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column (Services, About, Team, Reviews) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-16">
            
            {/* Services List */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Services</h2>
              {Object.keys(groupedServices).length === 0 ? (
                <p className="text-gray-500 italic text-lg">No services listed yet.</p>
              ) : (
                <div className="space-y-10">
                  {Object.entries(groupedServices).map(([category, svcs]) => (
                    <div key={category}>
                      <h3 className="text-2xl font-bold text-gray-900 mb-5">{category}</h3>
                      <div className="space-y-4">
                        {svcs.map(s => (
                          <div 
                            key={s.id}
                            onClick={() => setSelectedService(s)}
                            className={`group p-6 rounded-3xl border-2 transition-all cursor-pointer flex justify-between items-center ${
                              selectedService?.id === s.id 
                                ? 'border-black bg-white shadow-lg scale-[1.01]' 
                                : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-md'
                            }`}
                          >
                            <div className="flex-1 pr-6">
                              <h4 className="font-bold text-xl text-gray-900 mb-2">{s.name}</h4>
                              <p className="text-gray-500 text-base line-clamp-2 mb-3">{s.description}</p>
                              <div className="font-medium text-gray-500 flex items-center gap-2 text-sm bg-gray-50 inline-flex px-3 py-1 rounded-full">
                                <Clock size={14} /> {s.durationMinutes} min
                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-4 shrink-0">
                              <span className="font-black text-2xl text-gray-900">${s.price}</span>
                              <button className={`px-6 py-2.5 rounded-full font-bold text-sm transition-colors ${
                                selectedService?.id === s.id 
                                  ? 'bg-black text-white' 
                                  : 'bg-gray-100 text-black group-hover:bg-gray-200'
                              }`}>
                                {selectedService?.id === s.id ? 'Selected' : 'Book'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <hr className="border-gray-200" />

            {/* About Section */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">About</h2>
              <div className="text-lg text-gray-600 leading-relaxed max-w-3xl whitespace-pre-line">
                {business.description || 'No description provided for this business.'}
              </div>
            </section>

            <hr className="border-gray-200" />

            {/* Team Section */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Meet the team</h2>
              {staff.length === 0 ? (
                <p className="text-gray-500 italic text-lg">No staff listed.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                  {staff.map(st => (
                    <div key={st.id} className="bg-white p-6 rounded-3xl border border-gray-100 text-center hover:shadow-lg transition-shadow">
                      <div className="w-24 h-24 mx-auto bg-gray-50 rounded-full flex items-center justify-center text-3xl font-black text-gray-300 mb-4 border-2 border-gray-100">
                        {st.firstName.charAt(0)}{st.lastName.charAt(0)}
                      </div>
                      <h4 className="font-bold text-gray-900 text-lg">{st.firstName} {st.lastName}</h4>
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">{st.bio || 'Professional'}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <hr className="border-gray-200" />

            {/* Reviews Section */}
            <section>
              <div className="flex items-center gap-4 mb-8">
                <h2 className="text-3xl font-bold text-gray-900">Reviews</h2>
                {reviews.length > 0 && (
                    <div className="flex items-center gap-2 bg-gray-100 px-4 py-1.5 rounded-full text-black font-bold">
                    <Star size={18} className="fill-black" />
                    <span>{avgRating}</span>
                    </div>
                )}
              </div>
              
              {reviews.length === 0 ? (
                <p className="text-gray-500 italic text-lg">No reviews yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {reviews.map(r => (
                    <div key={r.id} className="p-6 border border-gray-100 rounded-3xl bg-white shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">
                            {r.customerName.charAt(0)}
                          </div>
                          <div className="font-bold text-gray-900">{r.customerName}</div>
                        </div>
                        <div className="flex gap-0.5 text-black">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={14} className={i < r.rating ? "fill-black" : "text-gray-200"} />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-600 leading-relaxed">{r.comment || <span className="italic text-gray-400">No comment</span>}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>

          {/* Right Column (Booking Widget) */}
          <div className="lg:col-span-5 xl:col-span-4">
            <div className="sticky top-24 bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                <CalendarIcon className="text-black" size={28} /> 
                Book Appointment
              </h3>
              
              {!selectedService ? (
                <div className="text-center p-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-gray-500 font-medium">
                  Select a service from the menu to see availability.
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Selected Service</div>
                        <div className="font-bold text-xl text-gray-900 mb-1">{selectedService.name}</div>
                        <div className="text-sm text-gray-500 font-medium flex items-center gap-2">
                          <Clock size={14} /> {selectedService.durationMinutes} min
                        </div>
                      </div>
                      <div className="font-black text-2xl text-black">${selectedService.price}</div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-3">Select Date</label>
                    <input 
                      type="date" 
                      value={selectedDate}
                      onChange={e => setSelectedDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:border-black focus:ring-0 outline-none transition-colors font-medium text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-4">Available Times</label>
                    {loadingSlots ? (
                      <div className="text-center py-6 text-gray-500">
                        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        Finding times...
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-2xl font-medium">
                        No availability on this date.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                        {availableSlots.map((slot, i) => (
                          <button 
                            key={i} 
                            onClick={() => handleBook(slot)}
                            className="py-3 px-3 font-bold text-gray-900 bg-white border-2 border-gray-200 rounded-2xl hover:bg-black hover:text-white hover:border-black transition-all flex flex-col items-center group"
                          >
                            <span className="text-lg">{slot.startTime}</span>
                            <span className="text-xs text-gray-500 font-medium mt-1 group-hover:text-gray-300 line-clamp-1">{slot.staffName}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {bookingError && (
                      <div className="mt-6 text-sm text-red-700 bg-red-50 p-4 rounded-xl border border-red-200 flex items-start gap-2 font-medium">
                        <span className="mt-0.5">⚠️</span> {bookingError}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
