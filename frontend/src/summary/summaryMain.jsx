import {
  useEffect,
  useMemo,
  useState,
} from "react";

import API from "../api";
import WaitingState from "../ui_features/waitingState.jsx";
import Loading from "../ui_features/loading.jsx";
import "./summaryMain.css";

const HISTORY_SEARCH_DAYS = 365;
const REALIZED_DAY_COUNT = 30;
const FORECAST_DAY_COUNT = 30;
const SPIKE_MULTIPLIER = 1.3;

const WEEKDAY_NAMES = [
  "sunnuntai",
  "maanantai",
  "tiistai",
  "keskiviikko",
  "torstai",
  "perjantai",
  "lauantai",
];

function startOfDay(value) {
  const date =
    value instanceof Date
      ? new Date(value)
      : new Date(value);

  date.setHours(0, 0, 0, 0);

  return date;
}

function addDays(value, amount) {
  const date = startOfDay(value);

  date.setDate(
    date.getDate() + amount
  );

  return date;
}

function toApiDate(value) {
  const date = startOfDay(value);

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getResponseRows(responseData) {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  return responseData?.results || [];
}

function getPredictionRows(responseData) {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  return responseData?.predictions || [];
}

function getRowDate(row) {
  return (
    row.date ||
    row.prediction_date ||
    row.timestamp?.split("T")[0]
  );
}

function getRealizedValue(row) {
  return Number(
    row.realized ??
      row.samples_taken ??
      row.total_samples ??
      row.value ??
      0
  );
}

function getForecastValue(row) {
  return Number(
    row.forecast ??
      row.prediction ??
      row.predicted_patient_count ??
      row.predicted_samples ??
      row.predicted_samples_taken ??
      row.predicted_value ??
      row.samples_prediction ??
      row.value ??
      0
  );
}

function aggregateRealizedRowsByDate(rows) {
  const totalsByDate = new Map();

  rows.forEach((row) => {
    const date = getRowDate(row);

    if (!date) {
      return;
    }

    const dateKey = toApiDate(date);

    const currentValue =
      totalsByDate.get(dateKey) || 0;

    totalsByDate.set(
      dateKey,
      currentValue +
        getRealizedValue(row)
    );
  });

  return Array.from(
    totalsByDate,
    ([date, value]) => ({
      date,
      value,
      dataType: "realized",
    })
  ).sort((first, second) =>
    first.date.localeCompare(
      second.date
    )
  );
}

function aggregateForecastRowsByDate(rows) {
  const totalsByDate = new Map();

  rows.forEach((row) => {
    const date = getRowDate(row);

    if (!date) {
      return;
    }

    const dateKey = toApiDate(date);

    const currentValue =
      totalsByDate.get(dateKey) || 0;

    totalsByDate.set(
      dateKey,
      currentValue +
        getForecastValue(row)
    );
  });

  return Array.from(
    totalsByDate,
    ([date, value]) => ({
      date,
      value,
      dataType: "forecast",
    })
  ).sort((first, second) =>
    first.date.localeCompare(
      second.date
    )
  );
}

function getRowValue(row) {
  return Number(row?.value ?? 0);
}

function sumValues(rows) {
  return rows.reduce(
    (sum, row) =>
      sum + getRowValue(row),
    0
  );
}

function getAverage(values) {
  if (values.length === 0) {
    return 0;
  }

  return (
    values.reduce(
      (sum, value) =>
        sum + value,
      0
    ) / values.length
  );
}

function getStandardDeviation(values) {
  if (values.length === 0) {
    return 0;
  }

  const average =
    getAverage(values);

  const variance =
    values.reduce(
      (sum, value) =>
        sum +
        Math.pow(
          value - average,
          2
        ),
      0
    ) / values.length;

  return Math.sqrt(variance);
}

function getPercentageChange(
  previousValue,
  nextValue
) {
  if (previousValue <= 0) {
    return null;
  }

  return (
    ((nextValue - previousValue) /
      previousValue) *
    100
  );
}

function getExtremeRow(rows, type) {
  if (rows.length === 0) {
    return null;
  }

  /*
    Hiljaisinta päivää etsittäessä
    nollapäivät jätetään pois.
  */
  const comparableRows =
    type === "minimum"
      ? rows.filter(
          (row) =>
            getRowValue(row) > 0
        )
      : rows;

  if (
    comparableRows.length === 0
  ) {
    return null;
  }

  return comparableRows.reduce(
    (selected, current) => {
      const selectedValue =
        getRowValue(selected);

      const currentValue =
        getRowValue(current);

      if (type === "maximum") {
        return currentValue >
          selectedValue
          ? current
          : selected;
      }

      return currentValue <
        selectedValue
        ? current
        : selected;
    }
  );
}

function getBusiestWeekday(rows) {
  if (rows.length === 0) {
    return null;
  }

  const weekdayStatistics = {};

  rows.forEach((row) => {
    const value =
      getRowValue(row);

    /*
      Nollapäivää ei huomioida
      viikonpäivän keskiarvossa.
    */
    if (value <= 0) {
      return;
    }

    const date =
      startOfDay(row.date);

    const weekday =
      date.getDay();

    if (
      !weekdayStatistics[weekday]
    ) {
      weekdayStatistics[weekday] = {
        total: 0,
        days: 0,
      };
    }

    weekdayStatistics[
      weekday
    ].total += value;

    weekdayStatistics[
      weekday
    ].days += 1;
  });

  const entries =
    Object.entries(
      weekdayStatistics
    );

  if (entries.length === 0) {
    return null;
  }

  const [
    weekday,
    statistics,
  ] = entries.reduce(
    (selected, current) => {
      const selectedAverage =
        selected[1].total /
        selected[1].days;

      const currentAverage =
        current[1].total /
        current[1].days;

      return currentAverage >
        selectedAverage
        ? current
        : selected;
    }
  );

  return {
    name:
      WEEKDAY_NAMES[
        Number(weekday)
      ],

    average:
      statistics.total /
      statistics.days,
  };
}

function formatNumber(value) {
  return Math.round(
    value
  ).toLocaleString("fi-FI");
}

function formatPercentage(value) {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "Ei vertailutietoa";
  }

  const sign =
    value > 0 ? "+" : "";

  return (
    `${sign}` +
    `${value.toFixed(1)} %`
  );
}

function formatDate(value) {
  if (!value) {
    return "Ei tietoa";
  }

  return new Intl.DateTimeFormat(
    "fi-FI",
    {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    }
  ).format(startOfDay(value));
}

function formatLongDate(value) {
  if (!value) {
    return "Ei tietoa";
  }

  return new Intl.DateTimeFormat(
    "fi-FI",
    {
      weekday: "long",
      day: "numeric",
      month: "numeric",
    }
  ).format(startOfDay(value));
}

function getTrendInformation(
  changePercentage
) {
  if (changePercentage === null) {
    return {
      level: "neutral",
      title:
        "Vertailua ei voitu laskea",
      text:
        "Toteutunutta dataa ei ole riittävästi vertailua varten.",
    };
  }

  if (changePercentage >= 15) {
    return {
      level: "high",
      title:
        "Asiakasvirran ennustetaan kasvavan selvästi",
      text:
        "Seuraavien 30 ennustepäivän päiväkeskiarvon odotetaan olevan selvästi 30 viimeisintä toteumapäivää suurempi.",
    };
  }

  if (changePercentage >= 5) {
    return {
      level: "medium",
      title:
        "Asiakasvirran ennustetaan kasvavan hieman",
      text:
        "Seuraavien 30 ennustepäivän päiväkeskiarvossa näkyy maltillista kasvua.",
    };
  }

  if (changePercentage <= -15) {
    return {
      level: "low",
      title:
        "Asiakasvirran ennustetaan laskevan selvästi",
      text:
        "Seuraavien 30 ennustepäivän päiväkeskiarvon odotetaan olevan selvästi 30 viimeisintä toteumapäivää pienempi.",
    };
  }

  if (changePercentage <= -5) {
    return {
      level: "low",
      title:
        "Asiakasvirran ennustetaan laskevan hieman",
      text:
        "Seuraavien 30 ennustepäivän päiväkeskiarvossa näkyy maltillista laskua.",
    };
  }

  return {
    level: "neutral",
    title:
      "Asiakasvirran ennustetaan pysyvän tasaisena",
    text:
      "Seuraavien 30 ennustepäivän päiväkeskiarvo on lähellä 30 viimeisimmän toteumapäivän tasoa.",
  };
}

function getVariationInformation(
  coefficientOfVariation,
  spikeCount
) {
  if (
    !Number.isFinite(
      coefficientOfVariation
    )
  ) {
    return {
      level: "neutral",
      title:
        "Asiakasvirran vaihtelua ei voitu arvioida",
      text:
        "Ennustedataa ei ole riittävästi vaihtelun arviointiin.",
    };
  }

  if (
    coefficientOfVariation <
    0.15
  ) {
    return {
      level: "low",
      title:
        "Asiakasvirran ennustetaan olevan tasainen",
      text:
        "Päivittäiset asiakasmäärät pysyvät ennusteessa lähellä toisiaan eikä merkittävää vaihtelua ole odotettavissa.",
    };
  }

  if (
    coefficientOfVariation <
    0.3
  ) {
    if (spikeCount > 0) {
      return {
        level: "medium",
        title:
          "Asiakasvirrassa on jonkin verran vaihtelua",
        text:
          `Ennustejaksoon sisältyy ${spikeCount} päivää, ` +
          "joiden ennustettu asiakasmäärä ylittää positiivisten ennustepäivien keskiarvon vähintään 30 prosentilla.",
      };
    }

    return {
      level: "medium",
      title:
        "Asiakasvirrassa on jonkin verran vaihtelua",
      text:
        "Päivittäinen asiakasmäärä vaihtelee jonkin verran, mutta yksittäisiä selvästi keskimääräistä kuormittavampia päiviä ei havaittu.",
    };
  }

  if (spikeCount > 0) {
    return {
      level: "high",
      title:
        "Asiakasvirrassa ennustetaan olevan suurta vaihtelua",
      text:
        `Päivittäisissä asiakasmäärissä on suurta vaihtelua. ` +
        `${spikeCount} päivää ylittää positiivisten ennustepäivien ` +
        "keskiarvon vähintään 30 prosentilla.",
    };
  }

  return {
    level: "high",
    title:
      "Asiakasvirrassa ennustetaan olevan suurta vaihtelua",
    text:
      "Päivittäisten asiakasmäärien välillä on suurta vaihtelua, mutta yksikään päivä ei ylitä positiivisten ennustepäivien keskiarvoa vähintään 30 prosentilla.",
  };
}

function getRecommendation({
  forecastChange,
  spikeCount,
  coefficientOfVariation,
  busiestDay,
}) {
  if (forecastChange === null) {
    return (
      "Suositusta ei voitu muodostaa, " +
      "koska toteutunutta vertailudataa " +
      "ei ole riittävästi."
    );
  }

  if (
    forecastChange >= 10 &&
    spikeCount >= 3
  ) {
    return (
      "Asiakasmäärän kasvu ja useat " +
      "keskimääräistä kuormittavammat " +
      "päivät viittaavat siihen, että " +
      "henkilöstön riittävyys kannattaa " +
      "tarkistaa erityisesti kiireisimmille " +
      "päiville."
    );
  }

  if (
    spikeCount > 0 &&
    busiestDay
  ) {
    return (
      "Kokonaiskuormitus näyttää pääosin " +
      "hallittavalta, mutta " +
      `${formatLongDate(
        busiestDay.date
      )} ` +
      "kannattaa huomioida henkilöstö- " +
      "ja työvuorosuunnittelussa."
    );
  }

  if (
    forecastChange <= -10
  ) {
    return (
      "Ennusteessa näkyy hiljaisempi " +
      "jakso. Tämä voi tarjota " +
      "mahdollisuuden kohdentaa aikaa " +
      "esimerkiksi koulutukseen, " +
      "ylläpitoon tai muihin tehtäviin."
    );
  }

  if (
    coefficientOfVariation >= 0.3
  ) {
    return (
      "Päivittäisissä asiakasmäärissä " +
      "ennustetaan olevan suurta vaihtelua. " +
      "Henkilöstötarvetta kannattaa arvioida " +
      "päiväkohtaisesti yhtenäisen " +
      "perustason sijaan."
    );
  }

  if (
    coefficientOfVariation < 0.15
  ) {
    return (
      "Ennustettu kuormitus on tasainen. " +
      "Henkilöstöä voidaan suunnitella " +
      "melko yhtenäisellä perustasolla " +
      "koko jaksolle."
    );
  }

  return (
    "Kokonaiskuormituksen ei ennusteta " +
    "muuttuvan merkittävästi. Päivittäistä " +
    "vaihtelua kannattaa silti seurata " +
    "työvuorosuunnittelussa."
  );
}

function WaitingView() {
  return (
    <main className="summary-main">
      <WaitingState />
    </main>
  );
}

function LoadingView() {
  return (
    <main className="summary-main">
      <Loading />
    </main>
  );
}

function ErrorView({ message }) {
  return (
    <main className="summary-main">
      <div className="summary-empty-state">
        {message}
      </div>
    </main>
  );
}

function SummaryMain({ filters }) {
  const [
    realizedData,
    setRealizedData,
  ] = useState([]);

  const [
    forecastData,
    setForecastData,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const selectedLocation =
    filters?.selectedLocations?.[0] ||
    "Kaikki näytteenotot";

  const allLocationsSelected =
    selectedLocation ===
    "Kaikki näytteenotot";

  useEffect(() => {
    if (!filters?.hasApplied) {
      setRealizedData([]);
      setForecastData([]);
      setError("");

      return undefined;
    }

    let cancelled = false;

    async function loadSummaryData() {
      setLoading(true);
      setError("");

      try {
        const today =
          startOfDay(new Date());

        const historyStart =
          addDays(
            today,
            -HISTORY_SEARCH_DAYS
          );

        const historyParams = {
          start:
            toApiDate(
              historyStart
            ),

          end:
            toApiDate(today),
        };

        if (!allLocationsSelected) {
          historyParams.locations =
            selectedLocation;
        }

        const forecastParams = {
          days:
            FORECAST_DAY_COUNT,
        };

        if (!allLocationsSelected) {
          forecastParams.location =
            selectedLocation;
        }

        const [
          realizedResponse,
          forecastResponse,
        ] = await Promise.all([
          API.get(
            "data/summary/",
            {
              params:
                historyParams,
            }
          ),

          API.get(
            "predict/",
            {
              params:
                forecastParams,
            }
          ),
        ]);

        if (cancelled) {
          return;
        }

        const realizedRows =
          getResponseRows(
            realizedResponse.data
          );

        const predictionRows =
          getPredictionRows(
            forecastResponse.data
          );

        const aggregatedRealized =
          aggregateRealizedRowsByDate(
            realizedRows
          );

        const aggregatedForecast =
          aggregateForecastRowsByDate(
            predictionRows
          );

        setRealizedData(
          aggregatedRealized
        );

        setForecastData(
          aggregatedForecast
        );
      } catch (requestError) {
        console.error(
          "Yhteenvedon datan haku epäonnistui:",
          requestError.response
            ?.data ||
            requestError
        );

        if (!cancelled) {
          setRealizedData([]);
          setForecastData([]);

          setError(
            "Yhteenvedon lataaminen epäonnistui."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSummaryData();

    return () => {
      cancelled = true;
    };
  }, [
    filters?.hasApplied,
    selectedLocation,
    allLocationsSelected,
  ]);

  const insights = useMemo(() => {
    if (
      realizedData.length === 0 ||
      forecastData.length === 0
    ) {
      return null;
    }

    /*
      Otetaan toteumadatasta 30 viimeisintä
      päivää, joilta löytyy tietokannasta dataa.
      Jaksoa ei lasketa nykyisestä päivästä.
    */
    const lastRealizedDays =
      realizedData.slice(
        -REALIZED_DAY_COUNT
      );

    /*
      Ennusteesta otetaan ensimmäiset
      30 saatavilla olevaa ennustepäivää.
    */
    const nextForecastDays =
      forecastData.slice(
        0,
        FORECAST_DAY_COUNT
      );

    if (
      lastRealizedDays.length === 0 ||
      nextForecastDays.length === 0
    ) {
      return null;
    }

    const realizedTotal =
      sumValues(
        lastRealizedDays
      );

    const forecastTotal =
      sumValues(
        nextForecastDays
      );

    const realizedAverage =
      realizedTotal /
      lastRealizedDays.length;

    /*
      Nollapäivät jätetään pois ennusteen
      keskiarvosta, vaihtelusta ja
      asiakaspiikkien tunnistuksesta.
    */
    const positiveForecastDays =
      nextForecastDays.filter(
        (row) =>
          getRowValue(row) > 0
      );

    const positiveForecastValues =
      positiveForecastDays.map(
        getRowValue
      );

    const forecastAverage =
      getAverage(
        positiveForecastValues
      );

    const forecastChange =
      getPercentageChange(
        realizedAverage,
        forecastAverage
      );

    const standardDeviation =
      getStandardDeviation(
        positiveForecastValues
      );

    const coefficientOfVariation =
      forecastAverage > 0
        ? standardDeviation /
          forecastAverage
        : 0;

    /*
      Päivä luokitellaan asiakaspiikiksi,
      jos sen ennuste on vähintään 30 %
      positiivisten ennustepäivien
      keskiarvoa suurempi.
    */
    const spikeLimit =
      forecastAverage *
      SPIKE_MULTIPLIER;

    const spikeDays =
      positiveForecastDays.filter(
        (row) =>
          getRowValue(row) >=
          spikeLimit
      );

    const highLoadLimit =
      forecastAverage * 1.15;

    const highLoadDays =
      positiveForecastDays.filter(
        (row) =>
          getRowValue(row) >=
          highLoadLimit
      );

    const busiestDay =
      getExtremeRow(
        positiveForecastDays,
        "maximum"
      );

    const quietestDay =
      getExtremeRow(
        positiveForecastDays,
        "minimum"
      );

    const busiestWeekday =
      getBusiestWeekday(
        positiveForecastDays
      );

    const trendInformation =
      getTrendInformation(
        forecastChange
      );

    const variationInformation =
      getVariationInformation(
        coefficientOfVariation,
        spikeDays.length
      );

    const recommendation =
      getRecommendation({
        forecastChange,
        spikeCount:
          spikeDays.length,
        coefficientOfVariation,
        busiestDay,
      });

    console.log(
      "Yhteenvedon piikkien tunnistus:",
      {
        positiveForecastValues,
        forecastAverage,
        spikeLimit,
        spikeDays,
        coefficientOfVariation,
      }
    );

    return {
      realizedTotal,
      forecastTotal,

      realizedAverage,
      forecastAverage,

      forecastChange,

      standardDeviation,
      coefficientOfVariation,
      spikeLimit,

      spikeDays,
      highLoadDays,

      busiestDay,
      quietestDay,
      busiestWeekday,

      trendInformation,
      variationInformation,
      recommendation,

      realizedDayCount:
        lastRealizedDays.length,

      forecastDayCount:
        nextForecastDays.length,

      positiveForecastDayCount:
        positiveForecastDays.length,

      realizedStart:
        lastRealizedDays[0]
          ?.date,

      realizedEnd:
        lastRealizedDays[
          lastRealizedDays.length -
            1
        ]?.date,

      forecastStart:
        nextForecastDays[0]
          ?.date,

      forecastEnd:
        nextForecastDays[
          nextForecastDays.length -
            1
        ]?.date,
    };
  }, [
    realizedData,
    forecastData,
  ]);

  if (!filters?.hasApplied) {
    return <WaitingView />;
  }

  if (loading) {
    return <LoadingView />;
  }

  if (error) {
    return (
      <ErrorView
        message={error}
      />
    );
  }

  if (!insights) {
    return (
      <ErrorView
        message={
          "Yhteenvetoon tarvittavaa " +
          "toteuma- tai ennustedataa " +
          "ei löytynyt."
        }
      />
    );
  }

  return (
    <div className="pgae-content">
    <main className="summary-main">
      <header className="summary-main-header">
        <div className="summary-header">
          <h2 className="summary-title">
            Asiakasvirran yhteenveto
          </h2>

          <div className="summary-header-meta">
            <span className="summary-location">
              {selectedLocation}
            </span>

            {insights.forecastStart &&
              insights.forecastEnd && (
                <>
                  <span className="summary-meta-divider">
                    •
                  </span>

                  <span className="summary-date-range">
                    {formatDate(
                      insights.forecastStart
                    )}
                    {" – "}
                    {formatDate(
                      insights.forecastEnd
                    )}
                  </span>
                </>
              )}
          </div>
        </div>
      </header>


      <section className="summary-period-information">
        <div>
          <strong>
            Käytetty toteumajakso
          </strong>

          <span>
            {formatDate(
              insights.realizedStart
            )}
            {" – "}
            {formatDate(
              insights.realizedEnd
            )}
          </span>

          <small>
            {
              insights.realizedDayCount
            }{" "}
            päivää, joilta löytyy
            toteumadataa
          </small>
        </div>

        <div>
          <strong>
            Käytetty ennustejakso
          </strong>

          <span>
            {formatDate(
              insights.forecastStart
            )}
            {" – "}
            {formatDate(
              insights.forecastEnd
            )}
          </span>

          <small>
            {
              insights.forecastDayCount
            }{" "}
            ennustepäivää
          </small>
        </div>
      </section>

      <section className="summary-cards">
        <article className="summary-card">
          <span className="summary-card-label">
            Viimeiset 30
            toteumapäivää
          </span>

          <strong>
            {formatNumber(
              insights.realizedTotal
            )}
          </strong>

          <small>
            toteutunutta asiakasta
          </small>
        </article>

        <article className="summary-card">
          <span className="summary-card-label">
            Seuraavat 30
            ennustepäivää
          </span>

          <strong>
            {formatNumber(
              insights.forecastTotal
            )}
          </strong>

          <small>
            ennustettua asiakasta
          </small>
        </article>

        <article className="summary-card">
          <span className="summary-card-label">
            Päiväkeskiarvon muutos
          </span>

          <strong>
            {formatPercentage(
              insights.forecastChange
            )}
          </strong>

          <small>
            verrattuna viimeisimpiin
            toteumapäiviin
          </small>
        </article>

        <article className="summary-card">
          <span className="summary-card-label">
            Ennustettu
            päiväkeskiarvo
          </span>

          <strong>
            {formatNumber(
              insights.forecastAverage
            )}
          </strong>

          <small>
            asiakasta positiivista
            ennustepäivää kohden
          </small>
        </article>
      </section>

      <section className="summary-highlight-grid">
        <article
          className={
            `summary-highlight ` +
            `summary-highlight-${insights.trendInformation.level}`
          }
        >
          <span className="summary-highlight-kicker">
            Ennusteen suunta
          </span>

          <h2>
            {
              insights
                .trendInformation
                .title
            }
          </h2>

          <p>
            {
              insights
                .trendInformation
                .text
            }
          </p>
        </article>

        <article
          className={
            `summary-highlight ` +
            `summary-highlight-${insights.variationInformation.level}`
          }
        >
          <span className="summary-highlight-kicker">
            Kuormituksen vaihtelu
          </span>

          <h2>
            {
              insights
                .variationInformation
                .title
            }
          </h2>

          <p>
            {
              insights
                .variationInformation
                .text
            }
          </p>
        </article>
      </section>

      <section className="summary-section">
        <div className="summary-section-heading">
          <div>
            <span className="summary-section-kicker">
              Ennusteen
              yksityiskohdat
            </span>

            <h2>
              Mihin kannattaa
              varautua?
            </h2>
          </div>
        </div>

        <div className="summary-info-grid">
          <article className="summary-info-item">
            <h3>
              Kiireisin päivä
            </h3>

            {insights.busiestDay ? (
              <>
                <strong>
                  {formatLongDate(
                    insights
                      .busiestDay
                      .date
                  )}
                </strong>

                <p>
                  {formatNumber(
                    getRowValue(
                      insights
                        .busiestDay
                    )
                  )}{" "}
                  ennustettua
                  asiakasta
                </p>
              </>
            ) : (
              <p>
                Ei positiivista
                ennustedataa.
              </p>
            )}
          </article>

          <article className="summary-info-item">
            <h3>
              Hiljaisin päivä
            </h3>

            {insights.quietestDay ? (
              <>
                <strong>
                  {formatLongDate(
                    insights
                      .quietestDay
                      .date
                  )}
                </strong>

                <p>
                  {formatNumber(
                    getRowValue(
                      insights
                        .quietestDay
                    )
                  )}{" "}
                  ennustettua
                  asiakasta
                </p>
              </>
            ) : (
              <p>
                Ei yli nollan olevaa
                ennustetta.
              </p>
            )}
          </article>

          <article className="summary-info-item">
            <h3>
              Kiireisin
              viikonpäivä
            </h3>

            {insights.busiestWeekday ? (
              <>
                <strong>
                  {
                    insights
                      .busiestWeekday
                      .name
                  }
                </strong>

                <p>
                  Keskimäärin{" "}
                  {formatNumber(
                    insights
                      .busiestWeekday
                      .average
                  )}{" "}
                  asiakasta
                </p>
              </>
            ) : (
              <p>
                Ei positiivista
                ennustedataa.
              </p>
            )}
          </article>

          <article className="summary-info-item">
            <h3>
              Mahdolliset
              asiakaspiikit
            </h3>

            <strong>
              {
                insights
                  .spikeDays
                  .length
              }
            </strong>

            <p>
              päivää ylittää
              positiivisten
              ennustepäivien
              keskiarvon vähintään
              30 prosentilla
            </p>
          </article>

          <article className="summary-info-item">
            <h3>
              Korkean kuormituksen
              päivät
            </h3>

            <strong>
              {
                insights
                  .highLoadDays
                  .length
              }
            </strong>

            <p>
              päivää ylittää
              positiivisten
              ennustepäivien
              keskiarvon vähintään
              15 prosentilla
            </p>
          </article>

          <article className="summary-info-item">
            <h3>
              Toteutunut
              päiväkeskiarvo
            </h3>

            <strong>
              {formatNumber(
                insights
                  .realizedAverage
              )}
            </strong>

            <p>
              asiakasta päivää kohden
              30 viimeisimpänä
              toteumapäivänä
            </p>
          </article>
        </div>
      </section>

      <section className="summary-recommendation">


        <div>
          <span className="summary-section-kicker">
            Toimintasuositus
          </span>

          <h2>
            Ennusteen soveltaminen
          </h2>

          <p>
            {
              insights
                .recommendation
            }
          </p>
        </div>
      </section>
    </main>
    </div>
  );
}

export default SummaryMain;