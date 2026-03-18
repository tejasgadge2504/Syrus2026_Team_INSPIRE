import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/login";
import Register from "./components/register";
import Dashboard from "./components/Dashboard";
import Editor from "./components/Editor";
import ARTryOn from "./components/Artryon";
import "./index.css";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"               element={<Navigate to="/login" />} />
        <Route path="/login"          element={<Login />} />
        <Route path="/register"       element={<Register />} />
        <Route path="/dashboard"      element={<Dashboard />} />
        <Route path="/designs/:id"    element={<Editor />} />
        <Route path="/designs/:id/ar" element={<ARTryOn />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;