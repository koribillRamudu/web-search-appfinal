import React from 'react';
import MapView from './MapView';

const Grocery = () => (
  <div className="page">
    <h2>Nearby Grocery Stores</h2>
    <MapView category="grocery" />
  </div>
);

export default Grocery;