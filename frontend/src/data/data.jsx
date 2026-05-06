/* datan lisäys välilehti */

import { useState } from "react";
import "./data.css";

function Data() {
  const [file, setFile] = useState(null);

  /*
  const [message, setMessage] = useState("");
  const [data, setData] = useState([]);

  const [location, setLocation] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [samples, setSamples] = useState("");
  const [employees, setEmployees] = useState("");

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
  */

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

  /*
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
  */

  return (
    <div className="data-page">


      <div className="data-content">
        <div className="upload-card">



          <div className="upload-dropzone">
            <div className="upload-plus">+</div>

            <h3>Lisää tiedosto</h3>

            <p>Raahaa Excel-tiedosto tähän</p>
            <span>tai valitse tiedosto koneelta</span>

            <label className="upload-button">
              Lisää tiedosto
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setFile(e.target.files[0])}
              />
            </label>

            {file && (
              <div className="selected-file">
                Valittu tiedosto: {file.name}
              </div>
            )}

            <div className="supported-formats">
              Tuetut muodot: .xlsx, .xls
            </div>
          </div>

          <button className="train-button" onClick={handleFileUpload}>
            Kouluta malli uudestaan
          </button>
        </div>
      </div>
    </div>
  );
}

export default Data;