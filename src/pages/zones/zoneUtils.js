import getApiErrorMessage from "../../lib/Geterrormessage";

export const ZONES_URL = "/api/shipping/zones";
export const QUERY_KEY = [ZONES_URL];

export const getData = (response) =>
  response?.data?.data ?? response?.data ?? response;

export const getCoordinates = (coordinates) => {
  if (typeof coordinates === "string") return coordinates;
  return coordinates == null ? "" : JSON.stringify(coordinates);
};

const toLatLngPair = (point) => {
  if (Array.isArray(point) && point.length >= 2) {
    return [Number(point[0]), Number(point[1])];
  }
  if (point && typeof point === "object") {
    const lat = point.lat ?? point.latitude;
    const lng = point.lng ?? point.lon ?? point.longitude;
    if (lat == null || lng == null) return null;
    return [Number(lat), Number(lng)];
  }
  return null;
};

export const parseCoordinatePoints = (coordinates) => {
  try {
    const parsed =
      typeof coordinates === "string"
        ? JSON.parse(coordinates || "[]")
        : coordinates;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(toLatLngPair)
      .filter(
        (point) =>
          point &&
          Number.isFinite(point[0]) &&
          Number.isFinite(point[1]) &&
          point[0] >= -90 &&
          point[0] <= 90 &&
          point[1] >= -180 &&
          point[1] <= 180,
      );
  } catch {
    return [];
  }
};

const ID_KEYS = ["id", "_id", "zoneId", "zone_id", "uuid", "ID", "Id"];

export const withId = (zone) => {
  if (!zone || typeof zone !== "object") return zone;
  if (zone.id != null && zone.id !== "") return zone;

  let id = ID_KEYS.map((key) => zone[key]).find(
    (value) => value != null && value !== "",
  );
  if (id == null) {
    const key = Object.keys(zone).find(
      (field) =>
        /id$/i.test(field) &&
        ["string", "number"].includes(typeof zone[field]),
    );
    id = key ? zone[key] : undefined;
  }
  return id == null ? zone : { ...zone, id };
};

export const getInitialFormData = (zone) =>
  zone
    ? {
        name: zone.name || "",
        nameAr: zone.nameAr || "",
        coordinates: getCoordinates(zone.coordinates),
        coverageAreaRadiusKm: String(zone.coverageAreaRadiusKm ?? ""),
        deliveryFee: String(zone.deliveryFee ?? ""),
        minOrderAmount: String(zone.minOrderAmount ?? ""),
        status:
          zone.status === true || zone.status === 1
            ? "active"
            : zone.status === false || zone.status === 0
              ? "inactive"
              : zone.status || "active",
      }
    : {
        name: "",
        nameAr: "",
        coordinates: "",
        coverageAreaRadiusKm: "",
        deliveryFee: "",
        minOrderAmount: "",
        status: "active",
      };

export const toDisplayMessage = (value, fallback) => {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    const messages = value
      .map((item) => toDisplayMessage(item, ""))
      .filter(Boolean);
    return messages.length ? messages.join(", ") : fallback;
  }
  if (value && typeof value === "object") {
    return toDisplayMessage(value.message, fallback);
  }
  return fallback;
};

export const getErrorMessage = (error, fallback) =>
  getApiErrorMessage(error, fallback);
