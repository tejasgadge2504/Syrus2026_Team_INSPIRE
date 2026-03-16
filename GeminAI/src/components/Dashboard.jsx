import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState({ email: "", name: "" });

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

  return (
    <div className="auth-page">
      <div className="glass-card">
        <h1>Welcome, {user.name || "User"}</h1>
        <p className="muted">You are logged in as {user.email}</p>
        <div className="dashboard-box">
          <p>Your session is active. Carry on building your jewelry assistant.</p>
          <button className="primary-btn" onClick={logout}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
