import { useEffect, useState } from "react";
import Sidebar from "../sidebar/sidebar";
import "./data.css";
import DataFilter from "./dataFilter";
import API from "../api";

function Data() {
  const [data, setData] = useState([]);
  const [file, setFile] = useState(null);
  const [whoami, setWhoami] = useState(null);

  const [location, setLocation] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [samples, setSamples] = useState("");
  const [employees, setEmployees] = useState("");

  const fetchData = () => {
    API.get("data/", {
      params: {
        page: 1,
        page_size: 100,
      },
    })
    .then((res) => {
      setData(res.data.results);
    });
  };

  useEffect(() => {
    fetchData();

    API.get("whoami")
      .then((res) => setWhoami(res.data))
      .catch((err) => {
        console.error("Whoami epäonnistui:", err.response?.data || err);
      });
  }, []);

  const handleFileUpload = () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("source", "test-upload");

    API.post("upload/", formData)
      .then((res) => {
        console.log("Upload onnistui:", res.data);
        setFile(null);
        fetchData();
      })
      .catch((err) => {
        console.error("Upload epäonnistui:", err.response?.data || err);
      });
  };

  const handleSubmit = () => {
    API.post("data/", {
      location,
      timestamp,
      samples_taken: Number(samples),
      employees_used: Number(employees),
    })
      .then(() => {
        setLocation("");
        setTimestamp("");
        setSamples("");
        setEmployees("");
        fetchData();
      })
      .catch((err) => {
        console.error("Manuaalinen lisäys epäonnistui:", err.response?.data || err);
      });
  };

  return (
    <>
      <Sidebar title="Datan suodattimet">
        <DataFilter />
      </Sidebar>

      <main className="data-main">
        <section className="data-actions-card">
          <div className="data-actions-grid">
            <div className="data-panel">
              <h2>Manuaalinen lisäys</h2>

              <p className="data-panel-text">
                Lisää yksittäinen havainto toimipisteelle.
              </p>

              <div className="manual-form">
                <input
                  value={location}
                  placeholder="Toimipiste"
                  onChange={(e) => setLocation(e.target.value)}
                />

                <input
                  value={timestamp}
                  placeholder="Aikaleima esim. 2026-06-30T19:45:32Z"
                  onChange={(e) => setTimestamp(e.target.value)}
                />

                <input
                  value={samples}
                  placeholder="Näytteet"
                  onChange={(e) => setSamples(e.target.value)}
                />

                <input
                  value={employees}
                  placeholder="Työntekijät"
                  onChange={(e) => setEmployees(e.target.value)}
                />

                <button onClick={handleSubmit}>Lisää data</button>
              </div>
            </div>

            <div className="data-panel">
              <h2>Tiedoston lisäys</h2>

              <p className="data-panel-text">
                Raahaa tiedosto tai valitse se koneelta.
              </p>

              <div className="upload-dropzone">
                <div className="upload-icon">+</div>

                <p>CSV, XLSX tai JSON</p>

                <label className="upload-button">
                  Valitse tiedosto
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files[0])}
                  />
                </label>

                {file && <span className="selected-file">{file.name}</span>}

                <button className="upload-submit" onClick={handleFileUpload}>
                  Lähetä tiedosto
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="data-table-card">
          <h2>Lisätty data</h2>

          <div className="data-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Toimipiste</th>
                  <th>Aikaleima</th>
                  <th>Näytteet</th>
                  <th>Työntekijät</th>
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
          </div>
        </section>

        <button onClick={fetchData}>Päivitä tiedot</button>

        {whoami && (
          <div>
            <p>User: {whoami.username}</p>
            <p>Organization: {whoami.organization}</p>
          </div>
        )}
      </main>
    </>
  );
}

export default Data;