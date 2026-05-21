import "./dayMain.css";
import WaitingState from "../waitingState.jsx";

function DayMain({ filters }) {
  const mockData = [
    { date: "2026-04-01", location: "Lab1", realized: 42, forecast: 48 },
    { date: "2026-04-02", location: "Lab1", realized: 55, forecast: 52 },
    { date: "2026-04-03", location: "Lab1", realized: 38, forecast: 45 },
    { date: "2026-04-04", location: "Lab2", realized: 64, forecast: 58 },
    { date: "2026-04-05", location: "Lab2", realized: 72, forecast: 66 },
    { date: "2026-04-06", location: "Lab3", realized: 44, forecast: 49 },
    { date: "2026-04-07", location: "Lab3", realized: 36, forecast: 41 },
  ];

  const selectedLocations =
    filters?.selectedLocations || [];

  const startDate =
    filters?.dateRange?.startDate;

  const endDate =
    filters?.dateRange?.endDate;

  const mode =
    filters?.mode || "realized";

  const isWaitingForFilters =
    selectedLocations.length === 0 &&
    !startDate &&
    !endDate &&
    mode === "realized";

  const filteredData = mockData.filter(
    (item) => {
      const itemDate = new Date(item.date);

      const locationMatches =
        selectedLocations.length === 0 ||
        selectedLocations.includes(
          "Kaikki toimipisteet"
        ) ||
        selectedLocations.includes(
          item.location
        );

      const dateMatches =
        !startDate ||
        !endDate ||
        (itemDate >= startDate &&
          itemDate <= endDate);

      return (
        locationMatches && dateMatches
      );
    }
  );

  const maxValue = Math.max(
    80,
    ...filteredData.map((item) =>
      mode === "forecast"
        ? item.forecast
        : item.realized
    )
  );

  const formatDate = (
    dateString
  ) => {
    const date = new Date(dateString);

    return `${date.getDate()}.${
      date.getMonth() + 1
    }.`;
  };

  return (
    <main className="day-main">
      {isWaitingForFilters ? (
        <WaitingState />
      ) : (
        <>
          <div className="day-main-header">
            <h1>
              {mode === "realized"
                ? "Toteutuneet näytteet"
                : "Näyte-ennuste"}
            </h1>

            <span>
              {selectedLocations.length >
              0
                ? selectedLocations.join(
                    ", "
                  )
                : "Kaikki toimipisteet"}
            </span>
          </div>

          <section className="day-chart-card">
            <div className="day-chart-header">
              <div className="day-chart-legend">
                <span>
                  <i
                    className={
                      mode ===
                      "realized"
                        ? "legend-realized"
                        : "legend-forecast"
                    }
                  ></i>

                  {mode === "realized"
                    ? "Toteutuneet"
                    : "Ennuste"}
                </span>
              </div>
            </div>

            {filteredData.length ===
            0 ? (
              <div className="day-empty-state">
                Ei dataa valituilla
                suodattimilla
              </div>
            ) : (
              <div className="day-chart">
                <div className="day-chart-y-axis">
                  <span>{maxValue}</span>
                  <span>
                    {Math.round(
                      maxValue * 0.75
                    )}
                  </span>
                  <span>
                    {Math.round(
                      maxValue * 0.5
                    )}
                  </span>
                  <span>
                    {Math.round(
                      maxValue * 0.25
                    )}
                  </span>
                  <span>0</span>
                </div>

                <div className="day-chart-area">
                  <div className="day-chart-grid-line"></div>
                  <div className="day-chart-grid-line"></div>
                  <div className="day-chart-grid-line"></div>
                  <div className="day-chart-grid-line"></div>

                  <div className="day-chart-bars">
                    {filteredData.map(
                      (item) => {
                        const value =
                          mode ===
                          "forecast"
                            ? item.forecast
                            : item.realized;

                        return (
                          <div
                            className="day-chart-column"
                            key={`${item.date}-${item.location}`}
                          >
                            <div className="day-bars">
                              <div
                                className={`day-bar ${
                                  mode ===
                                  "realized"
                                    ? "realized"
                                    : "forecast"
                                }`}
                                style={{
                                  height: `${
                                    (value /
                                      maxValue) *
                                    100
                                  }%`,
                                }}
                                title={`${item.location}: ${value}`}
                              ></div>
                            </div>

                            <span className="day-chart-label">
                              {formatDate(
                                item.date
                              )}
                            </span>

                            <small className="day-chart-location">
                              {
                                item.location
                              }
                            </small>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

export default DayMain;