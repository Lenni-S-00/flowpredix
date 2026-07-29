import {
  useEffect,
  useRef,
  useState,
} from "react";

import API from "../api";
import Sidebar from "../sidebar/sidebar";
import Calendar from "../sidebar/calendar";
import DataFilter from "./dataFilter";

import "../sidebar/calendar.css";
import "./data.css";

const LOCATIONS = Array.from(
  { length: 21 },
  (_, index) => `Lab${index + 1}`
);

const TIME_OPTIONS = Array.from(
  { length: 24 * 4 },
  (_, index) => {
    const totalMinutes = index * 15;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${String(hours).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")}`;
  }
);

const INITIAL_MANUAL_FORM = {
  location: "",
  time: "",
  samples: "",
  employees: "",
};

// Muotoilee päivämäärän backendin timestamp-arvoksi.
function createTimestamp(dateValue, timeValue) {
  if (!dateValue || !timeValue) {
    return "";
  }

  const date = new Date(dateValue);

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}T${timeValue}:00`;
}

// Poimii käyttäjälle näytettävän virheilmoituksen.
function getErrorMessage(error, fallbackMessage) {
  const responseData = error.response?.data;

  if (typeof responseData?.detail === "string") {
    return responseData.detail;
  }

  if (typeof responseData?.error === "string") {
    return responseData.error;
  }

  if (typeof responseData?.message === "string") {
    return responseData.message;
  }

  return fallbackMessage;
}

// Näyttää onnistumis-, varoitus- tai virheviestin.
function StatusMessage({ status }) {
  if (!status.message) {
    return null;
  }

  const icons = {
    success: "✓",
    warning: "!",
    error: "×",
  };

  return (
    <div
      className={`data-status data-status-${status.type}`}
      role={status.type === "error" ? "alert" : "status"}
    >
      <span className="data-status-icon">
        {icons[status.type]}
      </span>

      <span>{status.message}</span>
    </div>
  );
}

// Tyylitelty yhden arvon dropdown-valikko.
function CustomSelect({
  label,
  value,
  placeholder,
  options,
  onChange,
  icon = null,
  trailingIcon = null,
  disabled = false,
  menuClassName = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  // Sulkee valikon, kun käyttäjä klikkaa sen ulkopuolelle.
  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  // Valitsee arvon ja sulkee valikon.
  function selectOption(option) {
    onChange(option);
    setIsOpen(false);
  }

  return (
    <div
      className="data-field data-custom-select"
      ref={selectRef}
    >
      <span>{label}</span>

      <button
        type="button"
        className={`data-select-button ${
          isOpen ? "is-open" : ""
        }`}
        disabled={disabled}
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((current) => !current);
        }}
      >
<div className="data-select-content">
  {icon && (
    <span
      className="data-select-leading-icon"
      aria-hidden="true"
    >
      {icon}
    </span>
  )}

          <span
            className={
              value
                ? "data-select-value"
                : "data-select-placeholder"
            }
          >
            {value || placeholder}
          </span>
        </div>

        {trailingIcon && (
          <span
            className="data-select-trailing-icon"
            aria-hidden="true"
          >
            {trailingIcon}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className={`data-select-menu ${menuClassName}`}
        >
          <div className="data-select-options">
            {options.map((option) => {
              const isSelected = value === option;

              return (
                <button
                  key={option}
                  type="button"
                  className={`data-select-option ${
                    isSelected ? "is-selected" : ""
                  }`}
                  onClick={() => {
                    selectOption(option);
                  }}
                >
                  <span>{option}</span>

                  {isSelected && (
                    <span className="data-select-check">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Monivalintainen dropdown mallien koulutukseen.
function TrainingLocationSelect({
  selectedLocations,
  onChange,
  disabled,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const allSelected =
    selectedLocations.length === LOCATIONS.length;

  // Sulkee valikon ulkopuolisesta klikkauksesta.
  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  // Valitsee tai poistaa yhden toimipisteen.
  function toggleLocation(location) {
    if (selectedLocations.includes(location)) {
      onChange(
        selectedLocations.filter(
          (selectedLocation) =>
            selectedLocation !== location
        )
      );

      return;
    }

    onChange([...selectedLocations, location]);
  }

  // Valitsee tai poistaa kaikki toimipisteet.
  function toggleAllLocations() {
    onChange(allSelected ? [] : [...LOCATIONS]);
  }

  // Muodostaa dropdownin otsikkotekstin.
  function getSelectionText() {
    if (selectedLocations.length === 0) {
      return "Valitse toimipisteet";
    }

    if (allSelected) {
      return "Kaikki toimipisteet";
    }

    if (selectedLocations.length === 1) {
      return selectedLocations[0];
    }

    return `${selectedLocations.length} toimipistettä valittu`;
  }

  return (
    <div
      className="training-dropdown"
      ref={dropdownRef}
    >
      <button
        type="button"
        className={`training-dropdown-button ${
          isOpen ? "is-open" : ""
        }`}
        disabled={disabled}
        onClick={() => {
          setIsOpen((current) => !current);
        }}
      >
        <span>{getSelectionText()}</span>

        <span
          className="data-select-trailing-icon"
          aria-hidden="true"
        >
          📍
        </span>
      </button>

      {isOpen && (
        <div className="training-dropdown-menu">
          <label className="training-dropdown-option training-select-all">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAllLocations}
            />

            <span>
              {allSelected
                ? "Poista kaikki valinnat"
                : "Valitse kaikki"}
            </span>
          </label>

          <div className="training-dropdown-divider" />

          <div className="training-dropdown-list">
            {LOCATIONS.map((location) => (
              <label
                key={location}
                className="training-dropdown-option"
              >
                <input
                  type="checkbox"
                  checked={selectedLocations.includes(
                    location
                  )}
                  onChange={() => {
                    toggleLocation(location);
                  }}
                />

                <span>{location}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Data() {
  const [manualForm, setManualForm] = useState(
    INITIAL_MANUAL_FORM
  );

  const [manualDate, setManualDate] = useState({
    startDate: null,
    endDate: null,
  });

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [
    selectedTrainingLocations,
    setSelectedTrainingLocations,
  ] = useState([]);

  const [manualStatus, setManualStatus] = useState({
    type: "",
    message: "",
  });

  const [uploadStatus, setUploadStatus] = useState({
    type: "",
    message: "",
  });

  const [trainingStatus, setTrainingStatus] = useState({
    type: "",
    message: "",
  });

  const [isSavingManualData, setIsSavingManualData] =
    useState(false);

  const [isUploading, setIsUploading] =
    useState(false);

  const [isTraining, setIsTraining] =
    useState(false);

  // Päivittää manuaalisen lisäyksen kentän.
  function updateManualField(field, value) {
    setManualForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));

    setManualStatus({
      type: "",
      message: "",
    });
  }

  // Tarkistaa, onko manuaalinen lomake täytetty.
  function isManualFormValid() {
    return Boolean(
      manualForm.location &&
        manualDate.startDate &&
        manualForm.time &&
        manualForm.samples !== "" &&
        manualForm.employees !== ""
    );
  }

  // Muodostaa manuaalisen lisäyksen API-payloadin.
  function createManualPayload() {
    return {
      location: manualForm.location,
      timestamp: createTimestamp(
        manualDate.startDate,
        manualForm.time
      ),
      samples_taken: Number(manualForm.samples),
      employees_used: Number(manualForm.employees),
    };
  }

  // Tallentaa yksittäisen havainnon backendiin.
  async function handleManualSubmit(event) {
    event.preventDefault();

    setManualStatus({
      type: "",
      message: "",
    });

    if (!isManualFormValid()) {
      setManualStatus({
        type: "error",
        message: "Täytä kaikki kentät.",
      });

      return;
    }

    setIsSavingManualData(true);

    try {
      await API.post("data/", createManualPayload());

      setManualForm(INITIAL_MANUAL_FORM);

      setManualDate({
        startDate: null,
        endDate: null,
      });

      setManualStatus({
        type: "success",
        message: "Havainto lisättiin onnistuneesti.",
      });
    } catch (error) {
      console.error(
        "Manuaalinen lisäys epäonnistui:",
        error.response?.data || error
      );

      setManualStatus({
        type: "error",
        message: getErrorMessage(
          error,
          "Havainnon lisääminen epäonnistui."
        ),
      });
    } finally {
      setIsSavingManualData(false);
    }
  }

  // Tallentaa käyttäjän valitseman tiedoston.
  function handleFileSelection(event) {
    setSelectedFile(event.target.files?.[0] || null);

    setUploadStatus({
      type: "",
      message: "",
    });
  }

  // Lähettää valitun tiedoston backendiin.
  async function handleFileUpload() {
    setUploadStatus({
      type: "",
      message: "",
    });

    if (!selectedFile) {
      setUploadStatus({
        type: "error",
        message: "Valitse ensin tiedosto.",
      });

      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    setIsUploading(true);

    try {
      await API.post("upload/", formData);

      setSelectedFile(null);

      const input = document.getElementById(
        "data-file-input"
      );

      if (input) {
        input.value = "";
      }

      setUploadStatus({
        type: "success",
        message: "Tiedosto lisättiin onnistuneesti.",
      });
    } catch (error) {
      console.error(
        "Tiedoston lisäys epäonnistui:",
        error.response?.data || error
      );

      setUploadStatus({
        type: "error",
        message: getErrorMessage(
          error,
          "Tiedoston lisääminen epäonnistui."
        ),
      });
    } finally {
      setIsUploading(false);
    }
  }

  // Kouluttaa valittujen toimipisteiden mallit.
  async function handleModelTraining() {
    setTrainingStatus({
      type: "",
      message: "",
    });

    if (selectedTrainingLocations.length === 0) {
      setTrainingStatus({
        type: "error",
        message: "Valitse vähintään yksi toimipiste.",
      });

      return;
    }

    setIsTraining(true);

    try {
      const response = await API.post("train-models/", {
        locations: selectedTrainingLocations,
      });

      const trainedLocations =
        response.data?.trained_locations ?? [];

      const failedLocations =
        response.data?.failed_locations ?? [];

      if (failedLocations.length > 0) {
        const failedLocationNames = failedLocations.map(
          (failedLocation) => {
            if (typeof failedLocation === "string") {
              return failedLocation;
            }

            return failedLocation.location ?? "Tuntematon toimipiste";
          }
        );

        setTrainingStatus({
          type: trainedLocations.length > 0 ? "warning" : "error",
          message:
            trainedLocations.length > 0
              ? `${trainedLocations.length} mallia koulutettiin. ` +
                `Koulutus epäonnistui: ${failedLocationNames.join(", ")}.`
              : `Mallien koulutus epäonnistui: ${failedLocationNames.join(
                  ", "
                )}.`,
        });

        return;
      }

      setTrainingStatus({
        type: "success",
        message:
          response.data?.message ??
          `${trainedLocations.length} mallia koulutettiin onnistuneesti.`,
      });
    } catch (error) {
      console.error(
        "Mallien koulutus epäonnistui:",
        error.response?.data || error
      );

      setTrainingStatus({
        type: "error",
        message: getErrorMessage(
          error,
          "Mallien koulutus epäonnistui."
        ),
      });
    } finally {
      setIsTraining(false);
    }
  }
  return (
    <>
      <Sidebar
        title="Datan suodattimet"
        defaultOpen={false}
      >
        <DataFilter />
      </Sidebar>

      <main className="data-main">
        <header className="data-header">
          <h2 className="data-page-title">
            Datan hallinta
          </h2>

          <p className="data-page-subtitle">
            Lisää havaintoja, tuo tiedostoja ja kouluta ennustemallit.
          </p>
        </header>

        <div className="data-content">
          <section className="data-column">
            <div className="data-section-heading">
              <h3>Manuaalinen lisäys</h3>

              <p>
                Lisää yksittäinen havainto
                toimipisteelle.
              </p>
            </div>

            <form
              className="manual-form"
              onSubmit={handleManualSubmit}
            >
              <CustomSelect
                label="Toimipiste"
                value={manualForm.location}
                placeholder="Valitse toimipiste"
                options={LOCATIONS}
                trailingIcon="📍"
                disabled={isSavingManualData}
                onChange={(location) => {
                  updateManualField("location", location);
                }}
              />

              <div className="data-form-row">
                <div className="data-field data-calendar-field">
                  <span>Päivämäärä</span>

                  <Calendar
                    value={manualDate}
                    onChange={setManualDate}
                    placeholder="Valitse päivämäärä"
                    selectionMode="single"
                    disabled={isSavingManualData}
                  />
                </div>

                <CustomSelect
                  label="Kellonaika"
                  value={manualForm.time}
                  placeholder="Valitse kellonaika"
                  options={TIME_OPTIONS}
                  trailingIcon="🕒"
                  menuClassName="data-time-menu"
                  disabled={isSavingManualData}
                  onChange={(time) => {
                    updateManualField("time", time);
                  }}
                />
              </div>

              <div className="data-form-row">
                <label className="data-field">
                  <span>Näytteet</span>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={manualForm.samples}
                    placeholder="0"
                    disabled={isSavingManualData}
                    onChange={(event) => {
                      updateManualField(
                        "samples",
                        event.target.value
                      );
                    }}
                  />
                </label>

                <label className="data-field">
                  <span>Työntekijät</span>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={manualForm.employees}
                    placeholder="0"
                    disabled={isSavingManualData}
                    onChange={(event) => {
                      updateManualField(
                        "employees",
                        event.target.value
                      );
                    }}
                  />
                </label>
              </div>

              <button
                type="submit"
                className="data-primary-button"
                disabled={isSavingManualData}
              >
                {isSavingManualData && (
                  <span className="data-button-spinner" />
                )}

                {isSavingManualData
                  ? "Lisätään dataa..."
                  : "Lisää data"}
              </button>
            </form>

            <StatusMessage status={manualStatus} />
          </section>

          <div className="data-column-divider" />

          <section className="data-column">
            <div className="data-section-heading">
              <h3>Tiedoston lisäys</h3>

              <p>
                Tuo useita havaintoja yhdellä
                tiedostolla.
              </p>
            </div>

            <div className="upload-area">
              <div className="upload-icon">+</div>

              <p>
                CSV-, XLSX- tai JSON-tiedosto
              </p>

              <label className="upload-button">
                Valitse tiedosto

                <input
                  id="data-file-input"
                  type="file"
                  accept=".csv,.xlsx,.xls,.json"
                  disabled={isUploading}
                  onChange={handleFileSelection}
                />
              </label>

              {selectedFile && (
                <div className="selected-file">
                  {selectedFile.name}
                </div>
              )}

              <button
                type="button"
                className="data-primary-button upload-submit"
                disabled={
                  isUploading || !selectedFile
                }
                onClick={handleFileUpload}
              >
                {isUploading && (
                  <span className="data-button-spinner" />
                )}

                {isUploading
                  ? "Lähetetään tiedostoa..."
                  : "Lähetä tiedosto"}
              </button>
            </div>

            <StatusMessage status={uploadStatus} />
          </section>
        </div>

        <section className="training-row">
          <div className="training-row-text">
            <h3>Kouluta ennustemallit</h3>

            <p>
              Valitse toimipisteet, joiden mallit
              koulutetaan uudelleen.
            </p>
          </div>

          <div className="training-controls">
            <TrainingLocationSelect
              selectedLocations={
                selectedTrainingLocations
              }
              onChange={
                setSelectedTrainingLocations
              }
              disabled={isTraining}
            />

            <button
              type="button"
              className="data-primary-button training-button"
              disabled={
                isTraining ||
                selectedTrainingLocations.length === 0
              }
              onClick={handleModelTraining}
            >
              {isTraining && (
                <span className="data-button-spinner" />
              )}

              {isTraining
                ? "Koulutetaan..."
                : "Kouluta mallit"}
            </button>
          </div>
        </section>

        <StatusMessage status={trainingStatus} />
      </main>
    </>
  );
}

export default Data;