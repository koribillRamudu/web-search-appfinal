import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./components/Home";
import Food from "./components/Food";
import Medical from "./components/Medical";
import Grocery from "./components/Grocery";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/food" element={<Food />} />
        <Route path="/medical" element={<Medical />} />
        <Route path="/grocery" element={<Grocery />} />
      </Routes>
    </Router>
  );
}

export default App;