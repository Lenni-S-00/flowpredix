import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./summaryMain.css";

function SummaryMain({ filters }) {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const location = filters.selectedLocation || "Kaikki näytteenotot";

  // Haetaan yhteenvetodataa backendistä aina, kun käyttäjä muuttaa suodattimia.
  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await axios.get("/api/data/summary/", {
          params: {
            mode: filters.mode,
            locations: filters.selectedLocations.join(","),
            start_date: filters.dateRange.startDate,
            end_date: filters.dateRange.endDate,
            forecast_range: filters.forecastRange,
          },
        });

        setSummaryData(response.data);
      } catch (err) {
        console.error("Yhteenvedon haku epäonnistui:", err);
        setError("Yhteenvedon lataaminen epäonnistui.");
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [filters]);

  /*
    Tässä muodostetaan käyttäjälle hyödyllinen tulkinta datasta.

    Oletettu backend-vastaus voi olla esimerkiksi:
    {
      total_customers: 12500,
      last_week_customers: 820,
      previous_week_customers: 710,
      forecast_next_week_customers: 910,
      forecast_next_month_customers: 3900,
      active_days: 26,
      start_date: "2025-01-01",
      end_date: "2025-01-31"
    }

    Jos joitain arvoja ei vielä tule backendistä, käytetään oletusarvona 0.
  */
  const insights = useMemo(() => {
    if (!summaryData) return null;

    const totalCustomers = summaryData.total_customers ?? 0;
    const lastWeekCustomers = summaryData.last_week_customers ?? 0;
    const previousWeekCustomers = summaryData.previous_week_customers ?? 0;
    const forecastNextWeek = summaryData.forecast_next_week_customers ?? 0;
    const forecastNextMonth = summaryData.forecast_next_month_customers ?? 0;
    const activeDays = summaryData.active_days ?? 0;

    // Lasketaan viime viikon muutos verrattuna sitä edeltävään viikkoon.
    const weeklyChange =
      previousWeekCustomers > 0
        ? ((lastWeekCustomers - previousWeekCustomers) / previousWeekCustomers) * 100
        : 0;

    // Lasketaan ennustettu muutos ensi viikolle verrattuna viime viikkoon.
    const forecastChange =
      lastWeekCustomers > 0
        ? ((forecastNextWeek - lastWeekCustomers) / lastWeekCustomers) * 100
        : 0;

    // Päiväkeskiarvo auttaa käyttäjää hahmottamaan asiakasmäärän normaalitason.
    const averagePerActiveDay =
      activeDays > 0 ? totalCustomers / activeDays : 0;

    // Päätellään trendin suunta.
    let trendText = "Asiakasmäärä on pysynyt melko tasaisena.";
    let recommendationText =
      "Nykyinen kapasiteetti näyttää riittävältä, mutta kehitystä kannattaa seurata.";

    if (weeklyChange > 10) {
      trendText = "Asiakasmäärä on selvässä kasvussa viimeisen viikon aikana.";
      recommendationText =
        "Kasvu voi lisätä kuormitusta, joten resurssien ja henkilöstön riittävyys kannattaa tarkistaa.";
    } else if (weeklyChange > 3) {
      trendText = "Asiakasmäärä on lievässä kasvussa.";
      recommendationText =
        "Tilanne näyttää vakaalta, mutta kasvun jatkuessa kapasiteettia kannattaa seurata tarkemmin.";
    } else if (weeklyChange < -10) {
      trendText = "Asiakasmäärä on laskenut selvästi viimeisen viikon aikana.";
      recommendationText =
        "Lasku voi viitata hiljaisempaan jaksoon tai poikkeamaan datassa. Syytä kannattaa tarkastella.";
    } else if (weeklyChange < -3) {
      trendText = "Asiakasmäärä on lievässä laskussa.";
      recommendationText =
        "Tilanne ei vaikuta kriittiseltä, mutta laskusuunnan jatkumista kannattaa seurata.";
    }

    let forecastText = "Ennuste ei näytä merkittävää muutosta lähijaksolle.";

    if (forecastChange > 10) {
      forecastText =
        "Ennusteen perusteella asiakasmäärä voi kasvaa selvästi ensi viikolla.";
    } else if (forecastChange > 3) {
      forecastText =
        "Ennusteen perusteella asiakasmäärä voi kasvaa hieman ensi viikolla.";
    } else if (forecastChange < -10) {
      forecastText =
        "Ennusteen perusteella asiakasmäärä voi laskea selvästi ensi viikolla.";
    } else if (forecastChange < -3) {
      forecastText =
        "Ennusteen perusteella asiakasmäärä voi laskea hieman ensi viikolla.";
    }

    return {
      totalCustomers,
      lastWeekCustomers,
      previousWeekCustomers,
      forecastNextWeek,
      forecastNextMonth,
      activeDays,
      weeklyChange,
      forecastChange,
      averagePerActiveDay,
      trendText,
      forecastText,
      recommendationText,
    };
  }, [summaryData]);

  if (loading) {
    return (
      <main className="summary-main">
        <div className="summary-empty-state">Ladataan yhteenvetoa...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="summary-main">
        <div className="summary-empty-state">{error}</div>
      </main>
    );
  }

  if (!summaryData || !insights) {
    return (
      <main className="summary-main">
        <div className="summary-empty-state">Ei yhteenvetodataa saatavilla.</div>
      </main>
    );
  }

  return (
    <main className="summary-main">
      <header className="summary-main-header">
        <h1>Asiakasmäärän kehitys: {location}</h1>
        <span>
          Näkymä näyttää toteutuneen asiakasmäärän, viime viikon muutoksen ja
          ennusteen perusteella tehdyn tulkinnan.
        </span>
      </header>

      <section className="summary-cards">
        <div className="summary-card">
          <h3>Asiakkaita yhteensä</h3>
          <p>{Math.round(insights.totalCustomers)}</p>
        </div>

        <div className="summary-card">
          <h3>Viimeinen viikko</h3>
          <p>{Math.round(insights.lastWeekCustomers)}</p>
        </div>

        <div className="summary-card">
          <h3>Muutos viikossa</h3>
          <p>{insights.weeklyChange.toFixed(1)} %</p>
        </div>

        <div className="summary-card">
          <h3>Ennuste ensi viikolle</h3>
          <p>{Math.round(insights.forecastNextWeek)}</p>
        </div>
      </section>

      <section className="summary-section">
        <h2>Mitä data kertoo?</h2>

        <div className="summary-info-grid">
          <div className="summary-info-item">
            <h4>Nykyinen trendi</h4>
            <p>{insights.trendText}</p>
          </div>

          <div className="summary-info-item">
            <h4>Ennusteen tulkinta</h4>
            <p>{insights.forecastText}</p>
          </div>

          <div className="summary-info-item">
            <h4>Suositus</h4>
            <p>{insights.recommendationText}</p>
          </div>

          <div className="summary-info-item">
            <h4>Keskimäärin aktiivisena päivänä</h4>
            <p>
              {insights.averagePerActiveDay.toFixed(1)} asiakasta / päivä
            </p>
          </div>

          <div className="summary-info-item">
            <h4>Ennuste seuraavalle kuukaudelle</h4>
            <p>{Math.round(insights.forecastNextMonth)} asiakasta</p>
          </div>

          <div className="summary-info-item">
            <h4>Datassa aktiivisia päiviä</h4>
            <p>{insights.activeDays} päivää</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default SummaryMain;