import { Search as SearchIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function Search() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchParams.set('q', searchQuery);
      navigate(`/dashboard?${searchParams.toString()}`);
    } else {
      searchParams.delete('q');
      navigate(`/dashboard?${searchParams.toString()}`);
    }
  };

  return (
    <form
      onSubmit={handleSearch}
      className="relative w-full max-w-sm sm:max-w-md"
    >
      <SearchIcon className="absolute left-2 sm:left-2.5 top-2 sm:top-2.5 h-4 w-4 text-muted-foreground icon-glow" />
      <Input
        type="search"
        placeholder="Search files..."
        className="w-full rounded-md pl-7 sm:pl-8 search-cool text-sm focus-cool"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </form>
  );
}