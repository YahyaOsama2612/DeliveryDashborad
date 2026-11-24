import { useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  MapPin,
  Package,
  Search,
  Sparkles,
  Truck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { navigationItems } from '../../config/modules';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import useAuthStore from '../../store/useAuthStore';

const Home = () => {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const filteredSections = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return navigationItems;
    return navigationItems.filter(
      ({ title, description }) =>
        title.toLowerCase().includes(term) ||
        description.toLowerCase().includes(term)
    );
  }, [search]);
  const firstName = user?.name?.trim().split(/\s+/)[0];

  return (
    <section className="home-dashboard mx-auto max-w-7xl space-y-8">
      <div className="home-welcome">
        <div>
          <div className="home-eyebrow">
            <Sparkles size={14} />
            <span>YOUR OPERATIONS HUB</span>
          </div>
          <h1 className="home-title">
            {firstName ? `Good to see you, ${firstName}.` : 'Welcome to your dashboard.'}
          </h1>
          <p className="home-subtitle">
            Everything you need to keep your delivery operations moving.
          </p>
        </div>
        <div className="home-workspace-badge">
          <CheckCircle2 size={15} />
          <span>Workspace overview</span>
        </div>
      </div>

      <div className="home-hero">
        <div className="home-hero-copy">
          <span className="home-hero-label">
            <span className="home-status-dot" />
            DELIVERY CONTROL CENTER
          </span>
          <h2>Make every delivery<br className="hidden sm:block" /> a smooth one.</h2>
          <p>
            Find your tools, stay organized, and keep every part of your
            delivery business connected.
          </p>
          <button
            type="button"
            className="home-primary-button"
            onClick={() => navigate('/orders')}
          >
            Explore orders
            <ArrowRight size={16} />
          </button>
        </div>
        <div className="home-route-art" aria-hidden="true">
          <div className="home-route-orbit home-route-orbit-one" />
          <div className="home-route-orbit home-route-orbit-two" />
          <div className="home-route-line">
            <span className="home-route-stop home-route-start"><MapPin size={17} /></span>
            <span className="home-route-stop home-route-end"><Package size={17} /></span>
          </div>
          <div className="home-route-truck"><Truck size={24} strokeWidth={1.7} /></div>
          <span className="home-route-caption">On the way</span>
        </div>
        <div className="home-hero-glow" />
      </div>

      <div className="home-section-heading">
        <div>
          <span className="home-section-kicker">GET THINGS DONE</span>
          <h2>Manage your workspace</h2>
          <p>Jump into a section to manage your delivery business.</p>
        </div>
        <div className="home-search">
          <Search size={17} aria-hidden="true" />
          <Input
            aria-label="Search sections"
            placeholder="Search sections..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>
      </div>

      {filteredSections.length ? (
        <div className="home-module-grid">
          {filteredSections.map(({ title, description, url, icon: Icon }, index) => (
            <Card
              key={url}
              role="link"
              tabIndex={0}
              aria-label={`${title}: ${description}`}
              onClick={() => navigate(url)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  navigate(url);
                }
              }}
              className="home-module-card"
              style={{ '--card-index': index }}
            >
              <CardContent className="flex h-full flex-col p-5 sm:p-6">
                <div className="flex items-start justify-between">
                  <span className="home-module-icon"><Icon size={21} strokeWidth={1.8} /></span>
                  <span className="home-module-arrow">
                    <ArrowUpRight size={17} />
                  </span>
                </div>
                <div className="mt-7 space-y-1.5">
                  <h3 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h3>
                  <p className="text-[13px] leading-relaxed text-muted-foreground">{description}</p>
                </div>
              </CardContent>
              <span className="home-card-accent" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="home-empty-state">
          <div className="home-empty-icon"><Search size={19} /></div>
          <p className="text-sm font-semibold text-foreground">No sections found</p>
          <p className="mt-1 text-sm text-muted-foreground">Try a different search.</p>
        </div>
      )}
    </section>
  );
};

export default Home;
