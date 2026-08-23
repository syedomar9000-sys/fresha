import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';
import type { Business } from '../types';
import { Search, MapPin, Tag } from 'lucide-react';

import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user, logout } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [keyword, setKeyword] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);

  const search = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (keyword) params.append('keyword', keyword);
      if (city) params.append('city', city);
      if (category) params.append('category', category);
      
      const res = await api.get(`/businesses/?${params.toString()}`);
      setBusinesses(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load businesses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    search();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-black">BookIt</h1>
        <div className="space-x-4">
          {user ? (
            <>
              <Link to="/dashboard" className="text-gray-600 font-medium hover:text-black">
                {user.role === 'CUSTOMER' ? 'My Profile' : 'Business Dashboard'}
              </Link>
              <button onClick={logout} className="text-gray-600 font-medium hover:text-black ml-4">Log Out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-600 font-medium hover:text-black">Log In</Link>
              <Link to="/signup" className="bg-black text-white px-4 py-2 rounded-full font-medium hover:bg-gray-900">Sign Up</Link>
            </>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
            Find and book the best local services
          </h2>
          <p className="text-xl text-gray-500 mb-8">
            Discover salons, spas, barbers, and more near you.
          </p>
          
          <form 
            onSubmit={e => { e.preventDefault(); search(); }}
            className="flex flex-col md:flex-row gap-2 p-2 bg-white rounded-2xl shadow-lg border border-gray-100"
          >
            <div className="flex-1 flex items-center px-4 py-3 border-b md:border-b-0 md:border-r border-gray-100">
              <Search className="text-gray-400 mr-3" size={20} />
              <input 
                value={keyword} onChange={e => setKeyword(e.target.value)}
                placeholder="Any service or business" 
                className="w-full focus:outline-none text-gray-700 placeholder-gray-400"
              />
            </div>
            <div className="flex-1 flex items-center px-4 py-3 border-b md:border-b-0 md:border-r border-gray-100">
              <MapPin className="text-gray-400 mr-3" size={20} />
              <input 
                value={city} onChange={e => setCity(e.target.value)}
                placeholder="City" 
                className="w-full focus:outline-none text-gray-700 placeholder-gray-400"
              />
            </div>
            <div className="flex-1 flex items-center px-4 py-3">
              <Tag className="text-gray-400 mr-3" size={20} />
              <input 
                value={category} onChange={e => setCategory(e.target.value)}
                placeholder="Category" 
                className="w-full focus:outline-none text-gray-700 placeholder-gray-400"
              />
            </div>
            <button type="submit" className="bg-black text-white px-8 py-3 rounded-full font-bold hover:bg-gray-900 transition-colors mt-2 md:mt-0">
              Search
            </button>
          </form>
        </div>

        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Popular Venues</h3>
          {loading ? (
            <div className="text-center py-12 text-gray-500">Searching...</div>
          ) : businesses.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border border-dashed border-gray-300">
              No businesses found matching your criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {businesses.map(b => (
                <Link key={b.id} to={`/b/${b.slug || b.id}`} className="block group">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="h-48 bg-gray-200 relative overflow-hidden">
                      {/* Placeholder for business image */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <span className="bg-white/90 text-gray-800 text-xs font-bold px-2 py-1 rounded mb-2 inline-block">
                          {b.category || 'Local Business'}
                        </span>
                        <h4 className="text-xl font-bold text-white group-hover:text-indigo-200 transition-colors">{b.name}</h4>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center text-gray-500 text-sm mb-2">
                        <MapPin size={16} className="mr-1" />
                        {b.address}{b.city ? `, ${b.city}` : ''}
                      </div>
                      <p className="text-gray-600 text-sm line-clamp-2">
                        {b.description || 'No description provided.'}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
