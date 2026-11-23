import { useEffect, useRef } from "react";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const MapViewport = ({ markers }) => {
  const map = useMap();
  const fittedMarkerIds = useRef("");

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {
        // map was removed before the timer fired
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    const positions = markers.map((marker) => marker.position);
    const markerIds = markers
      .map((marker) => marker.id)
      .sort()
      .join("|");
    if (positions.length === 0 || markerIds === fittedMarkerIds.current) return;

    fittedMarkerIds.current = markerIds;

    // Leaflet throws (e.g. "Invalid LatLng object: (NaN, NaN)") when the map has no
    // size yet. An error thrown inside an effect would blank the whole page,
    // so keep the default view instead.
    try {
      if (positions.length === 1) {
        map.setView(positions[0], 14);
      } else {
        map.fitBounds(positions, { padding: [32, 32], maxZoom: 15 });
      }
    } catch (error) {
      console.error("Could not fit the map to the markers:", error);
    }
  }, [map, markers]);

  return null;
};

const HeatmapLayer = ({ markers }) => {
  const map = useMap();

  useEffect(() => {
    const pane = map.getPane("heatmapPane") || map.createPane("heatmapPane");
    pane.style.zIndex = "350";
    pane.style.pointerEvents = "none";

    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    pane.appendChild(canvas);

    const draw = () => {
      const size = map.getSize();
      const origin = map.containerPointToLayerPoint([0, 0]);
      const pixelRatio = window.devicePixelRatio || 1;
      const context = canvas.getContext("2d");
      if (!context) return;

      L.DomUtil.setPosition(canvas, origin);
      canvas.width = size.x * pixelRatio;
      canvas.height = size.y * pixelRatio;
      canvas.style.width = `${size.x}px`;
      canvas.style.height = `${size.y}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, size.x, size.y);
      context.globalCompositeOperation = "lighter";

      markers.forEach((marker) => {
        const point = map.latLngToLayerPoint(marker.position);
        const x = point.x - origin.x;
        const y = point.y - origin.y;
        const radius = 48;
        const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, "rgba(220, 38, 38, 0.65)");
        gradient.addColorStop(0.25, "rgba(249, 115, 22, 0.48)");
        gradient.addColorStop(0.55, "rgba(250, 204, 21, 0.3)");
        gradient.addColorStop(1, "rgba(34, 197, 94, 0)");
        context.fillStyle = gradient;
        context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      });

      context.globalCompositeOperation = "source-over";
    };

    map.on("moveend zoomend resize", draw);
    draw();

    return () => {
      map.off("moveend zoomend resize", draw);
      pane.removeChild(canvas);
    };
  }, [map, markers]);

  return null;
};

const LiveTrackingMap = ({
  markers,
  route = [],
  className = "h-[360px]",
  zoom = 12,
  heatmap = false,
}) => (
  <MapContainer
    center={[30.0444, 31.2357]}
    zoom={zoom}
    scrollWheelZoom
    className={`z-0 w-full rounded-lg ${className}`}
  >
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
    <MapViewport markers={markers} />
    {heatmap && <HeatmapLayer markers={markers} />}
    {route.length > 1 && (
      <Polyline
        positions={route}
        pathOptions={{ color: "#f97316", weight: 4, opacity: 0.75 }}
      />
    )}
    {markers.map((marker) => (
      <CircleMarker
        key={marker.id}
        center={marker.position}
        radius={heatmap ? 4 : marker.radius || 9}
        pathOptions={{
          color: "#ffffff",
          weight: heatmap ? 2 : 3,
          fillColor: marker.color || "#2563eb",
          fillOpacity: 1,
        }}
      >
        <Popup>
          <span className="font-medium">{marker.label}</span>
          {marker.detail && <span className="block">{marker.detail}</span>}
        </Popup>
      </CircleMarker>
    ))}
  </MapContainer>
);

export default LiveTrackingMap;
