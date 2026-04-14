import React, { useState, useEffect } from "react";
import axios from "axios";

export default function Doctor() {
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = () => {
    axios.get("http://127.0.0.1:5000/doctors").then(res => setDoctors(res.data));
  };

  const updateStatus = (id, status) => {
    axios.post(`http://127.0.0.1:5000/doctor/${id}/status`, { status })
      .then(() => fetchDoctors());
  };

  return (
    <div>
      <h2>Doctor Dashboard</h2>
      <ul>
        {doctors.map(d => (
          <li key={d[0]}>
            {d[1]} — Status: {d[2]} 
            <button onClick={() => updateStatus(d[0], "Available")}>Available</button>
            <button onClick={() => updateStatus(d[0], "Busy")}>Busy</button>
            <button onClick={() => updateStatus(d[0], "Break")}>Break</button>
          </li>
        ))}
      </ul>
    </div>
  );
}