import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { FaPhoneAlt, FaGlobe } from 'react-icons/fa';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const categoryTags = {
  food: 'amenity=restaurant',
  medical: 'amenity=pharmacy',
  grocery: 'shop=supermarket',
};

const MapView = ({ category }) => {
  const [userLocation, setUserLocation] = useState(null);
  const [places, setPlaces] = useState([]);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([
          position.coords.latitude,
          position.coords.longitude,
        ]);
      },
      () => setUserLocation([17.385, 78.4867])
    );
  }, []);

  useEffect(() => {
    if (!userLocation) return;

    const fetchPlaces = async () => {
      const [lat, lon] = userLocation;
      const radius = 2000;
      const tag = categoryTags[category];

      const query = `
        [out:json];
        (
          node[${tag}](around:${radius},${lat},${lon});
          way[${tag}](around:${radius},${lat},${lon});
          relation[${tag}](around:${radius},${lat},${lon});
        );
        out center;
      `;

      try {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: query,
        });
        const data = await response.json();
        const elements = data.elements.map((el) => {
          const { id, tags, lat, lon, center } = el;
          return {
            id,
            name: tags.name || 'Unnamed',
            lat: lat || center?.lat,
            lon: lon || center?.lon,
            address: tags['addr:full'] || '',
            phone: tags.phone || '',
            website: tags.website || '',
          };
        });
        setPlaces(elements);
      } catch (error) {
        console.error('Fetch error:', error);
      }
    };

    fetchPlaces();
  }, [userLocation, category]);

  const MapUpdater = () => {
    const map = useMap();
    useEffect(() => {
      if (userLocation) {
        map.setView(userLocation, 15);
      }
    }, [userLocation]);
    return null;
  };

  return (
    <>
      <div style={{ height: '50vh' }}>
        {userLocation && (
          <MapContainer center={userLocation} zoom={15} style={{ height: '100%' }}>
            <MapUpdater />
            <TileLayer url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />
            {places.map((place) => (
              <Marker key={place.id} position={[place.lat, place.lon]}>
                <Popup>
                  <strong>{place.name}</strong>
                  <br />{place.address}
                  <br />{place.phone && (<><FaPhoneAlt /> {place.phone}</>)}
                  <br />{place.website && (<><FaGlobe /> <a href={place.website}>Website</a></>)}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      <div className="place-list">
        {places.map((place) => (
          <div key={place.id} className="place-card">
            <h3>{place.name}</h3>
            <p>{place.address}</p>
            {place.phone && <p><FaPhoneAlt /> {place.phone}</p>}
            {place.website && (
              <p>
                <FaGlobe /> <a href={place.website} target="_blank" rel="noreferrer">Website</a>
              </p>
            )}
          </div>
        ))}
      </div>
    </>
  );
};

export default MapView;
