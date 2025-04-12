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
import { 
  FaStar, 
  FaMapMarkerAlt, 
  FaPhone, 
  FaGlobe, 
  FaUtensils, 
  FaSearch,
  FaWallet,
  FaRegClock,
  FaHeart,
  FaRegHeart
} from "react-icons/fa";
import { 
  MdDeliveryDining, 
  MdLocalOffer, 
  MdPlace,
  MdFilterList 
} from "react-icons/md";
import { GiMeal, GiMoneyStack } from "react-icons/gi";
import { motion, AnimatePresence } from "framer-motion";

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const Food = () => {
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState(null);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showList, setShowList] = useState(true);
  const [searchRadius, setSearchRadius] = useState(2000);
  const [selectedCuisine, setSelectedCuisine] = useState("all");
  const [cuisines, setCuisines] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [priceFilter, setPriceFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [restaurantImages, setRestaurantImages] = useState({});
  const [imageLoading, setImageLoading] = useState({});

  const FOURSQUARE_API_KEY = "fsq3stg/Aj+1DWpLW1hxRAtJJGdO+n3/Vdu5dhvJvrooI78=";


  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
        },
        (error) => {
          console.error("Error getting user location:", error);
        }
      );
    }
  }, []);

 
  const fetchRestaurantImages = async (restaurantNames, lat, lng) => {
    if (!lat || !lng) {
      console.error("Latitude or Longitude is undefined. Cannot fetch images.");
      return;
    }
  
    const images = {};
    const loadingStates = {};
  
    restaurantNames.forEach(name => {
      loadingStates[name] = true;
    });
    setImageLoading(loadingStates);
  
    try {
      const foursquareRes = await axios.get(
        `https://api.foursquare.com/v3/places/search`,
        {
          params: {
            query: 'restaurant',
            ll: `${lat},${lng}`,
            radius: searchRadius,
            limit: 50,
            fields: 'name,photos'
          },
          headers: {
            'Authorization': FOURSQUARE_API_KEY,
            'Accept': 'application/json'
          }
        }
      );
      
      const venuePhotoMap = {};
      foursquareRes.data.results.forEach(venue => {
        if (venue.name && venue.photos && venue.photos.length > 0) {
          const photo = venue.photos[0];
          const photoUrl = `${photo.prefix}600x400${photo.suffix}`;
          venuePhotoMap[venue.name.toLowerCase()] = photoUrl;
        }
      });
  
      for (const name of restaurantNames) {
        const lowerName = name.toLowerCase();
        images[name] = venuePhotoMap[lowerName] || 'https://via.placeholder.com/600x400?text=No+Image+Available';
        loadingStates[name] = false;
      }
  
    } catch (error) {
      console.error("Foursquare API error:", error);
      restaurantNames.forEach(name => {
        images[name] = 'https://via.placeholder.com/600x400?text=Image+Not+Loaded';
        loadingStates[name] = false;
      });
    }
  
    setRestaurantImages(images);
    setImageLoading(loadingStates);
  };

  
  const fetchLocation = async () => {
    if (!location.trim()) return;
    
    setLoading(true);
    setShowList(true);
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
      node["amenity"="restaurant"](around:${searchRadius},${lat},${lon});
      out body;`;
    try {
      const res = await axios.post("https://overpass-api.de/api/interpreter", query, {
        headers: { "Content-Type": "text/plain" },
      });

      const restaurants = res.data.elements.filter(place => place.tags && place.tags.name);
      const restaurantNames = restaurants.map(r => r.tags.name);
      
      // Get images from Zomato/Unsplash
      await fetchRestaurantImages(restaurantNames);
      
      // Extract unique cuisines
      const allCuisines = restaurants.reduce((acc, place) => {
        if (place.tags.cuisine) {
          const placeCuisines = place.tags.cuisine.split(';').map(c => c.trim());
          placeCuisines.forEach(c => {
            if (!acc.includes(c)) acc.push(c);
          });
        }
        return acc;
      }, []);
      
      setCuisines(allCuisines);
      setPlaces(restaurants);
    } catch (error) {
      console.error("Error fetching places:", error);
    }
  };

  const MapClickHandler = () => {
    useMapEvent("click", async (e) => {
      const { lat, lng } = e.latlng;
      setLoading(true);
      setCoords([lat, lng]);
      setPlaces([]);
      await fetchPlaces(lat, lng);
      setLoading(false);
    });
    return null;
  };

  const toggleFavorite = (id) => {
    if (favorites.includes(id)) {
      setFavorites(favorites.filter(favId => favId !== id));
    } else {
      setFavorites([...favorites, id]);
    }
  };

  const filteredPlaces = places
    .filter(place => 
      selectedCuisine === "all" || 
      (place.tags.cuisine && place.tags.cuisine.toLowerCase().includes(selectedCuisine.toLowerCase()))
    )
    .filter(place => {
      if (priceFilter === "all") return true;
      // Mock price range since OSM doesn't provide this
      const mockPriceRange = Math.floor(Math.random() * 4) + 1;
      switch(priceFilter) {
        case "1": return mockPriceRange <= 2;
        case "2": return mockPriceRange === 3;
        case "3": return mockPriceRange >= 4;
        default: return true;
      }
    });

  const useCurrentLocation = async () => {
    if (userLocation) {
      setLoading(true);
      setCoords(userLocation);
      await fetchPlaces(userLocation[0], userLocation[1]);
      setLoading(false);
    }
  };

  const getPriceIndicator = (priceRange) => {
    return "$".repeat(priceRange || 2);
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

  return (
    <div className="food-app">
      <header className="header">
        <div className="header-content">
          <h1 className="app-title">Food Explorer</h1>
          <p className="app-subtitle">Discover the best restaurants near you</p>
          
          <div className="search-container">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search for a location (e.g. Manhattan, NYC)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchLocation()}
              />
              <button onClick={fetchLocation} disabled={loading}>
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
            <button className="current-location-btn" onClick={useCurrentLocation}>
              <MdPlace /> Use My Location
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {coords && (
          <>
            <div className="map-container">
              <MapContainer 
                center={coords} 
                zoom={15} 
                className="map"
                whenCreated={(map) => map.invalidateSize()}
              >
                <TileLayer 
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <MapClickHandler />
                <Marker position={coords}>
                  <Popup>Your Selected Location</Popup>
                </Marker>
                {filteredPlaces.map((place) => (
                  <Marker 
                    key={place.id} 
                    position={[place.lat, place.lon]}
                  >
                    <Popup>
                      <strong>{place.tags.name}</strong>
                      <br />
                      {place.tags.cuisine && <><FaUtensils /> {place.tags.cuisine}<br /></>}
                      <FaMapMarkerAlt /> {formatAddress(place.tags)}
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            <div className="restaurant-list-container">
              <div className="list-header">
                <h2 className="section-title">
                  {filteredPlaces.length} Restaurants Found
                </h2>
                <button 
                  className="filter-toggle"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <MdFilterList /> Filters
                </button>
              </div>

              <AnimatePresence>
                {showFilters && (
                  <motion.div 
                    className="filters-panel"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="filter-group">
                      <label>Cuisine:</label>
                      <select 
                        value={selectedCuisine} 
                        onChange={(e) => setSelectedCuisine(e.target.value)}
                      >
                        <option value="all">All Cuisines</option>
                        {cuisines.map(cuisine => (
                          <option key={cuisine} value={cuisine}>{cuisine}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="filter-group">
                      <label>Price:</label>
                      <select 
                        value={priceFilter} 
                        onChange={(e) => setPriceFilter(e.target.value)}
                      >
                        <option value="all">All Prices</option>
                        <option value="1">$ - $$</option>
                        <option value="2">$$$</option>
                        <option value="3">$$$$</option>
                      </select>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="restaurants-grid">
                {filteredPlaces.length > 0 ? (
                  filteredPlaces.map((place) => (
                    <motion.div 
                      key={place.id} 
                      className="restaurant-card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="restaurant-image">
                        <img
                          src={restaurantImages[place.tags.name] || `https://source.unsplash.com/600x400/?restaurant,${encodeURIComponent(place.tags.name)}`}
                          alt={place.tags.name}
                          onError={(e) => {
                            e.target.src = `https://source.unsplash.com/600x400/?restaurant,food`;
                          }}
                        />
                        <button 
                          className="favorite-btn"
                          onClick={() => toggleFavorite(place.id)}
                        >
                          {favorites.includes(place.id) ? (
                            <FaHeart className="favorite-icon" />
                          ) : (
                            <FaRegHeart className="favorite-icon" />
                          )}
                        </button>
                        <div className="rating-badge">
                          <FaStar className="star-icon" />
                          <span>{(Math.random() * 1 + 4).toFixed(1)}</span>
                        </div>
                        {Math.random() > 0.7 && (
                          <div className="offer-badge">
                            <MdLocalOffer className="offer-icon" />
                            <span>{Math.random() > 0.5 ? "20% OFF" : "Free Delivery"}</span>
                          </div>
                        )}
                      </div>
                      <div className="restaurant-details">
                        <h3 className="restaurant-name">
                          {place.tags.name}
                        </h3>
                        <div className="cuisine-price">
                          <span className="cuisine">
                            <FaUtensils /> {place.tags.cuisine || "Multi-cuisine"}
                          </span>
                          <span className="price">
                            <GiMoneyStack /> {getPriceIndicator(Math.floor(Math.random() * 4) + 1)}
                          </span>
                        </div>
                        <div className="restaurant-info">
                          <div className="info-item">
                            <FaMapMarkerAlt /> {formatAddress(place.tags)}
                          </div>
                          <div className="info-item">
                            <FaRegClock /> {Math.random() > 0.5 ? "Open Now" : "Closed"}
                          </div>
                          <div className="info-item">
                            <FaWallet /> Avg. ${Math.floor(Math.random() * 50) + 20} for two
                          </div>
                          {place.tags.phone && (
                            <div className="info-item">
                              <FaPhone /> {place.tags.phone}
                            </div>
                          )}
                          {place.tags.website && (
                            <div className="info-item">
                              <FaGlobe /> 
                              <a 
                                href={place.tags.website.startsWith('http') ? place.tags.website : `https://${place.tags.website}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                              >
                                Visit Website
                              </a>
                            </div>
                          )}
                        </div>
                        <div className="action-buttons">
                          <button className="menu-btn">
                            <GiMeal /> View Menu
                          </button>
                          <button className="delivery-btn">
                            <MdDeliveryDining /> Order Now
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="no-results">
                    <p>No restaurants found matching your criteria. Try adjusting filters.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {!coords && (
          <div className="welcome-screen">
            <div className="welcome-content">
              <motion.h2
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                Find Amazing Restaurants Near You
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Search by location or click on the map to discover the best dining options
              </motion.p>
              <div className="welcome-features">
                <motion.div 
                  className="feature"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <FaSearch size={28} />
                  <h3>Search Locations</h3>
                  <p>Find restaurants in any city or neighborhood</p>
                </motion.div>
                <motion.div 
                  className="feature"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <MdPlace size={28} />
                  <h3>Click on Map</h3>
                  <p>Select any location to see nearby options</p>
                </motion.div>
                <motion.div 
                  className="feature"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <MdDeliveryDining size={28} />
                  <h3>Order Food</h3>
                  <p>Get delivery or reserve a table</p>
                </motion.div>
              </div>
              <motion.button 
                className="current-location-btn large" 
                onClick={useCurrentLocation}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <MdPlace /> Find Restaurants Near Me
              </motion.button>
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>© {new Date().getFullYear()} Food Explorer App</p>
        <p>Data from OpenStreetMap | Images from Zomato/Unsplash</p>
      </footer>

      <style jsx>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: 'Poppins', sans-serif;
        }

        .food-app {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background-color: #f8f9fa;
        }

        .header {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 2rem 1.5rem;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
        }

        .app-title {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
          font-weight: 700;
        }

        .app-subtitle {
          font-size: 1.2rem;
          opacity: 0.9;
          margin-bottom: 2rem;
          font-weight: 300;
        }

        .search-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.2rem;
          max-width: 800px;
          margin: 0 auto;
        }

        .search-box {
          display: flex;
          width: 100%;
          background: white;
          border-radius: 50px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        .search-box:hover {
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
        }

        .search-icon {
          padding: 1rem 1.2rem;
          color: #777;
          font-size: 1.2rem;
        }

        .search-box input {
          flex: 1;
          padding: 1rem 0;
          border: none;
          outline: none;
          font-size: 1rem;
          color: #333;
        }

        .search-box button {
          padding: 0 2rem;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .search-box button:hover {
          background: linear-gradient(135deg, #764ba2, #667eea);
        }

        .search-box button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .current-location-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.8rem 1.5rem;
          background-color: white;
          color: #667eea;
          border: none;
          border-radius: 50px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .current-location-btn:hover {
          background-color: #f0f0f0;
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
        }

        .current-location-btn.large {
          padding: 1rem 2.5rem;
          font-size: 1.1rem;
          margin-top: 2rem;
        }

        .main-content {
          flex: 1;
          padding: 2rem 1.5rem;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }

        .map-container {
          height: 450px;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
          margin-bottom: 2rem;
        }

        .map {
          height: 100%;
          width: 100%;
        }

        .restaurant-list-container {
          background-color: white;
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
        }

        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .section-title {
          font-size: 1.8rem;
          color: #333;
          font-weight: 600;
        }

        .filter-toggle {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.2rem;
          background-color: #667eea;
          color: white;
          border: none;
          border-radius: 50px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .filter-toggle:hover {
          background-color: #764ba2;
          transform: translateY(-2px);
        }

        .filters-panel {
          background-color: #f8f9fa;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          display: flex;
          flex-wrap: wrap;
          gap: 1.5rem;
          overflow: hidden;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 0.8rem;
        }

        .filter-group label {
          font-weight: 500;
          color: #555;
        }

        .filter-group select {
          padding: 0.6rem 1rem;
          border-radius: 8px;
          border: 1px solid #ddd;
          background-color: white;
          cursor: pointer;
          font-size: 0.9rem;
          min-width: 150px;
          transition: all 0.2s ease;
        }

        .filter-group select:hover {
          border-color: #667eea;
        }

        .restaurants-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 2rem;
        }

        .restaurant-card {
          background-color: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
        }

        .restaurant-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
        }

        .restaurant-image {
          position: relative;
          height: 200px;
          overflow: hidden;
        }

        .restaurant-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }

        .restaurant-card:hover .restaurant-image img {
          transform: scale(1.05);
        }

        .favorite-btn {
          position: absolute;
          top: 15px;
          right: 15px;
          background: rgba(255, 255, 255, 0.9);
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 2;
          transition: all 0.3s ease;
        }

        .favorite-btn:hover {
          transform: scale(1.1);
        }

        .favorite-icon {
          color: #ff4757;
          font-size: 1.2rem;
        }

        .rating-badge {
          position: absolute;
          bottom: 15px;
          left: 15px;
          background-color: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 0.3rem 0.8rem;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-weight: 600;
          font-size: 0.9rem;
          z-index: 2;
        }

        .star-icon {
          color: #ffd700;
          font-size: 0.8rem;
        }

        .offer-badge {
          position: absolute;
          bottom: 15px;
          right: 15px;
          background-color: #667eea;
          color: white;
          padding: 0.3rem 0.8rem;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-weight: 600;
          font-size: 0.9rem;
          z-index: 2;
        }

        .restaurant-details {
          padding: 1.5rem;
        }

        .restaurant-name {
          font-size: 1.3rem;
          margin-bottom: 0.8rem;
          color: #333;
          font-weight: 600;
        }

        .cuisine-price {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1.2rem;
          color: #666;
          font-size: 0.9rem;
        }

        .cuisine, .price {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .price {
          color: #667eea;
          font-weight: 500;
        }

        .restaurant-info {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
          font-size: 0.9rem;
          color: #555;
          margin-bottom: 1.5rem;
        }

        .info-item {
          display: flex;
          align-items: flex-start;
          gap: 0.8rem;
        }

        .info-item svg {
          flex-shrink: 0;
          color: #667eea;
          margin-top: 2px;
        }

        .info-item a {
          color: #764ba2;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .info-item a:hover {
          text-decoration: underline;
        }

        .action-buttons {
          display: flex;
          gap: 1rem;
        }

        .menu-btn, .delivery-btn {
          flex: 1;
          padding: 0.8rem;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .menu-btn {
          background-color: #f0f0f0;
          color: #333;
        }

        .menu-btn:hover {
          background-color: #e0e0e0;
        }

        .delivery-btn {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
        }

        .delivery-btn:hover {
          background: linear-gradient(135deg, #764ba2, #667eea);
          transform: translateY(-2px);
        }

        .no-results {
          text-align: center;
          padding: 3rem;
          grid-column: 1 / -1;
          color: #666;
          font-size: 1.1rem;
        }

        .welcome-screen {
          display: flex;
          justify-content: center;
          align-items: center;
          flex: 1;
          padding: 2rem;
        }

        .welcome-content {
          text-align: center;
          max-width: 800px;
          background-color: white;
          padding: 3rem;
          border-radius: 16px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
        }

        .welcome-content h2 {
          font-size: 2.2rem;
          margin-bottom: 1.5rem;
          color: #333;
          font-weight: 600;
        }

        .welcome-content p {
          font-size: 1.2rem;
          color: #666;
          margin-bottom: 3rem;
        }

        .welcome-features {
          display: flex;
          justify-content: center;
          gap: 2.5rem;
          margin-bottom: 3rem;
          flex-wrap: wrap;
        }

        .feature {
          flex: 1;
          min-width: 220px;
          padding: 2rem 1.5rem;
          background-color: white;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
        }

        .feature:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
        }

        .feature svg {
          color: #667eea;
          margin-bottom: 1rem;
        }

        .feature h3 {
          font-size: 1.2rem;
          margin-bottom: 0.8rem;
          color: #333;
        }

        .feature p {
          font-size: 0.95rem;
          color: #777;
          margin: 0;
        }

        .footer {
          text-align: center;
          padding: 1.5rem;
          background-color: #333;
          color: white;
          font-size: 0.9rem;
        }

        .footer p {
          margin: 0.3rem 0;
        }

        @media (max-width: 768px) {
          .header {
            padding: 1.5rem 1rem;
          }

          .app-title {
            font-size: 2rem;
          }

          .app-subtitle {
            font-size: 1rem;
          }

          .search-box {
            flex-direction: column;
            border-radius: 12px;
          }

          .search-box input {
            width: 100%;
            padding: 1rem;
          }

          .search-box button {
            width: 100%;
            padding: 1rem;
            border-radius: 0 0 12px 12px;
          }

          .restaurants-grid {
            grid-template-columns: 1fr;
          }

          .welcome-features {
            flex-direction: column;
            align-items: center;
            gap: 1.5rem;
          }

          .feature {
            width: 100%;
            max-width: 300px;
          }

          .action-buttons {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default Food;


