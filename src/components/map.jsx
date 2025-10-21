import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import style from "../style/components/leaflet.module.scss";
import { icon } from "leaflet";

const customIcon = new icon({
  iconUrl: "/assets/img/gps_10577666.png",
  iconSize: [20, 30],
});

export default function Map() {
  return (
    <MapContainer 
      center={[50.7052, 4.4015]} 
      zoom={20} 
      scrollWheelZoom={true} 
      className={style.mapContainer}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker icon={customIcon} position={[50.7052, 4.4015]}>
        <Popup>Cosy Corner</Popup>
      </Marker>
    </MapContainer>
  );
}