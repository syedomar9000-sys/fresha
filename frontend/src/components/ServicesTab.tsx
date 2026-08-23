import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api';
import type { Service } from '../types';
import { Plus, X, Edit2, Trash2 } from 'lucide-react';

export default function ServicesTab({ businessId }: { businessId: number }) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [deposit, setDeposit] = useState('0');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [categoryName, setCategoryName] = useState('');

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/services/?business_id=${businessId}`);
      setServices(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load services.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [businessId]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setPrice('');
    setDeposit('0');
    setDurationMinutes('60');
    setCategoryName('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (s: Service) => {
    setName(s.name);
    setDescription(s.description);
    setPrice(s.price);
    setDeposit(s.deposit);
    setDurationMinutes(s.durationMinutes.toString());
    setCategoryName(s.categoryName || '');
    setEditingId(s.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading(editingId ? 'Updating service...' : 'Creating service...');
    const payload = {
      name,
      description,
      price: parseFloat(price) || 0,
      deposit: parseFloat(deposit) || 0,
      duration_minutes: parseInt(durationMinutes) || 60,
      category: categoryName,
    };

    try {
      if (editingId) {
        await api.patch(`/services/${editingId}/`, payload);
        toast.success('Service updated successfully!', { id: toastId });
      } else {
        await api.post(`/services/`, { ...payload, business_id: businessId });
        toast.success('Service created successfully!', { id: toastId });
      }
      fetchServices();
      resetForm();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save service.', { id: toastId });
    }
  };

  const handleDelete = (id: number) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-medium text-gray-900">Are you sure you want to delete this service?</p>
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
              const toastId = toast.loading('Deleting service...');
              try {
                await api.delete(`/services/${id}/`);
                setServices(services.filter(s => s.id !== id));
                toast.success('Service deleted.', { id: toastId });
              } catch (err) {
                console.error(err);
                toast.error('Failed to delete service.', { id: toastId });
              }
            }}
          >
            Yes, delete
          </button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  if (loading) return <div className="text-gray-400 p-8">Loading services...</div>;

  return (
    <div className="bg-[#1A1C1E] rounded-xl shadow-sm border border-[#2C2D30] p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-200">Services</h3>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#635BFF] text-white px-4 py-2 rounded-full flex items-center gap-2 hover:bg-gray-900 transition-colors"
        >
          <Plus size={18} /> Add Service
        </button>
      </div>

      {services.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No services added yet. Create one to get started!
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b text-gray-400 text-sm">
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Category</th>
                <th className="pb-3 font-medium">Duration</th>
                <th className="pb-3 font-medium">Price</th>
                <th className="pb-3 font-medium">Deposit</th>
                <th className="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-[#101113]">
                  <td className="py-4 font-medium text-gray-200">{s.name}</td>
                  <td className="py-4 text-gray-400">{s.categoryName || 'General'}</td>
                  <td className="py-4 text-gray-400">{s.durationMinutes} min</td>
                  <td className="py-4 text-gray-400">${s.price}</td>
                  <td className="py-4 text-gray-400">${s.deposit}</td>
                  <td className="py-4 text-right">
                    <button onClick={() => handleEdit(s)} className="text-white hover:text-indigo-800 mr-3">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1C1E] rounded-xl shadow-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">{editingId ? 'Edit Service' : 'Add Service'}</h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-400"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                <input required value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-black outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-black outline-none" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Price ($)</label>
                  <input type="number" step="0.01" required value={price} onChange={e => setPrice(e.target.value)} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-black outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Deposit ($)</label>
                  <input type="number" step="0.01" value={deposit} onChange={e => setDeposit(e.target.value)} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-black outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Duration (mins)</label>
                  <input type="number" required value={durationMinutes} onChange={e => setDurationMinutes(e.target.value)} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-black outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                  <input value={categoryName} onChange={e => setCategoryName(e.target.value)} placeholder="e.g. Haircuts" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-black outline-none" />
                </div>
              </div>
              <button type="submit" className="w-full bg-[#635BFF] text-white font-medium py-2 rounded-full hover:bg-gray-900 transition-colors mt-2">
                {editingId ? 'Update Service' : 'Create Service'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
