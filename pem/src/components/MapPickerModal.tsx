import { useState, useRef, useMemo, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { X, MapPin } from 'lucide-react'

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface MapPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (lat: number, lng: number, addressText: string) => void
  initialPosition?: [number, number]
  title?: string
}

function LocationMarker({ position, setPosition }: { position: L.LatLng, setPosition: (p: L.LatLng) => void }) {
  const markerRef = useRef<L.Marker>(null)
  
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current
        if (marker != null) {
          setPosition(marker.getLatLng())
        }
      },
    }),
    [setPosition],
  )

  useMapEvents({
    click(e) {
      setPosition(e.latlng)
    },
  })

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
    />
  )
}

export default function MapPickerModal({ isOpen, onClose, onSelect, initialPosition = [0.5401, 123.0567], title = "Pilih Lokasi" }: MapPickerModalProps) {
  // Gorontalo default center
  const [position, setPosition] = useState<L.LatLng>(new L.LatLng(initialPosition[0], initialPosition[1]))
  const [loadingAddress, setLoadingAddress] = useState(false)

  // Reset position when modal opens
  useEffect(() => {
    if (isOpen) {
      setPosition(new L.LatLng(initialPosition[0], initialPosition[1]))
    }
  }, [isOpen, initialPosition])

  if (!isOpen) return null

  const handleConfirm = async () => {
    setLoadingAddress(true)
    try {
      // Reverse geocoding using Nominatim
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}`)
      const data = await response.json()
      
      const addressText = data.display_name || `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`
      onSelect(position.lat, position.lng, addressText)
    } catch (error) {
      console.error("Failed to fetch address", error)
      onSelect(position.lat, position.lng, `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`)
    } finally {
      setLoadingAddress(false)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 bg-white shadow-sm z-10 relative">
        <h2 className="text-lg font-bold text-gray-800">{title}</h2>
        <button onClick={onClose} className="rounded-full bg-gray-100 p-2 text-gray-600 active:bg-gray-200 transition">
          <X size={20} />
        </button>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative">
        <MapContainer center={position} zoom={13} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} setPosition={setPosition} />
        </MapContainer>
        
        {/* Helper Badge */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] bg-white px-4 py-2 rounded-full shadow-lg border border-gray-100 text-sm font-medium text-gray-700 flex items-center space-x-2 whitespace-nowrap pointer-events-none">
          <MapPin size={16} className="text-primary" />
          <span>Geser penanda atau tap pada peta</span>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-10 relative">
        <div className="mb-4">
          <p className="text-xs text-gray-500 font-medium">Koordinat Terpilih</p>
          <p className="text-sm font-bold text-gray-800">{position.lat.toFixed(6)}, {position.lng.toFixed(6)}</p>
        </div>
        <button 
          onClick={handleConfirm}
          disabled={loadingAddress}
          className="w-full py-3.5 rounded-xl bg-primary text-white font-bold shadow-lg shadow-blue-200 active:scale-[0.98] transition flex justify-center items-center"
        >
          {loadingAddress ? 'Mengambil Alamat...' : 'Konfirmasi Lokasi'}
        </button>
      </div>
    </div>
  )
}
