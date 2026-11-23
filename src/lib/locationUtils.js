export const parseCoordinates = (latitude, longitude) => {
  if (latitude == null || latitude === '' || longitude == null || longitude === '') {
    return null;
  }

  const lat = Number(latitude);
  const lng = Number(longitude);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }

  return [lat, lng];
};

export const getEntityCoordinates = (entity) => {
  if (!entity || typeof entity !== 'object') return null;

  const nestedLocation = entity.currentLocation || entity.location || {};
  return (
    parseCoordinates(
      entity.currentLat ??
        entity.latitude ??
        entity.lat ??
        nestedLocation.latitude ??
        nestedLocation.lat,
      entity.currentLng ??
        entity.longitude ??
        entity.lng ??
        nestedLocation.longitude ??
        nestedLocation.lng
    ) || null
  );
};
