import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvent,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { FaMapMarkerAlt, FaPhone, FaGlobe, FaSearch, FaHeart, FaRegHeart, FaPrescriptionBottle } from "react-icons/fa";
import { MdPlace } from "react-icons/md";
import { motion } from "framer-motion";
import "./Medical.css";

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const Medical = () => {
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState(null);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
        },
        (error) => console.error("Error getting user location:", error)
      );
    }
  }, []);

  const fetchLocation = async () => {
    if (!location.trim()) return;
    setLoading(true);
    try {
      const res = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: {
          q: location,
          format: "json",
        },
      });
      if (res.data.length > 0) {
        const { lat, lon } = res.data[0];
        const parsedLat = parseFloat(lat);
        const parsedLon = parseFloat(lon);
        setCoords([parsedLat, parsedLon]);
        await fetchPlaces(parsedLat, parsedLon);
      }
    } catch (error) {
      console.error("Error fetching location:", error);
    }
    setLoading(false);
  };

  const fetchPlaces = async (lat, lon) => {
    const query = `
      [out:json];
      node["amenity"="pharmacy"](around:2000,${lat},${lon});
      out body;`;

    try {
      const res = await axios.post("https://overpass-api.de/api/interpreter", query, {
        headers: { "Content-Type": "text/plain" },
      });
      const pharmacies = res.data.elements.filter(p => p.tags && p.tags.name);
      setPlaces(pharmacies);
    } catch (error) {
      console.error("Error fetching pharmacies:", error);
    }
  };

  const MapClickHandler = () => {
    useMapEvent("click", async (e) => {
      const { lat, lng } = e.latlng;
      setLoading(true);
      setCoords([lat, lng]);
      await fetchPlaces(lat, lng);
      setLoading(false);
    });
    return null;
  };

  const useCurrentLocation = async () => {
    if (userLocation) {
      setLoading(true);
      setCoords(userLocation);
      await fetchPlaces(userLocation[0], userLocation[1]);
      setLoading(false);
    }
  };

  const formatAddress = (tags) => {
    const parts = [
      tags["addr:housenumber"],
      tags["addr:street"],
      tags["addr:postcode"],
      tags["addr:city"],
      tags["addr:state"],
      tags["addr:country"],
    ];
    return parts.filter(Boolean).join(", ");
  };

  const toggleFavorite = (id) => {
    if (favorites.includes(id)) {
      setFavorites(favorites.filter(favId => favId !== id));
    } else {
      setFavorites([...favorites, id]);
    }
  };

  return (
    <div className="medical-app">
      <header className="header">
        <h1 className="app-title">Medical Store Finder</h1>
        <p className="app-subtitle">Find medical stores near you</p>
        <div className="search-container">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search for a location (e.g. Mumbai)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && fetchLocation()}
            />
            <button onClick={fetchLocation} disabled={loading}>
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
          <button className="current-location-btn" onClick={useCurrentLocation}>
            <MdPlace /> Use My Location
          </button>
        </div>
      </header>

      <main className="main-content">
        {coords && (
          <>
            <div className="map-container">
              <MapContainer center={coords} zoom={15} className="map">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapClickHandler />
                <Marker position={coords}>
                  <Popup>Your Selected Location</Popup>
                </Marker>
                {places.map((place) => (
                  <Marker key={place.id} position={[place.lat, place.lon]}>
                    <Popup>
                      <strong>{place.tags.name}</strong>
                      <br />
                      <FaMapMarkerAlt /> {formatAddress(place.tags)}
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            <div className="place-list">
              <h2>{places.length} Medical Stores Found</h2>
              <div className="places-grid">
                {places.map((place) => (
                  <motion.div key={place.id} className="place-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="card-header">
                      <h3>{place.tags.name}</h3>
                      <button onClick={() => toggleFavorite(place.id)}>
                        {favorites.includes(place.id) ? <FaHeart /> : <FaRegHeart />}
                      </button>
                    </div>
                    <p><FaMapMarkerAlt /> {formatAddress(place.tags)}</p>
                    {place.tags.phone && <p><FaPhone /> {place.tags.phone}</p>}
                    {place.tags.website && (
                      <p><FaGlobe /> <a href={place.tags.website} target="_blank" rel="noopener noreferrer">Visit Site</a></p>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </>
        )}

        {!coords && (
          <div className="welcome">
            <h2>Welcome to Medical Store Finder</h2>
            <p>Search a location or use your current location to find nearby pharmacies.</p>
            <button className="current-location-btn" onClick={useCurrentLocation}>
              <MdPlace /> Find Medical Stores Near Me
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Medical;
