'use client';

import { useEffect, useState } from 'react';
import { formatDate, formatDuration } from '@/lib/utils/dateFormat';

interface CrawlerStatus {
  enabled: boolean;
  intervalMinutes: number;
  isRunning: boolean;
  lastCrawl?: {
    timestamp: string;
    duration: number;
    status: string;
    opportunitiesFound: number;
    newOpportunities: number;
    updatedOpportunities: number;
    errors: number;
  };
  nextCrawl?: string;
}

export default function CrawlerControl() {
  const [status, setStatus] = useState<CrawlerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    loadStatus();
    // Auto-refresh status every 10 seconds
    const interval = setInterval(loadStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const response = await fetch('/api/crawler/status');
      const data = await response.json();
      if (data.success) {
        setStatus(data.data);
      }
    } catch (error) {
      console.error('Failed to load crawler status:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCrawler = async () => {
    if (!status || toggling) return;
    
    setToggling(true);
    try {
      const response = await fetch('/api/crawler/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !status.enabled })
      });
      
      const data = await response.json();
      if (data.success) {
        await loadStatus();
      }
    } catch (error) {
      console.error('Failed to toggle crawler:', error);
    } finally {
      setToggling(false);
    }
  };

  const runManualCrawl = async () => {
    if (running || status?.isRunning) return;
    
    setRunning(true);
    try {
      const response = await fetch('/api/crawler/run', {
        method: 'POST'
      });
      
      const data = await response.json();
      if (data.success) {
        // Update status to show it's running
        setStatus(prev => prev ? { ...prev, isRunning: true } : null);
      } else {
        alert(data.error || 'Failed to start crawler');
      }
    } catch (error) {
      console.error('Failed to run crawler:', error);
      alert('Failed to start crawler');
    } finally {
      setRunning(false);
    }
  };


  if (loading) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-md">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-md">
        <p className="text-red-600">Failed to load crawler status</p>
      </div>
    );
  }

  const statusColor = status.isRunning ? 'blue' : status.enabled ? 'green' : 'gray';
  const statusText = status.isRunning ? 'Running' : status.enabled ? 'Active' : 'Inactive';

  return (
    <div className={`bg-white p-8 rounded-lg shadow-md border-2 ${
      status.isRunning ? 'border-blue-400' : status.enabled ? 'border-green-400' : 'border-gray-300'
    }`}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Crawler Control</h2>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              status.isRunning ? 'bg-blue-500 animate-pulse' : 
              status.enabled ? 'bg-green-500' : 'bg-gray-400'
            }`}></div>
            <span className={`font-medium ${
              status.isRunning ? 'text-blue-600' : 
              status.enabled ? 'text-green-600' : 'text-gray-600'
            }`}>{statusText}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={status.enabled}
              onChange={toggleCrawler}
              disabled={toggling || status.isRunning}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            <span className="ml-3 text-sm font-medium text-gray-900">
              {toggling ? 'Updating...' : 'Auto-crawl'}
            </span>
          </label>
          
          <button
            onClick={runManualCrawl}
            disabled={running || status.isRunning}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              running || status.isRunning
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {running ? 'Starting...' : status.isRunning ? 'Running...' : 'Run Now'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <dt className="text-sm font-medium text-gray-500">Interval</dt>
          <dd className="mt-1 text-sm text-gray-900">Every {status.intervalMinutes} minutes</dd>
        </div>
        
        {status.lastCrawl && (
          <>
            <div>
              <dt className="text-sm font-medium text-gray-500">Last Crawl</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate(status.lastCrawl.timestamp)}
              </dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500">Duration</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDuration(status.lastCrawl.duration)}
              </dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1 text-sm">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  status.lastCrawl.status === 'completed' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {status.lastCrawl.status}
                </span>
              </dd>
            </div>
          </>
        )}
        
        {status.nextCrawl && status.enabled && !status.isRunning && (
          <div>
            <dt className="text-sm font-medium text-gray-500">Next Crawl</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {formatDate(status.nextCrawl)}
            </dd>
          </div>
        )}
      </div>

      {status.lastCrawl && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Last Crawl Results</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {status.lastCrawl.opportunitiesFound}
              </div>
              <div className="text-xs text-gray-500">Total Found</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {status.lastCrawl.newOpportunities}
              </div>
              <div className="text-xs text-gray-500">New</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {status.lastCrawl.updatedOpportunities}
              </div>
              <div className="text-xs text-gray-500">Updated</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {status.lastCrawl.errors}
              </div>
              <div className="text-xs text-gray-500">Errors</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}