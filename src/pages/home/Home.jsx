import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { navigationItems } from '../../config/modules';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';

const Home = () => {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const filteredSections = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return navigationItems;
    return navigationItems.filter(
      ({ title, description }) =>
        title.toLowerCase().includes(term) ||
        description.toLowerCase().includes(term)
    );
  }, [search]);

  return (
    <section className="mx-auto max-w-6xl space-y-8">
      <div className="space-y-5">
        <div>
          <h2 className="m-0 text-xl font-bold tracking-tight">Modules</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose an area to manage your delivery business.
          </p>
        </div>
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search sections"
            placeholder="Search sections..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-11 rounded-xl pl-10"
          />
        </div>
      </div>

      {filteredSections.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {filteredSections.map(({ title, description, url, icon: Icon }) => (
            <Card
              key={url}
              role="link"
              tabIndex={0}
              onClick={() => navigate(url)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  navigate(url);
                }
              }}
              className="group relative cursor-pointer border border-border/60 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-primary transition-transform duration-200 group-hover:scale-x-100 group-focus-visible:scale-x-100" />
              <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon size={22} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center">
          <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-muted">
            <Search size={16} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No sections found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try a different search.
          </p>
        </div>
      )}
    </section>
  );
};

export default Home;
