import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Signup from "./components/signup";   // ✅ will create next
import Dashboard from "./components/Dashboard";
import History from "./components/history"; // ✅ future

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/history" element={<History />} />

      </Routes>
    </Router>
  );
}

export default App;
