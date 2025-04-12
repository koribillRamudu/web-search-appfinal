import React from "react";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();
  const categories = [
    { name: "Food", path: "/food", image: "https://via.placeholder.com/200?text=Food" },
    { name: "Medical", path: "/medical", image: "https://via.placeholder.com/200?text=Medical" },
    { name: "Grocery", path: "/grocery", image: "https://via.placeholder.com/200?text=Grocery" },
  ];

  return (
    <div style={{ textAlign: "center", marginTop: 50 }}>
      <h1>Select a Category</h1>
      <div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
        {categories.map((cat) => (
          <div key={cat.name} onClick={() => navigate(cat.path)} style={{ cursor: "pointer" }}>
            <img src={cat.image} alt={cat.name} width={200} height={200} />
            <h3>{cat.name}</h3>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;