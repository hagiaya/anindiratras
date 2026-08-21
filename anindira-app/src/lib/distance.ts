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
 * Uses dual mirror endpoints with 8s timeout, and falls back to terrain-aware circuity estimation for Eastern Indonesia / Sulawesi.
 */
export async function getRealDrivingDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): Promise<number> {
  if (!lat1 || !lng1 || !lat2 || !lng2) return 0

  const endpoints = [
    `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=false`,
    `https://routing.openstreetmap.de/routed-car/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=false`
  ]

  for (const url of endpoints) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)

      if (res.ok) {
        const data = await res.json()
        if (data && data.routes && data.routes.length > 0 && data.routes[0].distance > 0) {
          const distanceKm = data.routes[0].distance / 1000
          return Math.round(distanceKm * 10) / 10 // Round to 1 decimal place
        }
      }
    } catch (err) {
      console.warn(`Routing endpoint ${url} failed, trying next fallback...`, err)
    }
  }

  // Realistic terrain-aware fallback calculation for Indonesia/Sulawesi winding roads
  const straightLine = getHaversineDistance(lat1, lng1, lat2, lng2)
  let circuityFactor = 1.48 // short route / city
  if (straightLine > 100) {
    circuityFactor = 2.28 // long intercity mountainous coastal route (e.g. Gorontalo to Manado: ~181km straight -> ~413km road)
  } else if (straightLine > 30) {
    circuityFactor = 1.60 // medium route (e.g. Gorontalo to Jalaluddin: ~23km straight -> ~37km road)
  }

  return Math.round((straightLine * circuityFactor) * 10) / 10
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
