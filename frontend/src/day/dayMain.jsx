import "./dayMain.css";

import WaitingState from "../waitingState.jsx";
import { useRealData } from "./dayData.jsx";
import DayStat from "./dayStat.jsx";

/*
 * Värit, joita käytetään eri toimipisteiden kuvaajissa.
 * Avaimen täytyy vastata backendistä tai suodattimista tulevaa
 * location-arvoa. Jos toimipisteelle ei löydy väriä tästä objektista,
 * komponentti käyttää myöhemmin oletusvärinä sinistä.
 */
const COLORS = {
  "Kaikki näytteenotot": "#2563eb",
  Lab1: "#2563eb",
  Lab2: "#f97316",
  Lab3: "#16a34a",
  Lab4: "#9333ea",
  Lab5: "#dc2626",
  Lab6: "#0891b2",
};

/*
 * Ennustesuodattimen käyttöliittymässä näkyvä tekstiarvo
 * muunnetaan tämän objektin avulla päivien lukumääräksi.
 * Esimerkiksi:
 * "2 viikkoa" -> 14 päivää
 * "Kuukausi"  -> 30 päivää
 */
const RANGE_DAYS = {
  "2 viikkoa": 14,
  "3 viikkoa": 21,
  Kuukausi: 30,
  "2 kuukautta": 60,
  "3 kuukautta": 90,
  "6 kuukautta": 180,
};

/*
 * Muuntaa annetun arvon JavaScriptin Date-olioksi.
 * Funktio hyväksyy:
 * - valmiin Date-olion
 * - päivämäärämerkkijonon
 * - muun new Date(...) -rakentajalle kelpaavan arvon
 * Jos arvoa ei ole, palautetaan null.
 * Huomio:
 * Tämä funktio ei vielä tarkista, syntyikö päivämäärästä kelvollinen.
 * Nykyisessä käyttötavassa backendiltä ja suodattimilta oletetaan
 * tulevan kelvollisia päivämääriä.
 */
function toDate(value) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
}

/*
 * Muuntaa päivämäärän päivän alkuun.
 * Kellonaika asetetaan arvoon 00:00:00.000.
 * Tätä käytetään, jotta päivämääriä voidaan vertailla ilman,
 * että kellonaika vaikuttaa vertailuun.
 * Esimerkiksi:
 * 2026-07-16 14:30
 * muuttuu muotoon:
 * 2026-07-16 00:00
 */
function startOfDay(value) {
  const date = toDate(value);

  if (!date) {
    return null;
  }

  /*
   * Luodaan uusi Date-olio.
   * Näin alkuperäistä Date-oliota ei muokata vahingossa.
   */
  const normalizedDate = new Date(date);

  normalizedDate.setHours(0, 0, 0, 0);

  return normalizedDate;
}

/*
 * Palauttaa annettua päivämäärää seuraavan päivän.
 * Päivämäärä normalisoidaan ensin päivän alkuun.
 * Tätä käytetään toteutuneen datan aikavälin loppupäivän
 * muuttamiseen exclusive-muotoon.
 * Esimerkiksi käyttäjän valitsema loppupäivä:
 * 2026-07-16
 * muutetaan vertailua varten muotoon:
 * 2026-07-17
 * jolloin voidaan käyttää ehtoa:
 * itemDate < endDateExclusive
 */
function addOneDay(value) {
  const date = startOfDay(value);

  if (!date) {
    return null;
  }

  date.setDate(date.getDate() + 1);

  return date;
}

/*
 * Muotoilee päivämäärän graafissa näytettävään lyhyeen muotoon.
 * Esimerkiksi:
 * "2026-07-16" -> "16.7."
 */
function formatDate(dateString) {
  const date = new Date(dateString);

  return `${date.getDate()}.${date.getMonth() + 1}.`;
}

/*
 * Muuntaa backendin palauttaman datan frontendin graafin
 * käyttämään yhdenmukaiseen muotoon.
 * Toteutuneen datan ja ennustedatan vastaukset voivat käyttää
 * eri kenttänimiä. Tämän funktion tarkoitus on piilottaa nämä
 * erot muulta komponentilta.
 * Komponentin muu logiikka voi tämän jälkeen aina käyttää kenttiä:
 * {
 *   id,
 *   date,
 *   location,
 *   realized,
 *   forecast,
 *   holiday
 * }
 */
function normalizeBackendData(rows) {
  /*
   * Suojataan komponentti virheelliseltä API-vastaukselta.
   * Jos rows ei ole taulukko, palautetaan tyhjä taulukko.
   * Näin myöhempi rows.map(...) ei aiheuta runtime-virhettä.
   */
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row, index) => {
    /*
     * Backendin ennustearvolle tuetaan useita mahdollisia kenttänimiä.
     * Tämän projektin nykyinen PredictionService palauttaa arvon kentässä:
     * predicted_patient_count
     * Muut nimet pidetään mukana yhteensopivuuden vuoksi.
     * Nullish coalescing -operaattori ?? valitsee ensimmäisen arvon,
     * joka ei ole null eikä undefined.
     * Arvo 0 hyväksytään siis oikein eikä sitä ohiteta.
     */
    const forecastValue =
      row.forecast ??
      row.prediction ??
      row.predicted_patient_count ??
      row.predicted_samples ??
      row.predicted_samples_taken ??
      row.predicted_value ??
      row.samples_prediction ??
      row.value ??
      0;

    return {
      /*
       * Käytetään backendin id:tä, jos se löytyy.
       * Ennusteriveillä ei välttämättä ole tietokannan id:tä,
       * joten niille muodostetaan vakaa varatunniste toimipisteestä,
       * päivämäärästä tai taulukon indeksistä.
       */
      id:
        row.id ??
        `${row.location || "unknown"}-${row.date || index}`,

      /*
       * Toteutuneessa ja ennustedatassa päivämäärä voi tulla
       * eri kenttänimellä.
       * timestamp voi olla esimerkiksi:
       * "2026-07-16T08:30:00Z"
       * split("T")[0] ottaa siitä vain päivämääräosan:
       * "2026-07-16"
       */
      date:
        row.date ||
        row.prediction_date ||
        row.timestamp?.split("T")[0],

      /*
       * Käytetään backendin location-arvoa.
       * Jos sitä ei ole, kokeillaan location_name-kenttää.
       * Viimeisenä oletuksena käytetään yhdistettyä näkymää.
       */
      location:
        row.location ||
        row.location_name ||
        "Kaikki näytteenotot",

      /*
       * Toteutuneen datan määrä.
       * Summary-endpoint voi palauttaa arvon esimerkiksi kentässä
       * samples_taken.
       * Number(...) varmistaa, että myös merkkijonona tullut numero
       * muunnetaan oikeaksi numeroksi.
       */
      realized: Number(
        row.realized ??
        row.samples_taken ??
        0
      ),

      /*
       * Ennustettu arvo tallennetaan frontendissä aina forecast-kenttään.
       * Tämä mahdollistaa sen, että muu komponentti voi käyttää samaa
       * kenttää riippumatta backendin alkuperäisestä kenttänimestä.
       */
      forecast: Number(forecastValue),

      /*
       * PredictionService palauttaa holiday-kentän boolean-arvona.
       * Boolean(...) varmistaa, että arvo on frontendissä aina true
       * tai false.
       */
      holiday: Boolean(row.holiday),
    };
  });
}

/*
 * Lisää puuttuvat kalenteripäivät dataan nolla-arvoilla.
 * Tämä on tärkeää erityisesti toteutuneessa datassa, koska tietokannassa
 * ei välttämättä ole riviä päivälle, jolloin näytteitä ei otettu.
 * Ilman täydennystä graafi voisi yhdistää esimerkiksi perjantain suoraan
 * maanantaihin eikä näyttäisi viikonlopun nollapäiviä.
 * Funktio käsittelee jokaisen toimipisteen erikseen.
 */
function fillMissingDates(data) {
  /*
   * Tyhjälle datalle ei tarvitse tehdä mitään.
   */
  if (!data.length) {
    return [];
  }

  /*
   * Kopioidaan taulukko ennen lajittelua.
   * [...data] estää alkuperäisen taulukon muuttamisen.
   */
  const sorted = [...data].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  /*
   * Kerätään kaikki datassa esiintyvät toimipisteet.
   * Set poistaa duplikaatit.
   */
  const locations = [
    ...new Set(sorted.map((item) => item.location)),
  ];

  /*
   * Aikaväli alkaa datan ensimmäisestä päivämäärästä
   * ja päättyy viimeiseen päivämäärään.
   */
  const start = startOfDay(sorted[0].date);
  const end = startOfDay(sorted[sorted.length - 1].date);

  /*
   * Luodaan nopeaa hakua varten Map.
   * Avaimen muoto:
   * "2026-07-16-Lab1"
   * Arvona on kyseisen päivän ja toimipisteen alkuperäinen datarivi.
   */
  const existing = new Map(
    sorted.map((item) => [
      `${item.date}-${item.location}`,
      item,
    ])
  );

  /*
   * Tänne kerätään lopullinen yhtenäinen päiväkohtainen data.
   */
  const filled = [];

  /*
   * Aloitetaan aikavälin ensimmäisestä päivästä.
   * Käytetään kopiota, jotta start-arvoa ei muokata.
   */
  const current = new Date(start);

  /*
   * Käydään kaikki päivät läpi ensimmäisestä viimeiseen.
   */
  while (current <= end) {
    /*
     * Muutetaan päivämäärä backendin ja frontendin yhteisesti
     * käyttämään YYYY-MM-DD-muotoon.
     */
    const dateString = current.toISOString().split("T")[0];

    /*
     * Jokaiselle päivälle luodaan tai löydetään rivi
     * jokaiselle toimipisteelle.
     */
    locations.forEach((location) => {
      const key = `${dateString}-${location}`;

      /*
       * Jos alkuperäinen rivi löytyy, käytetään sitä.
       * Muussa tapauksessa lisätään nollarivi.
       */
      filled.push(
        existing.get(key) || {
          date: dateString,
          location,
          realized: 0,
          forecast: 0,
          holiday: false,
        }
      );
    });

    /*
     * Siirrytään seuraavaan kalenteripäivään.
     */
    current.setDate(current.getDate() + 1);
  }

  return filled;
}

/*
 * DayMain on Day-näkymän pääkomponentti.
 * Sen vastuulla on:
 * 1. hakea data useRealData-hookilla
 * 2. normalisoida backendin vastaus
 * 3. suodattaa data päivämäärien ja toimipisteiden mukaan
 * 4. yhdistää toimipisteet tarvittaessa päivätasolle
 * 5. laskea SVG-graafin koordinaatit
 * 6. renderöidä graafi ja tilastot
 */
function DayMain({ filters }) {
  /*
   * useRealData vastaa backend-kutsusta.
   * Hook hakee joko:
   * - toteutuneen datan data/summary/-endpointista
   * - ennustedatan predict/-endpointista
   * riippuen filters.mode-arvosta.
   */
  const backendData = useRealData(filters);

  /*
   * Muutetaan API-vastaus graafin käyttämään yhteiseen muotoon.
   */
  const dayData = normalizeBackendData(backendData);

  /*
   * Näitä lokituksia voidaan käyttää kehityksen ja integraatioiden
   * tarkistamiseen.
   * Tuotantoversiossa ne voidaan myöhemmin poistaa tai korvata
   * erillisellä debug-loggerilla.
   */
  console.log("Backend data:", backendData);
  console.log("Normalisoitu data:", dayData);

  /*
   * Ennen Näytä-painikkeen painamista näytetään WaitingState.
   * hasApplied kertoo, onko käyttäjä vahvistanut suodattimet.
   */
  if (!filters?.hasApplied) {
    return (
      <main className="day-main">
        <WaitingState />
      </main>
    );
  }

  /*
   * Näkymällä on kaksi tilaa:
   * realized = toteutunut historiallinen data
   * forecast = tulevaisuuden ennuste
   * Jos mode puuttuu, käytetään oletuksena toteutunutta dataa.
   */
  const mode = filters.mode || "realized";

  /*
   * valueKey kertoo, kumpaa normalisoidun datan kenttää
   * graafi ja tilastot käyttävät.
   */
  const valueKey =
    mode === "forecast"
      ? "forecast"
      : "realized";

  /*
   * Käyttäjän valitsemat toimipisteet.
   * Jos arvoa ei ole, oletetaan että kaikki toimipisteet on valittu.
   */
  const selectedLocations =
    filters.selectedLocations || [
      "Kaikki näytteenotot",
    ];

  /*
   * allSelected on true, kun:
   * - valinta on tyhjä
   * - valinnassa on "Kaikki näytteenotot"
   */
  const allSelected =
    selectedLocations.length === 0 ||
    selectedLocations.includes(
      "Kaikki näytteenotot"
    );

  /*
   * Täydennetään puuttuvat päivät.
   * Tämän jälkeen poistetaan mahdolliset virheelliset rivit,
   * joilta puuttuu päivämäärä tai toimipiste.
   * Lopuksi data järjestetään aikajärjestykseen.
   */
  const sourceData = fillMissingDates(dayData)
    .filter(
      (item) =>
        item.date &&
        item.location
    )
    .sort(
      (a, b) =>
        new Date(a.date) -
        new Date(b.date)
    );

  /*
   * Jos API ei palauttanut käyttökelpoista dataa,
   * näytetään tyhjä tila.
   * Tämä voi johtua esimerkiksi:
   * - tietokannassa ei ole dataa
   * - ennustemallia ei löydy
   * - API-kutsu epäonnistui
   * - valituilla suodattimilla ei ole rivejä
   * Tulevaisuudessa virhetila ja aidosti tyhjä data kannattaa
   * erottaa toisistaan useRealData-hookin error-arvon avulla.
   */
  if (sourceData.length === 0) {
    return (
      <main className="day-main">
        <div className="day-empty-state">
          Ei vielä näytettävää dataa.
        </div>
      </main>
    );
  }

  /*
   * Nykyinen päivä normalisoidaan päivän alkuun.
   * Ennustetilassa aikaväli alkaa tästä päivästä.
   */
  const today = startOfDay(new Date());

  /*
   * Toteutuneessa tilassa ensimmäinen päivä tulee datasta.
   * Ennustetilassa ensimmäinen päivä on nykyinen päivä.
   */
  const firstDate =
    mode === "forecast"
      ? today
      : startOfDay(sourceData[0]?.date);

  /*
   * Muutetaan käyttöliittymässä valittu ennustejakso
   * päivien lukumääräksi.
   * Jos valintaa ei löydy RANGE_DAYS-objektista,
   * käytetään oletuksena 14 päivää.
   */
  const forecastDays =
    RANGE_DAYS[filters.forecastRange] || 14;

  /*
   * Lasketaan ennustejakson loppu.
   * Loppupäivä on exclusive eli sitä ei oteta mukaan
   * myöhemmässä vertailussa.
   */
  const forecastEndDate = new Date(firstDate);

  forecastEndDate.setDate(
    forecastEndDate.getDate() + forecastDays
  );

  /*
   * Toteutuneessa tilassa alkupäivä tulee päivämääräsuodattimesta.
   * Ennustetilassa alkupäivä on nykyinen päivä.
   */
  const startDate =
    mode === "forecast"
      ? firstDate
      : startOfDay(
          filters.dateRange?.startDate
        );

  /*
   * Aikavälin loppu käsitellään exclusive-arvona.
   * Ennustetilassa käytetään laskettua forecastEndDate-arvoa.
   * Toteutuneessa tilassa käytetään joko:
   * - valmiiksi annettua endDateExclusive-arvoa
   * - tai käyttäjän loppupäivää + yksi päivä
   */
  const endDateExclusive =
    mode === "forecast"
      ? forecastEndDate
      : startOfDay(
          filters.dateRange?.endDateExclusive ||
            addOneDay(
              filters.dateRange?.endDate
            )
        );

  /*
   * Rajataan data valittujen toimipisteiden ja päivämäärien mukaan.
   */
  const baseFilteredData = sourceData.filter(
    (item) => {
      const itemDate = startOfDay(item.date);

      /*
       * Toimipiste hyväksytään, jos kaikki ovat valittuina
       * tai kyseinen toimipiste löytyy käyttäjän valinnoista.
       */
      const locationMatches =
        allSelected ||
        selectedLocations.includes(
          item.location
        );

      /*
       * Päivämäärä hyväksytään, jos:
       * - aikarajaa ei ole
       * - tai päivä on vähintään alkupäivä
       * - ja pienempi kuin exclusive-loppupäivä
       */
      const dateMatches =
        !startDate ||
        !endDateExclusive ||
        (
          itemDate >= startDate &&
          itemDate < endDateExclusive
        );

      return (
        locationMatches &&
        dateMatches
      );
    }
  );

  /*
   * Kun käyttäjä valitsee kaikki toimipisteet,
   * toimipistekohtaiset arvot summataan päivätasolle.
   * Esimerkiksi:
   * 16.7. Lab1 = 100
   * 16.7. Lab2 = 50
   * muuttuu muotoon:
   * 16.7. Kaikki näytteenotot = 150
   * Jos käyttäjä on valinnut vain tietyt toimipisteet,
   * data jätetään toimipistekohtaiseksi.
   */
  const filteredData = allSelected
    ? Object.values(
        baseFilteredData.reduce(
          (accumulator, item) => {
            /*
             * Luodaan päivälle summakohde ensimmäisen rivin kohdalla.
             */
            if (!accumulator[item.date]) {
              accumulator[item.date] = {
                date: item.date,
                location:
                  "Kaikki näytteenotot",
                realized: 0,
                forecast: 0,
              };
            }

            /*
             * Lisätään saman päivän toteutuneet ja ennustetut arvot
             * päivän kokonaismäärään.
             */
            accumulator[
              item.date
            ].realized += item.realized;

            accumulator[
              item.date
            ].forecast += item.forecast;

            return accumulator;
          },
          {}
        )
      )
    : baseFilteredData;

  /*
   * Kerätään graafissa näytettävät toimipisteet.
   * Set poistaa mahdolliset duplikaatit.
   */
  const locations = [
    ...new Set(
      filteredData.map(
        (item) => item.location
      )
    ),
  ];

  /*
   * Kerätään graafin x-akselilla käytettävät päivämäärät.
   * Jokainen päivämäärä esiintyy listassa vain kerran.
   */
  const dates = [
    ...new Set(
      filteredData.map(
        (item) => item.date
      )
    ),
  ].sort(
    (a, b) =>
      new Date(a) -
      new Date(b)
  );

  /*
   * Tilastokomponentille välitetään vain positiiviset arvot.
   * Näin automaattisesti lisätyt nollapäivät eivät vääristä
   * esimerkiksi keskiarvoa.
   * Huomio:
   * Jos nollapäivät halutaan myöhemmin mukaan tilastoihin,
   * tämä suodatus täytyy poistaa tai muuttaa.
   */
  const statisticsData = filteredData.filter(
    (item) => item[valueKey] > 0
  );

  /*
   * Etsitään graafin suurin arvo.
   * Vähimmäisarvo 10 estää y-akselin korkeuden romahtamisen,
   * jos kaikki arvot ovat hyvin pieniä tai nollia.
   */
  const maxValue = Math.max(
    10,
    ...filteredData.map(
      (item) => item[valueKey]
    )
  );

  /*
   * Pyöristetään y-akselin enimmäisarvo seuraavaan 50:n monikertaan.
   * Esimerkiksi:
   * 123 -> 150
   * 201 -> 250
   */
  const roundedMaxValue =
    Math.ceil(maxValue / 50) * 50;

  /*
   * SVG:n sisäinen koordinaatisto.
   * viewBox käyttää näitä arvoja riippumatta siitä,
   * minkä kokoisena SVG näytetään CSS:llä.
   */
  const width = 550;
  const height = 380;

  /*
   * Graafin sisäiset marginaalit.
   * Niiden sisälle jää varsinainen piirtoalue.
   */
  const padding = {
    top: 28,
    right: 26,
    bottom: 46,
    left: 54,
  };

  /*
   * Varsinaisen piirtoalueen leveys ja korkeus.
   */
  const innerWidth =
    width -
    padding.left -
    padding.right;

  const innerHeight =
    height -
    padding.top -
    padding.bottom;

  /*
   * Muuntaa päivämäärän SVG:n x-koordinaatiksi.
   * Päivämäärän sijainti perustuu sen indeksiin dates-taulukossa.
   */
  const getX = (date) => {
    const index = dates.indexOf(date);

    /*
     * Jos graafissa on vain yksi päivä,
     * piste sijoitetaan keskelle piirtoaluetta.
     */
    if (dates.length <= 1) {
      return (
        padding.left +
        innerWidth / 2
      );
    }

    /*
     * Muutoin päivät jaetaan tasaisesti koko piirtoalueelle.
     */
    return (
      padding.left +
      (
        index /
        (dates.length - 1)
      ) *
        innerWidth
    );
  };

  /*
   * Muuntaa näytemäärän SVG:n y-koordinaatiksi.
   * SVG-koordinaatistossa y kasvaa alaspäin.
   * Siksi arvo vähennetään piirtoalueen alareunasta.
   */
  const getY = (value) => {
    return (
      padding.top +
      innerHeight -
      (
        value /
        roundedMaxValue
      ) *
        innerHeight
    );
  };

  /*
   * Muodostaa yhdelle toimipisteelle SVG path -merkkijonon.
   * Esimerkiksi:
   * M 54 200 L 90 180 L 126 210
   * M tarkoittaa ensimmäiseen pisteeseen siirtymistä.
   * L tarkoittaa viivan piirtämistä seuraavaan pisteeseen.
   */
  const getPath = (location) => {
    const points = dates
      .map((date) => {
        /*
         * Etsitään kyseisen päivän ja toimipisteen datarivi.
         */
        const item = filteredData.find(
          (entry) =>
            entry.date === date &&
            entry.location === location
        );

        if (!item) {
          return null;
        }

        return {
          x: getX(date),
          y: getY(item[valueKey]),
        };
      })
      .filter(Boolean);

    return points
      .map((point, index) =>
        index === 0
          ? `M ${point.x} ${point.y}`
          : `L ${point.x} ${point.y}`
      )
      .join(" ");
  };

  /*
   * X-akselilla näytetään enintään noin kymmenen päivämäärätekstiä.
   * Jos päiviä on paljon, kaikkien tekstien näyttäminen
   * tekisi akselista vaikealukuisen.
   */
  const labelStep = Math.max(
    1,
    Math.ceil(dates.length / 10)
  );

  /*
   * Valitaan x-akselille näytettävät päivämäärät.
   */
  const visibleDateLabels = dates.filter(
    (_, index) =>
      index % labelStep === 0
  );

  /*
   * Yksittäiset datapisteet näytetään vain,
   * jos päivämääriä on enintään 45.
   * Pitkällä aikavälillä pisteitä olisi muuten liikaa
   * ja graafista tulisi sekava.
   */
  const showDots = dates.length <= 45;

  return (
    <main className="day-main">
      {/*
       * Näkymän otsikkoalue.
       */}
      <div className="day-main-header">
        <div>
          <h1>
            {mode === "realized"
              ? "Toteutuneet näytteet"
              : "Ennustetut näytteet"}
          </h1>

          {/*
           * Näytetään joko kaikkien toimipisteiden teksti
           * tai käyttäjän valitsemat toimipisteet.
           */}
          <span>
            {allSelected
              ? "Kaikki näytteenotot"
              : selectedLocations.join(", ")}
          </span>
        </div>
      </div>

      {/*
       * Sisältöalueessa graafi ja tilastot ovat vierekkäin.
       */}
      <div className="day-content-layout">
        <section className="day-chart-card">
          {/*
           * Jos suodatuksen jälkeen ei jää rivejä,
           * näytetään suodatinkohtainen tyhjä tila.
           */}
          {filteredData.length === 0 ? (
            <div className="day-empty-state">
              Ei dataa valituilla suodattimilla
            </div>
          ) : (
            <>
              {/*
               * Graafin yläosassa näkyvät selite ja aikaväli.
               */}
              <div className="day-chart-top">
                <div className="day-chart-legend">
                  {locations.map((location) => (
                    <span
                      key={location}
                      className="day-legend-item"
                    >
                      {/*
                       * Selitteen värillinen merkki.
                       */}
                      <i
                        style={{
                          backgroundColor:
                            COLORS[location] ||
                            "#2563eb",
                        }}
                      />

                      {location}
                    </span>
                  ))}
                </div>

                {/*
                 * Ennustetilassa näytetään käyttäjän valitsema jakso.
                 * Toteutuneessa tilassa näytetään datan ensimmäinen
                 * ja viimeinen päivämäärä.
                 */}
                <span className="day-chart-range">
                  {mode === "forecast"
                    ? filters.forecastRange
                    : `${formatDate(
                        dates[0]
                      )}–${formatDate(
                        dates[
                          dates.length - 1
                        ]
                      )}`}
                </span>
              </div>

              <div className="day-line-chart-wrapper">
                <svg
                  className="day-line-chart"
                  viewBox={`0 0 ${width} ${height}`}
                  preserveAspectRatio="xMidYMid meet"
                  role="img"
                  aria-label={
                    mode === "forecast"
                      ? "Ennustettujen näytteiden kuvaaja"
                      : "Toteutuneiden näytteiden kuvaaja"
                  }
                >
                  {/*
                   * Piirretään viisi vaakasuuntaista apuviivaa:
                   * 0 %
                   * 25 %
                   * 50 %
                   * 75 %
                   * 100 %
                   * Samalla piirretään y-akselin lukuarvot.
                   */}
                  {[0, 0.25, 0.5, 0.75, 1].map(
                    (step) => {
                      const value = Math.round(
                        roundedMaxValue * step
                      );

                      const y = getY(value);

                      return (
                        <g key={step}>
                          <line
                            x1={padding.left}
                            x2={
                              width -
                              padding.right
                            }
                            y1={y}
                            y2={y}
                            stroke="#e5e7eb"
                            strokeWidth="1"
                          />

                          <text
                            x={
                              padding.left - 12
                            }
                            y={y + 4}
                            textAnchor="end"
                            fontSize="12"
                            fill="#64748b"
                          >
                            {value}
                          </text>
                        </g>
                      );
                    }
                  )}

                  {/*
                   * Piirretään jokaiselle toimipisteelle oma viiva.
                   * Ennustetilassa viiva esitetään katkoviivana.
                   */}
                  {locations.map((location) => (
                    <path
                      key={location}
                      d={getPath(location)}
                      fill="none"
                      stroke={
                        COLORS[location] ||
                        "#2563eb"
                      }
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={
                        mode === "forecast"
                          ? "8 6"
                          : undefined
                      }
                    />
                  ))}

                  {/*
                   * Piirretään yksittäiset datapisteet,
                   * jos päivien määrä ei ole liian suuri.
                   */}
                  {showDots &&
                    filteredData.map(
                      (item, index) => (
                        <circle
                          key={`${item.date}-${item.location}-${index}`}
                          cx={getX(item.date)}
                          cy={getY(
                            item[valueKey]
                          )}
                          r="4"
                          fill={
                            COLORS[
                              item.location
                            ] || "#2563eb"
                          }
                          stroke="#ffffff"
                          strokeWidth="2"
                        >
                          {/*
                           * SVG:n title näkyy selaimen tooltipinä,
                           * kun käyttäjä vie hiiren pisteen päälle.
                           */}
                          <title>
                            {item.location}{" "}
                            {formatDate(
                              item.date
                            )}
                            : {item[valueKey]}
                          </title>
                        </circle>
                      )
                    )}

                  {/*
                   * Piirretään valitut päivämäärät x-akselille.
                   */}
                  {visibleDateLabels.map(
                    (date) => (
                      <text
                        key={date}
                        x={getX(date)}
                        y={height - 14}
                        textAnchor="middle"
                        fontSize="12"
                        fill="#64748b"
                      >
                        {formatDate(date)}
                      </text>
                    )
                  )}
                </svg>
              </div>
            </>
          )}
        </section>

        {/*
         * DayStat saa saman suodatetun datan kuin graafi.
         * valueKey kertoo DayStatille, lasketaanko tilastot
         * toteutuneesta vai ennustetusta arvosta.
         */}
        <aside className="day-stat-column">
          <DayStat
            data={statisticsData}
            valueKey={valueKey}
          />
        </aside>
      </div>
    </main>
  );
}

export default DayMain;