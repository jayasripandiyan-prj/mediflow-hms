import React, { useState, useEffect } from "react";
import axios from "axios";

export default function Patient() {
  const [name, setName] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [token, setToken] = useState("");
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    axios.get("http://127.0.0.1:5000/doctors").then(res => setDoctors(res.data));
  }, []);

  const register = () => {
    if (!name || !selectedDoctor) return alert("Enter name and select doctor");
    axios
      .post("http://127.0.0.1:5000/patient", { name, doctor_id: selectedDoctor })
      .then(res => {
        setToken(res.data.token);
        fetchQueue(selectedDoctor);
      });
  };

  const fetchQueue = (docId) => {
    axios.get(`http://127.0.0.1:5000/queue/${docId}`).then(res => setQueue(res.data));
  };

  return (
    <div>
      <h2>Patient Registration</h2>
      <input placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} />
      <select onChange={e => setSelectedDoctor(e.target.value)}>
        <option value="">Select Doctor</option>
        {doctors.map(d => (
          <option key={d[0]} value={d[0]}>{d[1]}</option>
        ))}
      </select>
      <button onClick={register}>Register</button>

      {token && <p>Your token: <b>{token}</b></p>}

      {queue.length > 0 && (
        <div>
          <h3>Queue Status</h3>
          <ul>
            {queue.map(p => (
              <li key={p.id}>
                {p.position}. {p.name} — Token {p.token} — Wait {p.estimated_wait} mins
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}