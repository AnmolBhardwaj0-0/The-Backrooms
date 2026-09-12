/**
 * TheBackrooms - Geolocation & Proximity Engine
 * Zero-Knowledge Proximity Calculations & Campus Location Simulation
 */

// Earth's radius in meters
const EARTH_RADIUS_METERS = 6371000;

/**
 * Calculates accurate spherical distance in meters between two GPS coordinates using the Haversine formula.
 * @param {number} lat1 Latitude of point 1
 * @param {number} lon1 Longitude of point 1
 * @param {number} lat2 Latitude of point 2
 * @param {number} lon2 Longitude of point 2
 * @returns {number} Distance in meters
 */
export function getHaversineDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
    return Infinity;
  }
  const toRad = (angle) => (angle * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_METERS * c);
}

/**
 * Coarse distance bucketing for zero-knowledge privacy.
 * Exact coordinates or meters are never broadcast to peers.
 * @param {number} meters 
 * @returns {string} Human-friendly privacy bucket
 */
export function formatDistanceBucket(meters) {
  if (meters === Infinity || meters === null || meters === undefined) return 'Unknown';
  if (meters <= 25) return '< 25m (Very Close)';
  if (meters <= 50) return '~25–50m (Same Building)';
  if (meters <= 100) return '~50–100m (Nearby Area)';
  if (meters <= 200) return '~100–200m (Campus Sector)';
  return '> 200m (Out of Range)';
}

/**
 * Campus Location Presets for seamless multi-tab & multi-device testing during hackathons.
 * Allows testing proximity thresholds without having to physically walk across campus.
 */
export const CAMPUS_PRESETS = [
  {
    id: 'device',
    name: '📱 Real Device GPS',
    description: 'Use native phone/browser GPS sensor',
    coords: null
  },
  {
    id: 'library',
    name: '📚 Campus Library (Central Hub)',
    description: 'Main Study Lounge (Origin: 0m)',
    coords: { lat: 28.545000, lon: 77.192600 }
  },
  {
    id: 'boba',
    name: '🧋 Student Center Boba Cafe',
    description: 'Indoor cafe tables (~22m from Library)',
    coords: { lat: 28.545150, lon: 77.192720 }
  },
  {
    id: 'quad',
    name: '🌿 Student Union Quad',
    description: 'Benches outside cafe (~40m from Library)',
    coords: { lat: 28.545300, lon: 77.192850 }
  },
  {
    id: 'gym',
    name: '🏀 Recreation Center & Gym',
    description: 'Campus sports complex (~68m from Library)',
    coords: { lat: 28.545520, lon: 77.192250 }
  },
  {
    id: 'labs',
    name: '⚡ Engineering & Tech Labs',
    description: 'Hardware lab wing (~85m from Library)',
    coords: { lat: 28.545650, lon: 77.192450 }
  },
  {
    id: 'dorms',
    name: '🏠 Dormitory Quad',
    description: 'Student residence halls (~130m, outside 100m zone)',
    coords: { lat: 28.546050, lon: 77.193200 }
  },
  {
    id: 'metro',
    name: '🚇 Off-Campus Metro Station',
    description: 'Transit stop (~480m, far out of range)',
    coords: { lat: 28.548900, lon: 77.195500 }
  }
];

/**
 * Requests device GPS location with timeout and fallback.
 * @returns {Promise<{ coords: { lat: number, lon: number }, accuracy: number }>}
 */
export function requestDeviceLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          coords: {
            lat: position.coords.latitude,
            lon: position.coords.longitude
          },
          accuracy: position.coords.accuracy || 0
        });
      },
      (error) => {
        let msg = 'Unable to retrieve location';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow location access or pick a Campus Preset.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location information is currently unavailable.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out.';
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 15000
      }
    );
  });
}
