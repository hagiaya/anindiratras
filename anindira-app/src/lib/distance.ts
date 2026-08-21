/**
 * Distance & Geocoding Utilities for Real Road Driving Distance (OSRM)
 */

// Haversine straight-line distance fallback
export function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Fetches actual driving distance in kilometers using OSRM (Open Source Routing Machine).
 * Falls back to Haversine straight-line x 1.3 (road circuity factor) if OSRM is unreachable.
 */
export async function getRealDrivingDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): Promise<number> {
  if (!lat1 || !lng1 || !lat2 || !lng2) return 0

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)

    const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=false`
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (res.ok) {
      const data = await res.json()
      if (data && data.routes && data.routes.length > 0) {
        const distanceMeters = data.routes[0].distance
        const distanceKm = distanceMeters / 1000
        return Math.round(distanceKm * 10) / 10 // Round to 1 decimal place
      }
    }
  } catch (err) {
    console.warn('OSRM routing fetch failed, using road circuity fallback:', err)
  }

  // Fallback: Haversine * 1.3 road circuity estimation
  const straightLine = getHaversineDistance(lat1, lng1, lat2, lng2)
  return Math.round((straightLine * 1.3) * 10) / 10
}

/**
 * Geocodes an address string to lat/lng coordinates using OpenStreetMap Nominatim.
 */
export async function geocodeAddress(addressText: string): Promise<{ lat: number; lng: number } | null> {
  if (!addressText || !addressText.trim()) return null

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressText)}&limit=1`
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (res.ok) {
      const data = await res.json()
      if (data && data.length > 0) {
        return {
          lat: Number(data[0].lat),
          lng: Number(data[0].lon)
        }
      }
    }
  } catch (err) {
    console.warn('Geocoding error:', err)
  }
  return null
}
