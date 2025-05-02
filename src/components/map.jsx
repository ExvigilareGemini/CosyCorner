import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
export default function Map() {
  return (
    <MapContainer center={[50.7052, 4.4015]} zoom={13} scrollWheelZoom={true} style={{ height: '25vw', width: '30vw' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[50.7052, 4.4015]}>
        <Popup>
          Cosy Corner
        </Popup>
      </Marker>
    </MapContainer>
  );
}
