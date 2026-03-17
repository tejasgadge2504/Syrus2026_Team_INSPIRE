
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import ImageUploadModal from "./ImageUploadModal";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState({ email: "", name: "" });
  const [showModal, setShowModal] = useState(false);
  const [newDesignId, setNewDesignId] = useState(null);
  // designAssets is now managed in localStorage

  useEffect(() => {
    const token = Cookies.get("token");
    const userJson = Cookies.get("user");
    if (!token) {
      navigate("/login");
      return;
    }
    if (userJson) {
      try {
        setUser(JSON.parse(userJson));
      } catch {
        setUser({ email: "", name: "" });
      }
    }
  }, [navigate]);

  const logout = () => {
    Cookies.remove("token");
    Cookies.remove("user");
    navigate("/login");
  };

  const handleCreateNewDesign = async () => {
    // Call backend to create new design, then show modal
    try {
      const token = Cookies.get("token");
      const res = await fetch("http://localhost:5000/designs/new", {
        method: "POST",
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
        },
      });
      const data = await res.json();
      if (res.ok && data.id) {
        setNewDesignId(data.id);
        // Store design id in localStorage
        localStorage.setItem("currentDesignId", data.id);
        setShowModal(true);
      } else {
        alert("Failed to create design");
      }
    } catch (err) {
      alert("Error creating design");
    }
  };

  // Handle image upload and detection
  const handleImageUpload = async (file, detectedJson, modelJson = null) => {
    if (!newDesignId) return;
    // Store detectedJson (level1) in localStorage
    localStorage.setItem(`design_${newDesignId}_level1`, JSON.stringify(detectedJson));
    // If modelJson (level2) is provided, store it
    if (modelJson) {
      localStorage.setItem(`design_${newDesignId}_level2`, JSON.stringify(modelJson));
      // Navigate to /designs/:id for rendering
      navigate(`/designs/${newDesignId}`);
    }
    setShowModal(false);
    alert("Image and JSON saved for design " + newDesignId);
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(120deg, #fffbe6 0%, #f7e9c4 100%)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2rem 2.5rem 0 2.5rem" }}>
        <div style={{ fontSize: "2.1rem", fontWeight: 700, color: "#bfa14a" }}>
          Hi, {user.name || "User"}
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button className="primary-btn" style={{ minWidth: 160, fontSize: '1rem', padding: '0.6rem 1rem' }} onClick={handleCreateNewDesign}>
            Create New Design
          </button>
          <button className="primary-btn" style={{ minWidth: 100, background: "#fff3cd", color: "#bfa14a" }} onClick={logout}>
            Logout
          </button>
        </div>
      </div>
      <ImageUploadModal open={showModal} onClose={() => setShowModal(false)} onUpload={handleImageUpload} designId={newDesignId} />
      {/* Optionally, show a list of created designs and their assets here */}
    </div>
  );
}
