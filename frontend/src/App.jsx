import { useEffect, useState } from "react";
import './App.css'

function App() {
  const [message, setMessage] = useState("");
  const [data, setData] = useState([]);

  // Tiedoston lisäys -jutut
  const [file, setFile] = useState(null);
  // Testaus?
  const [location, setLocation] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [samples, setSamples] = useState("");
  const [employees, setEmployees] = useState("");
  /*
  Nää otetaan ehkä pois
  */
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/hello/")
      .then((res) => res.json())
      .then((data) => setMessage(data.message));
  }, []);
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/data/")
      .then((res) => res.json())
      .then((data) => setData(data));
  }, []);

  const handleFileUpload = () => {
  if (!file) {
    console.log("No file selected");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("source", "test-upload");

  fetch("http://127.0.0.1:8000/api/upload/", {
    method: "POST",
    body: formData,
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("Response:", data);
    });
};
// Testaus
const handleSubmit = () => {
  fetch("http://127.0.0.1:8000/api/data/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      location: location,
      timestamp: timestamp,
      samples_taken: Number(samples),
      employees_used: Number(employees),
    }),
  })
    .then((res) => res.json())
    .then((newData) => {
      setData([newData, ...data]);
    });
};
/*
Nämäkin vastaavasti ehkä poies
*/
  return (
    <div>
      <h4>React + DRF</h4>
      <h1>FlowPredictor</h1>
      <p>{message}</p>
      <h2>Upload File</h2>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <button onClick={handleFileUpload}>
      Upload File
      </button>

      <h2>Sample data</h2>
      <table border="1">
        <thead>
          <tr>
            <th>Location</th>
            <th>Timestamp</th>
            <th>Samples</th>
            <th>Employees</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id}>
              <td>{row.location}</td>
              <td>{row.timestamp}</td>
              <td>{row.samples_taken}</td>
              <td>{row.employees_used}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Add Sample Data</h2>

      <input
        placeholder="Location"
        onChange={(e) => setLocation(e.target.value)}
      />

      <input
        placeholder="Timestamp (YYYY-MM-DDTHH:MM:SS)"
        onChange={(e) => setTimestamp(e.target.value)}
      />

      <input
        placeholder="Samples"
        onChange={(e) => setSamples(e.target.value)}
      />

      <input
        placeholder="Employees"
        onChange={(e) => setEmployees(e.target.value)}
      />

      <button onClick={handleSubmit}>Submit</button>
    </div>
  ); // Noi viimeset inputit ehkä lähtee.
}

export default App;