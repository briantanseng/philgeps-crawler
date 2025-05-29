'use client';

import { useEffect, useState } from 'react';

interface SearchFormProps {
  onSearch: (params: any) => void;
}

export default function SearchForm({ onSearch }: SearchFormProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    q: '',
    category: '',
    areaOfDelivery: '',
    minBudget: '',
    maxBudget: '',
    activeOnly: 'true'
  });

  useEffect(() => {
    loadCategories();
    loadAreas();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadAreas = async () => {
    try {
      const response = await fetch('/api/areas');
      const data = await response.json();
      if (data.success) {
        setAreas(data.data);
      }
    } catch (error) {
      console.error('Failed to load areas:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const exportResults = () => {
    const params = new URLSearchParams(formData);
    window.location.href = `/api/opportunities/export?${params}`;
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-primary-900 mb-6">Search Opportunities</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="q" className="block text-sm font-medium text-gray-700 mb-1">
              Keywords
            </label>
            <input
              type="text"
              id="q"
              name="q"
              value={formData.q}
              onChange={handleChange}
              placeholder="Enter keywords..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="areaOfDelivery" className="block text-sm font-medium text-gray-700 mb-1">
              Area of Delivery
            </label>
            <select
              id="areaOfDelivery"
              name="areaOfDelivery"
              value={formData.areaOfDelivery}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Areas</option>
              {areas.map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="minBudget" className="block text-sm font-medium text-gray-700 mb-1">
              Min Budget (PHP)
            </label>
            <input
              type="number"
              id="minBudget"
              name="minBudget"
              value={formData.minBudget}
              onChange={handleChange}
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="maxBudget" className="block text-sm font-medium text-gray-700 mb-1">
              Max Budget (PHP)
            </label>
            <input
              type="number"
              id="maxBudget"
              name="maxBudget"
              value={formData.maxBudget}
              onChange={handleChange}
              placeholder="Any"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="activeOnly" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="activeOnly"
              name="activeOnly"
              value={formData.activeOnly}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="true">Active Only</option>
              <option value="false">All</option>
            </select>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            className="px-6 py-2 bg-primary-900 text-white rounded-md hover:bg-primary-800 transition-colors"
          >
            Search
          </button>
          <button
            type="button"
            onClick={exportResults}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Export CSV
          </button>
        </div>
      </form>
    </div>
  );
}