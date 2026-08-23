import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api';
import type { StaffMember, Service } from '../types';
import { Plus, Edit2, Trash2, X } from 'lucide-react';

interface Props {
  businessId: number;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function StaffTab({ businessId }: Props) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [availabilities, setAvailabilities] = useState<{dayOfWeek: number, startTime: string, endTime: string}[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [staffRes, servicesRes] = await Promise.all([
        api.get(`/staff/?business_id=${businessId}`),
        api.get(`/services/?business_id=${businessId}`)
      ]);
      setStaff(staffRes.data);
      setServices(servicesRes.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load staff details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [businessId]);

  const openModal = (s?: StaffMember) => {
    if (s) {
      setEditingStaff(s);
      setFirstName(s.firstName);
      setLastName(s.lastName);
      setBio(s.bio);
      setSelectedServices(s.services || []);
      setAvailabilities(s.availabilities || []);
    } else {
      setEditingStaff(null);
      setFirstName('');
      setLastName('');
      setBio('');
      setSelectedServices([]);
      setAvailabilities([{ dayOfWeek: 0, startTime: '09:00:00', endTime: '17:00:00' }]);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const toggleService = (serviceId: number) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]
    );
  };

  const updateAvailability = (index: number, field: string, value: string | number) => {
    const newAvail = [...availabilities];
    newAvail[index] = { ...newAvail[index], [field]: value };
    setAvailabilities(newAvail);
  };

  const addAvailability = () => {
    setAvailabilities([...availabilities, { dayOfWeek: 0, startTime: '09:00', endTime: '17:00' }]);
  };

  const removeAvailability = (index: number) => {
    setAvailabilities(availabilities.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading(editingStaff ? 'Updating staff member...' : 'Adding staff member...');
    const payload = {
      firstName,
      lastName,
      bio,
      services: selectedServices,
      availabilities: availabilities.map(a => ({
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime.length === 5 ? a.startTime + ':00' : a.startTime,
        endTime: a.endTime.length === 5 ? a.endTime + ':00' : a.endTime,
      })),
    };

    try {
      if (editingStaff) {
        await api.patch(`/staff/${editingStaff.id}/`, payload);
        toast.success('Staff updated successfully!', { id: toastId });
      } else {
        await api.post(`/staff/`, { ...payload, businessId });
        toast.success('Staff added successfully!', { id: toastId });
      }
      fetchData();
      closeModal();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save staff member.', { id: toastId });
    }
  };

  const handleDelete = (id: number) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-medium text-gray-900">Are you sure you want to remove this staff member?</p>
        <div className="flex gap-2 justify-end">
          <button 
            className="px-3 py-1.5 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-medium"
            onClick={() => toast.dismiss(t.id)}
          >
            Cancel
          </button>
          <button 
            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
            onClick={async () => {
              toast.dismiss(t.id);
              const toastId = toast.loading('Removing staff member...');
              try {
                await api.delete(`/staff/${id}/`);
                setStaff(staff.filter(s => s.id !== id));
                toast.success('Staff member removed.', { id: toastId });
              } catch (err) {
                console.error(err);
                toast.error('Failed to remove staff.', { id: toastId });
              }
            }}
          >
            Yes, remove
          </button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  if (loading) return <div className="text-gray-400 p-8">Loading staff...</div>;

  return (
    <div className="bg-[#1A1C1E] rounded-xl shadow-sm border border-[#2C2D30] p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-200">Staff Members</h3>
        <button
          onClick={() => openModal()}
          className="bg-[#635BFF] text-white px-4 py-2 rounded-full flex items-center gap-2 hover:bg-gray-900 transition-colors"
        >
          <Plus size={18} /> Add Staff
        </button>
      </div>

      {staff.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No staff members yet. Add one to start accepting bookings!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staff.map((s) => (
            <div key={s.id} className="border rounded-xl p-5 hover:shadow-md transition-shadow relative">
              <div className="absolute top-4 right-4 flex gap-2">
                <button onClick={() => openModal(s)} className="text-white hover:bg-[#101113] p-1 rounded">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="w-12 h-12 bg-[#2C2D30] text-white rounded-full flex items-center justify-center font-bold text-xl mb-4">
                {s.firstName.charAt(0)}{s.lastName.charAt(0)}
              </div>
              <h4 className="font-semibold text-lg text-white">{s.firstName} {s.lastName}</h4>
              <p className="text-sm text-gray-400 mb-4 line-clamp-2">{s.bio || 'No bio provided.'}</p>
              
              <div className="text-sm">
                <div className="font-medium text-gray-300 mb-1">Services ({s.services?.length || 0})</div>
                <div className="flex flex-wrap gap-1 mb-4">
                  {s.services?.map(srvId => {
                    const srv = services.find(x => x.id === srvId);
                    return srv ? (
                      <span key={srvId} className="bg-[#2C2D30] text-gray-400 px-2 py-0.5 rounded text-xs">
                        {srv.name}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
              
              <div className="text-sm">
                <div className="font-medium text-gray-300 mb-1">Availability</div>
                <div className="space-y-1">
                  {s.availabilities?.map((a, i) => (
                    <div key={i} className="text-gray-400 flex justify-between">
                      <span>{DAYS[a.dayOfWeek]}</span>
                      <span>{a.startTime.substring(0,5)} - {a.endTime.substring(0,5)}</span>
                    </div>
                  ))}
                  {(!s.availabilities || s.availabilities.length === 0) && (
                    <div className="text-gray-400 italic">No availability set</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1C1E] rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#1A1C1E] px-6 py-4 border-b flex justify-between items-center z-10">
              <h3 className="text-xl font-bold text-white">{editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-400"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">First Name</label>
                  <input required value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-black outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Last Name</label>
                  <input required value={lastName} onChange={e => setLastName(e.target.value)} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-black outline-none" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Bio</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-black outline-none" rows={3} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Can Perform Services</label>
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto grid grid-cols-2 gap-2 bg-[#101113]">
                  {services.map(s => (
                    <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-[#2C2D30] p-1 rounded">
                      <input 
                        type="checkbox" 
                        checked={selectedServices.includes(s.id)}
                        onChange={() => toggleService(s.id)}
                        className="rounded text-white focus:ring-black"
                      />
                      <span>{s.name} <span className="text-gray-400">({s.durationMinutes}m)</span></span>
                    </label>
                  ))}
                  {services.length === 0 && <span className="text-sm text-gray-400">No services created yet.</span>}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-300">Weekly Availability</label>
                  <button type="button" onClick={addAvailability} className="text-sm text-white hover:text-indigo-800 font-medium flex items-center gap-1">
                    <Plus size={14} /> Add Day
                  </button>
                </div>
                <div className="space-y-3">
                  {availabilities.map((avail, index) => (
                    <div key={index} className="flex items-center gap-3 bg-[#101113] p-3 rounded-lg border">
                      <select 
                        value={avail.dayOfWeek}
                        onChange={e => updateAvailability(index, 'dayOfWeek', parseInt(e.target.value))}
                        className="p-2 border rounded bg-[#1A1C1E] text-sm"
                      >
                        {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                      </select>
                      <input 
                        type="time" 
                        value={avail.startTime}
                        onChange={e => updateAvailability(index, 'startTime', e.target.value)}
                        className="p-2 border rounded bg-[#1A1C1E] text-sm"
                      />
                      <span className="text-gray-400">to</span>
                      <input 
                        type="time" 
                        value={avail.endTime}
                        onChange={e => updateAvailability(index, 'endTime', e.target.value)}
                        className="p-2 border rounded bg-[#1A1C1E] text-sm"
                      />
                      <button type="button" onClick={() => removeAvailability(index)} className="ml-auto text-red-500 hover:text-red-700">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {availabilities.length === 0 && (
                    <div className="text-sm text-gray-400 italic p-4 text-center border rounded-lg bg-[#101113]">
                      No availability added. Staff won't be bookable.
                    </div>
                  )}
                </div>
              </div>
              
              <div className="pt-4 border-t flex justify-end gap-3">
                <button type="button" onClick={closeModal} className="px-5 py-2 text-gray-400 hover:bg-[#2C2D30] rounded-lg font-medium transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-[#635BFF] text-white rounded-lg font-medium hover:bg-gray-900 transition-colors">
                  {editingStaff ? 'Save Changes' : 'Add Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
