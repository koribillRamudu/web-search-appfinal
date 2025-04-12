import React from 'react';
import { FaImage, FaInfoCircle, FaExclamationTriangle } from 'react-icons/fa';

const RestaurantImageDebugger = ({ restaurant, imageUrl, loading, error }) => {
  return (
    <div className="image-debugger">
      <div className="debug-header">
        <h3>Image Debug: {restaurant.name}</h3>
      </div>
      
      <div className="debug-content">
        <div className="image-preview">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading image...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <FaExclamationTriangle />
              <p>Failed to load image</p>
            </div>
          ) : (
            <>
              <img 
                src={imageUrl} 
                alt={`Preview for ${restaurant.name}`}
                onError={(e) => {
                  console.error(`Image failed to load: ${imageUrl}`);
                  e.target.src = 'https://via.placeholder.com/600x400?text=Image+Failed+To+Load';
                }}
              />
              <div className="image-meta">
                <FaInfoCircle /> Image URL: {imageUrl}
              </div>
            </>
          )}
        </div>

        <div className="debug-info">
          <h4>Debug Information:</h4>
          <pre>
            {JSON.stringify({
              restaurantName: restaurant.name,
              imageUrl,
              loading,
              error,
              timestamp: new Date().toISOString()
            }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default RestaurantImageDebugger;
