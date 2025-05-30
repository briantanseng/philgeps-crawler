'use client';

import { useEffect, useState } from 'react';
import { formatNumber } from '@/lib/utils/dateFormat';

interface Stats {
  total: number;
  active: number;
  categories: number;
  entities: number;
}

export default function Statistics() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatistics();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadStatistics, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStatistics = async () => {
    try {
      setError(null);
      const response = await fetch('/api/statistics');
      if (!response.ok) {
        throw new Error(`Failed to fetch statistics: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      } else {
        console.error('Statistics API error:', data.error);
        setError(data.error || 'Failed to load statistics');
      }
    } catch (error: any) {
      console.error('Failed to load statistics:', error);
      setError(error.message || 'Failed to load statistics');
      // Set default values on error
      setStats({
        total: 0,
        active: 0,
        categories: 0,
        entities: 0
      });
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-md">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="text-center">
                <div className="h-12 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-primary-900">Statistics Overview</h2>
        <button
          onClick={loadStatistics}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">Error loading statistics: {error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-50 p-6 rounded-lg text-center">
          <div className="text-4xl font-bold text-primary-900 mb-2">
            {stats ? formatNumber(stats.total) : '-'}
          </div>
          <div className="text-gray-600">Total Opportunities</div>
        </div>

        <div className="bg-blue-50 p-6 rounded-lg text-center">
          <div className="text-4xl font-bold text-primary-900 mb-2">
            {stats ? formatNumber(stats.active) : '-'}
          </div>
          <div className="text-gray-600">Active Opportunities</div>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg text-center">
          <div className="text-4xl font-bold text-primary-900 mb-2">
            {stats ? formatNumber(stats.categories) : '-'}
          </div>
          <div className="text-gray-600">Categories</div>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg text-center">
          <div className="text-4xl font-bold text-primary-900 mb-2">
            {stats ? formatNumber(stats.entities) : '-'}
          </div>
          <div className="text-gray-600">Procuring Entities</div>
        </div>
      </div>
    </div>
  );
}