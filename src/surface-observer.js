const finite = value => Number.isFinite(Number(value));

/**
 * Coordinates returned by the Geolocation API are geodetic latitude and
 * east-positive longitude. That is the same convention used by the Earth
 * horizon model, so preserve the measured point while protecting the renderer
 * from malformed browser values.
 */
export function earthObserverCoordinates(coords = {}) {
 const latitude = Number(coords.latitude);
 const longitude = Number(coords.longitude);
 if (!finite(latitude) || !finite(longitude)) return null;
 const eastLongitude = longitude >= -180 && longitude <= 180
  ? longitude
  : ((longitude + 180) % 360 + 360) % 360 - 180;
 return {
  latitude: Math.max(-90, Math.min(90, latitude)),
  longitude: eastLongitude,
  accuracy: finite(coords.accuracy) ? Math.max(0, Number(coords.accuracy)) : null
 };
}

export function isEarthSurface(body) {
 return body?.key === 'earth';
}
