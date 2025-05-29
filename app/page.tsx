'use client';

import { useState } from 'react';
import Statistics from '@/components/Statistics';
import CrawlerControl from '@/components/CrawlerControl';
import SearchForm from '@/components/SearchForm';
import OpportunitiesTable from '@/components/OpportunitiesTable';
import { FormattedOpportunity } from '@/lib/services/searchService';

export default function Home() {
  const [searchResults, setSearchResults] = useState<FormattedOpportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastSearchParams, setLastSearchParams] = useState<any>(null);

  const handleSearch = async (params: any) => {
    setLoading(true);
    setHasSearched(true);
    setLastSearchParams(params);
    
    try {
      const searchParams = new URLSearchParams(params);
      const response = await fetch(`/api/opportunities/search?${searchParams}`);
      const data = await response.json();
      
      if (data.success) {
        setSearchResults(data.data);
      } else {
        console.error('Search failed:', data.error);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!lastSearchParams) return;
    const searchParams = new URLSearchParams(lastSearchParams);
    window.location.href = `/api/opportunities/export?${searchParams}`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        {/* Crawler Control Section */}
        <CrawlerControl />
        
        {/* Statistics Section */}
        <Statistics />
        
        {/* Search Section */}
        <SearchForm onSearch={handleSearch} />
        
        {/* Results Section */}
        {hasSearched && (
          <>
            {searchResults.length > 0 && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  Export to CSV
                </button>
              </div>
            )}
            <OpportunitiesTable data={searchResults} loading={loading} />
          </>
        )}
      </div>
    </div>
  );
}