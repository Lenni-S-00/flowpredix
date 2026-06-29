import { useEffect, useState } from "react";
import Sidebar from "../sidebar/sidebar";
import "./data.css";
import DataFilter from "./dataFilter";
import API from "../api";

function Data() {
  const [message, setMessage] = useState("");
  const [data, setData] = useState([]);
  const [file, setFile] = useState(null);

  const [location, setLocation] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [samples, setSamples] = useState("");
  const [employees, setEmployees] = useState("");

  useEffect(() => {
    API.get("hello/")
      .then((res) => setMessage(res.data.message))
      .catch((err) => console.error(err));
  }, []);

  const handleFileUpload = () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("source", "test-upload");

    API.post("upload/", formData)
      .then((res) => {
        console.log("Response:", res.data);
      })
      .catch((err) => {
        console.error(err);
      });
    }

  const handleSubmit = () => {
    API.post("data/", {
      location,
      timestamp,
      samples_taken: Number(samples),
      employees_used: Number(employees),
    })
      .then((res) => {
        const newData = res.data;
        setData([newData, ...data]);

        setLocation("");
        setTimestamp("");
        setSamples("");
        setEmployees("");
      }).catch((err) => {
        console.error(err);
    });
  };
  const [whoami, setWhoami] = useState(null);
  // Testataan endpointteja
  // Toimii ainakin näin.
  const handleTest = () => {
    //API.get("hello/").then((res) => {console.log(res);}).catch((err) => {console.error(err);});
    API.get("whoami")
    .then((res) => {
    setWhoami(res.data);
  });
    API.get("data/")
      .then((res) => {
        console.log(res.data);
        setData(res.data);
      })
      .catch((err) => {
        console.error(err);
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
                  placeholder="Aikaleima"
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

                <button onClick={handleSubmit}>
                  Lisää data
                </button>
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

                {file && (
                  <span className="selected-file">
                    {file.name}
                  </span>
                )}

                <button
                  className="upload-submit"
                  onClick={handleFileUpload}
                >
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
        <button onClick={handleTest}>Testinappi - näytä tiedot</button>
        <div>
        {whoami && (
          <>
          <p>User: {whoami.username}</p>
          <p>Organization: {whoami.organization}</p>
        </>
        )}
        </div>
      </main>
    </>
  );
}

export default Data;