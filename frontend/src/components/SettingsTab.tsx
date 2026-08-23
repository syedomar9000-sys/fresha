import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api';
import { Settings, CreditCard, ExternalLink, CheckCircle, Store } from 'lucide-react';

export default function SettingsTab({ businessId, businessName }: { businessId: number, businessName: string }) {
  const [loading, setLoading] = useState(true);
  const [connectStatus, setConnectStatus] = useState<any>(null);
  
  // Business Edit State
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    fetchData();
  }, [businessId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statusRes, bizRes] = await Promise.all([
        api.get(`/connect/status/${businessId}`),
        api.get(`/businesses/mine/`)
      ]);
      setConnectStatus(statusRes.data);
      
      const b = bizRes.data.find((x: any) => x.id === businessId);
      if (b) {
        setName(b.name || '');
        setDescription(b.description || '');
        setAddress(b.address || '');
        setCity(b.city || '');
        setPhoneNumber(b.phoneNumber || '');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    const toastId = toast.loading('Redirecting to Stripe...');
    try {
      const res = await api.post('/connect/onboarding-link', {
        business_id: businessId,
        return_url: `${window.location.origin}/dashboard`,
        refresh_url: `${window.location.origin}/dashboard`
      });
      window.location.href = res.data.url;
    } catch (err) {
      console.error(err);
      toast.error('Error connecting with Stripe', { id: toastId });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading('Saving profile...');
    try {
      setIsSaving(true);
      await api.patch(`/businesses/${businessId}/`, {
        name, description, address, city, phone_number: phoneNumber
      });
      toast.success('Profile updated successfully!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to update profile.', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading settings...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-[#1A1C1E] rounded-xl shadow-sm border border-[#2C2D30] p-8">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="text-white" size={28} />
          <h3 className="text-2xl font-bold text-white">Settings for {businessName}</h3>
        </div>

        {/* Business Profile Section */}
        <div className="border border-[#2C2D30] rounded-xl p-6 mb-6">
          <h4 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <Store className="text-white" size={20} />
            Business Profile
          </h4>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-1">Business Name</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full p-2.5 bg-[#101113] border border-[#2C2D30] text-white rounded-lg focus:border-[#635BFF] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-1">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full p-2.5 bg-[#101113] border border-[#2C2D30] text-white rounded-lg focus:border-[#635BFF] outline-none resize-none"></textarea>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-1">Address</label>
                <input value={address} onChange={e => setAddress(e.target.value)} className="w-full p-2.5 bg-[#101113] border border-[#2C2D30] text-white rounded-lg focus:border-[#635BFF] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-1">City</label>
                <input value={city} onChange={e => setCity(e.target.value)} className="w-full p-2.5 bg-[#101113] border border-[#2C2D30] text-white rounded-lg focus:border-[#635BFF] outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-1">Phone Number</label>
              <input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="w-full p-2.5 bg-[#101113] border border-[#2C2D30] text-white rounded-lg focus:border-[#635BFF] outline-none" />
            </div>
            <button disabled={isSaving} type="submit" className="px-6 py-2.5 bg-[#635BFF] text-white font-medium rounded-full hover:bg-gray-900 transition-colors">
              {isSaving ? 'Saving...' : 'Save Profile Details'}
            </button>
          </form>
        </div>

        {/* Payments Section */}
        <div className="border border-[#2C2D30] rounded-xl p-6 flex flex-col md:flex-row gap-6 justify-between items-center bg-[#101113]">
          <div>
            <h4 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
              <CreditCard className="text-white" size={20} />
              Payments & Payouts
            </h4>
            <p className="text-gray-400 text-sm max-w-md">
              Connect your bank account via Stripe to receive payouts directly from customer bookings. We take a 5% platform fee per transaction.
            </p>
          </div>
          
          <div className="shrink-0">
            {connectStatus?.isConnected ? (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 px-4 py-2 rounded-lg font-medium">
                <CheckCircle size={20} />
                Stripe Connected
              </div>
            ) : connectStatus?.detailsSubmitted ? (
              <div className="flex flex-col items-end gap-2">
                <span className="text-amber-600 font-medium text-sm">Verification pending...</span>
                <button 
                  onClick={handleConnect}
                  className="flex items-center gap-2 bg-[#2C2D30] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#2C2D30] transition-colors"
                >
                  Complete Onboarding <ExternalLink size={16} />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleConnect}
                className="flex items-center gap-2 bg-[#635BFF] text-white px-5 py-2.5 rounded-full font-medium hover:bg-[#4B44CC] transition-colors shadow-sm"
              >
                Connect with Stripe
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
