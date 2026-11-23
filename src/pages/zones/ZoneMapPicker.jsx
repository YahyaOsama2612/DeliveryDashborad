import { useCallback, useEffect, useRef, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Polygon,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import {
  LoaderCircle,
  MapPinned,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import "leaflet/dist/leaflet.css";

const MapClickHandler = ({ onAddPoint }) => {
  useMapEvents({
    click(event) {
      onAddPoint([event.latlng.lat, event.latlng.lng]);
    },
  });
  return null;
};

const MapViewport = ({ points, location }) => {
  const map = useMap();
  const hasFit = useRef(false);

  useEffect(() => {
    const timers = [100, 350].map((delay) =>
      setTimeout(() => map.invalidateSize(), delay),
    );
    return () => timers.forEach(clearTimeout);
  }, [map]);

  useEffect(() => {
    if (hasFit.current || points.length === 0) return;
    hasFit.current = true;
    if (points.length > 1) {
      map.fitBounds(points, { padding: [24, 24], maxZoom: 15 });
    } else {
      map.setView(points[0], 13);
    }
  }, [map, points]);

  useEffect(() => {
    if (!location) return;
    map.invalidateSize();
    map.flyTo(location.position, Math.max(map.getZoom(), 14), {
      duration: 0.8,
    });
  }, [location, map]);

  return location ? (
    <CircleMarker
      center={location.position}
      radius={9}
      interactive={false}
      pathOptions={{
        color: "#ffffff",
        weight: 3,
        fillColor: "#f97316",
        fillOpacity: 1,
      }}
    />
  ) : null;
};

const ZoneMapPicker = ({ points, onChange }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searchError, setSearchError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [focusedLocation, setFocusedLocation] = useState(null);
  const searchAbortRef = useRef(null);

  useEffect(() => () => searchAbortRef.current?.abort(), []);

  const search = useCallback(async () => {
    const searchQuery = query.trim();
    if (!searchQuery) {
      setResults([]);
      setHasSearched(false);
      setSearchError("Enter a place or address to search.");
      return;
    }

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    setIsSearching(true);
    setSearchError("");
    setResults([]);
    setHasSearched(false);

    try {
      const params = new URLSearchParams({
        format: "jsonv2",
        limit: "5",
        addressdetails: "0",
        "accept-language": "en,ar",
        q: searchQuery,
      });
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        { signal: controller.signal, headers: { Accept: "application/json" } },
      );
      if (!response.ok) {
        throw new Error(`Map search failed (${response.status}).`);
      }
      const places = await response.json();
      if (!Array.isArray(places)) {
        throw new Error("Map search returned an unexpected response.");
      }

      setHasSearched(true);
      setResults(
        places
          .map((place) => ({
            id: place.place_id,
            name: place.display_name,
            position: [Number(place.lat), Number(place.lon)],
          }))
          .filter(
            (place) =>
              Number.isFinite(place.position[0]) &&
              Number.isFinite(place.position[1]),
          ),
      );
    } catch (error) {
      if (error?.name === "AbortError") return;
      setSearchError(
        error?.message || "Could not search the map. Please try again.",
      );
    } finally {
      if (searchAbortRef.current === controller) setIsSearching(false);
    }
  }, [query]);

  const handleSearchKeyDown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    event.stopPropagation();
    search();
  };

  const addPoint = (point) => onChange([...points, point]);

  return (
    <section className="space-y-2" aria-label="Zone boundary map">
      <div className="flex items-center justify-between gap-2">
        <Label>Zone boundary</Label>
        <span className="text-xs text-muted-foreground">
          {points.length} point{points.length === 1 ? "" : "s"}
        </span>
      </div>

      <div role="search" className="space-y-2">
        <div className="flex gap-2">
          <Input
            aria-label="Search map places"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSearchError("");
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search for a city, neighborhood, or address"
          />
          <Button
            type="button"
            variant="outline"
            disabled={isSearching}
            onClick={search}
          >
            {isSearching ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
            Search
          </Button>
        </div>
        {searchError && (
          <p role="alert" className="text-sm text-destructive">
            {searchError}
          </p>
        )}
        {hasSearched && !isSearching && results.length === 0 && !searchError && (
          <p className="text-sm text-muted-foreground">
            No places found. Try a different search.
          </p>
        )}
        {results.length > 0 && (
          <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border bg-background p-1">
            {results.map((result) => (
              <li key={result.id}>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto w-full justify-start whitespace-normal py-2 text-left"
                  onClick={() => {
                    setFocusedLocation({ ...result });
                    setResults([]);
                    setHasSearched(false);
                  }}
                >
                  <MapPinned className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="line-clamp-2">{result.name}</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Choose a search result to move the map. Searching does not add a
          boundary point.
        </p>
      </div>

      <div className="h-72 overflow-hidden rounded-lg border">
        <MapContainer
          center={points[0] || [30.0444, 31.2357]}
          zoom={points.length ? 13 : 11}
          className="h-full w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onAddPoint={addPoint} />
          <MapViewport points={points} location={focusedLocation} />
          {points.length >= 3 && (
            <Polygon
              positions={points}
              pathOptions={{
                color: "#2563eb",
                fillColor: "#3b82f6",
                fillOpacity: 0.2,
              }}
            />
          )}
          {points.map((point, index) => (
            <CircleMarker
              key={`${point[0]}-${point[1]}-${index}`}
              center={point}
              radius={6}
              pathOptions={{
                color: "#1d4ed8",
                fillColor: "#60a5fa",
                fillOpacity: 1,
              }}
            />
          ))}
        </MapContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Click the map to add boundary points. At least three points make a
          zone.
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!points.length}
            onClick={() => onChange(points.slice(0, -1))}
          >
            <RotateCcw className="size-3.5" />
            Undo point
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!points.length}
            onClick={() => onChange([])}
          >
            <Trash2 className="size-3.5" />
            Clear
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ZoneMapPicker;
