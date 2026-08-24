import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { 
  Home, Calendar, DollarSign, Users, Tag, Globe, 
  Megaphone, UserCheck, FileText, Grid, Settings, HelpCircle,
  LogOut, Plus, ChevronDown 
} from 'lucide-react';
import api from '../api';
import type { Business } from '../types';
import ServicesTab from '../components/ServicesTab';
import StaffTab from '../components/StaffTab';
import BookingsTab from '../components/BookingsTab';
import SettingsTab from '../components/SettingsTab';
import AnalyticsTab from '../components/AnalyticsTab';
import CalendarTab from '../components/CalendarTab';

type Tab = 'home' | 'calendar' | 'sales' | 'clients' | 'catalog' | 'online_booking' | 'marketing' | 'team' | 'reports' | 'add_ons' | 'settings' | 'help';

export default function BusinessDashboard() {
  const { user, logout } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBusinessId, setActiveBusinessId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [loading, setLoading] = useState(true);
  const [showBusinessForm, setShowBusinessForm] = useState(false);

  // Business Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/businesses/mine/');
      setBusinesses(res.data);
      if (res.data.length > 0 && !activeBusinessId) {
        setActiveBusinessId(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading('Creating business...');
    try {
      const payload = { 
        name, slug, description, category, city, address, 
        phone_number: phoneNumber, 
        contact_email: contactEmail 
      };
      const res = await api.post('/businesses/', payload);
      setBusinesses([...businesses, res.data]);
      setActiveBusinessId(res.data.id);
      setShowBusinessForm(false);
      setName(''); setSlug(''); setDescription(''); setCategory('');
      setCity(''); setAddress(''); setPhoneNumber(''); setContactEmail('');
      toast.success('Business created successfully!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to create business.', { id: toastId });
    }
  };

  const activeBusiness = businesses.find(b => b.id === activeBusinessId);

  const sidebarItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'sales', label: 'Sales', icon: DollarSign },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'catalog', label: 'Catalog', icon: Tag },
    { id: 'online_booking', label: 'Online booking', icon: Globe },
    { id: 'marketing', label: 'Marketing', icon: Megaphone },
    { id: 'team', label: 'Team', icon: UserCheck },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'add_ons', label: 'Add-ons', icon: Grid },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#101113] text-white overflow-hidden">
      {/* Sidebar - Fresha Style (Dark mode, Icon Only) */}
      <aside className="w-16 bg-[#101113] border-r border-[#2C2D30] flex flex-col items-center shrink-0 py-4">
        <div className="mb-8 flex items-center justify-center">
          {/* Fresha logo placeholder - Just an icon for the narrow sidebar */}
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
            f
          </div>
        </div>

        <nav className="flex-1 w-full flex flex-col items-center space-y-2 overflow-y-auto custom-scrollbar">
          {activeBusinessId && sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              title={item.label}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                activeTab === item.id 
                  ? 'bg-[#1A1C1E] text-[#635BFF]' 
                  : 'text-gray-400 hover:bg-[#1A1C1E] hover:text-white'
              }`}
            >
              <item.icon size={20} />
            </button>
          ))}
          
          <button 
            onClick={() => setShowBusinessForm(true)}
            title="Add New Business"
            className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:bg-[#1A1C1E] hover:text-white transition-colors mt-2"
          >
            <Plus size={20} />
          </button>
        </nav>

        <div className="w-full flex flex-col items-center gap-2 mt-auto pt-4 border-t border-[#2C2D30]">
          <button
            onClick={() => setActiveTab('help')}
            title="Help and support"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              activeTab === 'help' ? 'bg-[#1A1C1E] text-[#635BFF]' : 'text-gray-400 hover:bg-[#1A1C1E] hover:text-white'
            }`}
          >
            <HelpCircle size={20} />
          </button>
          <button
            onClick={logout}
            title="Logout"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#1A1C1E] transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#101113]">
        <header className="bg-[#101113] px-8 py-5 flex justify-between items-center z-10 sticky top-0 border-b border-[#2C2D30]">
           <div className="flex items-center gap-4">
             {businesses.length > 0 && (
                <div className="relative group min-w-[200px]">
                  <select 
                    className="w-full bg-[#1A1C1E] text-white border border-[#2C2D30] rounded-lg p-2.5 appearance-none focus:outline-none focus:border-[#4F46E5] cursor-pointer text-sm font-medium"
                    value={activeBusinessId || ''}
                    onChange={e => setActiveBusinessId(Number(e.target.value))}
                  >
                    {businesses.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" size={14} />
                </div>
              )}
           </div>
           
           <div className="flex items-center gap-4">
              <button className="bg-[#635BFF] text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-[#4B44CC] transition-colors flex items-center gap-2">
                 <span>🚀</span> Continue setup {'>'}
              </button>
              <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center text-xs font-bold text-blue-200">
                {user?.firstName?.charAt(0) || user?.username?.charAt(0)}M
              </div>
           </div>
        </header>

        <div className="p-8 flex-1 w-full mx-auto max-w-7xl">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading your workspace...</div>
          ) : showBusinessForm || businesses.length === 0 ? (
            <div className="bg-[#1A1C1E] rounded-xl border border-[#2C2D30] p-8 max-w-2xl mx-auto">
              <h3 className="text-2xl font-bold text-white mb-6">
                {businesses.length === 0 ? "Let's set up your first business!" : 'Add a new business location'}
              </h3>
              <form onSubmit={handleCreateBusiness} className="space-y-5">
                 {/* Re-used exact form layout but inverted styling */}
                 <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Business Name</label>
                    <input required value={name} onChange={e => setName(e.target.value)} className="w-full p-2.5 bg-[#101113] border border-[#2C2D30] rounded-lg focus:border-[#635BFF] outline-none text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">URL Slug</label>
                    <input required value={slug} onChange={e => setSlug(e.target.value)} placeholder="no-spaces-allowed" className="w-full p-2.5 bg-[#101113] border border-[#2C2D30] rounded-lg focus:border-[#635BFF] outline-none text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">City</label>
                    <input required value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. New York" className="w-full p-2.5 bg-[#101113] border border-[#2C2D30] rounded-lg focus:border-[#635BFF] outline-none text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Address</label>
                    <input required value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g. 123 Main St" className="w-full p-2.5 bg-[#101113] border border-[#2C2D30] rounded-lg focus:border-[#635BFF] outline-none text-white" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2.5 bg-[#101113] border border-[#2C2D30] rounded-lg focus:border-[#635BFF] outline-none text-white" rows={3} />
                </div>
                <div className="pt-4 flex gap-4">
                  <button type="submit" className="flex-1 bg-white text-black font-bold py-3 rounded-full hover:bg-gray-200 transition-colors">
                    Create Business Profile
                  </button>
                  {businesses.length > 0 && (
                    <button type="button" onClick={() => setShowBusinessForm(false)} className="px-6 py-3 border border-[#2C2D30] text-gray-300 font-medium rounded-full hover:bg-[#2C2D30] transition-colors">
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          ) : (
            <div className="h-full">
              {/* Tab Routing logic matching Fresha's labels to our existing components */}
              {activeTab === 'home' && activeBusinessId && <AnalyticsTab businessId={activeBusinessId} />}
              {activeTab === 'calendar' && activeBusinessId && <CalendarTab businessId={activeBusinessId} />}
              {activeTab === 'sales' && activeBusinessId && <BookingsTab businessId={activeBusinessId} />}
              {activeTab === 'catalog' && activeBusinessId && <ServicesTab businessId={activeBusinessId} />}
              {activeTab === 'team' && activeBusinessId && <StaffTab businessId={activeBusinessId} />}
              {activeTab === 'reports' && activeBusinessId && <AnalyticsTab businessId={activeBusinessId} />}
              {activeTab === 'settings' && activeBusiness && <SettingsTab businessId={activeBusiness.id} businessName={activeBusiness.name} />}
              
              {/* Placeholders for new pages */}
              {['clients', 'online_booking', 'marketing', 'add_ons', 'help'].includes(activeTab) && (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
                  <div className="w-16 h-16 bg-[#1A1C1E] rounded-full flex items-center justify-center">
                    <Grid size={32} className="text-gray-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white capitalize">{activeTab.replace('_', ' ')}</h3>
                  <p>This module is under construction.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
