import { useEffect, useState } from "react";
import API from "../api";

/*
 * Muuntaa käyttöliittymästä saadun päivämäärän backendin odottamaan
 * YYYY-MM-DD-muotoon.
 *
 * Funktio hyväksyy joko valmiin Date-olion tai arvon, jonka JavaScript
 * pystyy muuttamaan Date-olioksi.
 *
 * Jos arvo puuttuu tai päivämäärä ei ole kelvollinen, palautetaan
 * undefined. Axios jättää undefined-arvoiset query-parametrit pois
 * lopullisesta URL-osoitteesta.
 */
function toApiDate(value) {
  if (!value) return undefined;

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return undefined;

  /*
   * Päivämäärä muodostetaan paikallisesta ajasta eikä toISOString()-metodilla.
   * Tämä estää aikavyöhykkeen aiheuttaman tilanteen, jossa päivä voisi muuttua
   * vahingossa edelliseksi tai seuraavaksi päiväksi.
   */
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/*
 * Muuntaa käyttöliittymässä näkyvän ennustejakson päivien lukumääräksi.
 *
 * Avainten täytyy vastata suodatinvalikossa käytettyjä merkkijonoja.
 * Arvo välitetään backendin predict-endpointille days-parametrina.
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
 * Hook hakee Day-näkymässä käytettävän datan backendistä.
 *
 * Nimestä huolimatta hook hakee sekä toteutunutta että ennustettua dataa:
 *
 * filters.mode === "forecast"
 *   -> GET /api/predict/
 *
 * muu tila
 *   -> GET /api/data/summary/
 *
 * Hook palauttaa aina taulukon. API-virheessä tai ennen suodattimien
 * vahvistamista palautetaan tyhjä taulukko.
 */
export function useRealData(filters) {
  /*
   * data sisältää backendistä saadut rivit sellaisina kuin endpoint
   * ne palauttaa.
   *
   * Varsinainen kenttien yhdenmukaistaminen tehdään DayMain-komponentin
   * normalizeBackendData-funktiossa.
   */
  const [data, setData] = useState([]);

  /*
   * API-kutsu suoritetaan aina, kun jokin dependency-listassa oleva
   * suodattimen arvo muuttuu.
   */
  useEffect(() => {
    /*
     * Jos käyttäjä ei ole vielä painanut suodattimien Näytä-painiketta,
     * backend-kutsua ei tehdä.
     *
     * Samalla tyhjennetään mahdollinen aiemmin haettu data, jotta
     * käyttöliittymä ei näytä vanhoilla suodattimilla haettua tulosta.
     */
    if (!filters?.hasApplied) {
      setData([]);
      return;
    }

    /*
     * Käyttäjän valitsemat toimipisteet.
     *
     * Jos arvo puuttuu, käytetään tyhjää taulukkoa. Tyhjä taulukko
     * tulkitaan myöhemmin kaikkien toimipisteiden valinnaksi.
     */
    const selectedLocations = filters.selectedLocations || [];

    /*
     * allSelected kertoo, halutaanko kaikkien toimipisteiden data.
     *
     * Kaikki tulkitaan valituksi, kun:
     * - selectedLocations on tyhjä
     * - valinnoissa on "Kaikki näytteenotot"
     */
    const allSelected =
      selectedLocations.length === 0 ||
      selectedLocations.includes("Kaikki näytteenotot");

    /*
     * Varsinainen asynkroninen hakufunktio määritellään useEffectin sisällä,
     * koska useEffectin callback-funktiota ei itsessään tehdä async-funktioksi.
     */
    async function fetchData() {
      try {
        /*
         * Ennustetilassa käytetään predict-endpointia.
         */
        if (filters.mode === "forecast") {
          /*
           * Backend tarvitsee vähintään ennustettavien päivien määrän.
           *
           * Jos forecastRange-arvoa ei löydy RANGE_DAYS-objektista,
           * käytetään oletuksena 14 päivää.
           */
          const params = {
            days: RANGE_DAYS[filters.forecastRange] || 14,
          };

          /*
           * Nykyinen predict-endpoint tukee yhtä location-parametria.
           *
           * Location lähetetään vain, kun käyttäjä on valinnut täsmälleen
           * yhden yksittäisen toimipisteen.
           *
           * Kun kaikki toimipisteet ovat valittuina, location jätetään pois.
           * Backend lataa tällöin yhdistetyn ennustemallin.
           *
           * Jos käyttäjä valitsee useita yksittäisiä toimipisteitä,
           * niitä ei nykyisellä endpointilla voi lähettää yhtenä pyyntönä.
           * Tässä tapauksessa location jätetään myös pois, jolloin backend
           * palauttaa yhdistetyn ennusteen.
           */
          if (!allSelected && selectedLocations.length === 1) {
            params.location = selectedLocations[0];
          }

          /*
           * API on projektin yhteinen Axios-instanssi.
           *
           * Sen request interceptor lisää pyyntöön JWT-headerin:
           *
           * Authorization: Bearer <access-token>
           *
           * Koska baseURL sisältää /api/-osan, relative URL "predict/"
           * muodostuu esimerkiksi osoitteeksi:
           *
           * http://127.0.0.1:8000/api/predict/?days=14&location=Lab1
           */
          const response = await API.get("predict/", { params });

          /*
           * Kehitysaikaiset lokit auttavat tarkistamaan sekä koko vastauksen
           * että varsinaisen predictions-taulukon.
           *
           * Nämä voidaan poistaa tai vaihtaa projektin loggeriin ennen
           * tuotantoon vientiä.
           */
          console.log("Prediction response:", response.data);
          console.log("Prediction rows:", response.data?.predictions);

          /*
           * Predict-endpoint palauttaa objektin:
           *
           * {
           *   days: 14,
           *   location: "Lab1",
           *   predictions: [...]
           * }
           *
           * Hook tallentaa stateen vain predictions-taulukon, koska
           * DayMain käsittelee rivejä taulukkona.
           *
           * Jos predictions puuttuu, tallennetaan turvallisesti tyhjä taulukko.
           */
          setData(response.data?.predictions || []);

          /*
           * Lopetetaan funktio tässä, jotta toteutuneen datan summary-kutsua
           * ei suoriteta ennustepyynnön jälkeen.
           */
          return;
        }

        /*
         * Toteutuneessa tilassa muodostetaan summary-endpointin parametrit.
         *
         * toApiDate palauttaa arvon YYYY-MM-DD-muodossa tai undefined,
         * jolloin puuttuvaa päivämäärää ei lisätä query-parametreihin.
         */
        const params = {
          start: toApiDate(filters.dateRange?.startDate),
          end: toApiDate(filters.dateRange?.endDate),
        };

        /*
         * Kun käyttäjä on valinnut yhden tai useamman yksittäisen
         * toimipisteen, ne lähetetään backendille pilkulla eroteltuna.
         *
         * Esimerkiksi:
         *
         * ["Lab1", "Lab2"] -> "Lab1,Lab2"
         *
         * Axios muodostaa tästä query-parametrin:
         *
         * ?locations=Lab1%2CLab2
         */
        if (!allSelected) {
          params.locations = selectedLocations.join(",");
        }

        /*
         * Toteutunut data haetaan summary-endpointista.
         *
         * Esimerkiksi:
         *
         * GET /api/data/summary/?start=2026-07-01&end=2026-07-31&locations=Lab1
         */
        const response = await API.get("data/summary/", { params });

        /*
         * Kehitysaikainen loki backendin palauttamalle summary-datalle.
         */
        console.log("Summary data:", response.data);

        /*
         * Endpoint voi palauttaa datan kahdessa muodossa:
         *
         * 1. Suora taulukko:
         *    [...]
         *
         * 2. Sivutettu tai kääritty vastaus:
         *    {
         *      results: [...]
         *    }
         *
         * Molemmat muunnetaan hookin näkökulmasta aina taulukoksi.
         */
        setData(
          Array.isArray(response.data)
            ? response.data
            : response.data?.results || []
        );
      } catch (error) {
        /*
         * Virheviesti valitaan sen mukaan, yritettiinkö hakea ennustetta
         * vai toteutunutta yhteenvetodataa.
         *
         * Axios-virheessä backendin palauttama sisältö löytyy yleensä
         * error.response.data-kentästä.
         *
         * Jos responsea ei ole, lokitetaan alkuperäinen error-olio.
         */
        console.error(
          filters.mode === "forecast"
            ? "Ennusteen haku epäonnistui:"
            : "Yhteenvetodatan haku epäonnistui:",
          error.response?.data || error
        );

        /*
         * Virhetilanteessa vanha data tyhjennetään, jotta käyttöliittymä
         * ei näytä edellisen onnistuneen pyynnön tuloksia uusien
         * suodattimien alla.
         */
        setData([]);
      }
    }

    /*
     * Käynnistetään backend-haku.
     *
     * Promisea ei tarvitse palauttaa useEffectista, koska useEffect saa
     * palauttaa vain cleanup-funktion tai ei mitään.
     */
    fetchData();
  }, [
    /*
     * Haku suoritetaan uudelleen, kun käyttäjä vahvistaa suodattimet.
     */
    filters?.hasApplied,

    /*
     * Haku suoritetaan uudelleen, kun vaihdetaan toteutuneen datan ja
     * ennusteen välillä.
     */
    filters?.mode,

    /*
     * Ennustejakson muutos vaikuttaa predict-endpointin days-parametriin.
     */
    filters?.forecastRange,

    /*
     * Toteutuneen datan alku- ja loppupäivän muutokset käynnistävät
     * uuden summary-haun.
     */
    filters?.dateRange?.startDate,
    filters?.dateRange?.endDate,

    /*
     * selectedLocations on taulukko.
     *
     * JSON.stringify muuntaa sen merkkijonoksi, jotta useEffect vertaa
     * valintojen sisältöä eikä pelkästään taulukko-olion viitettä.
     *
     * Tämä toimii nykyisessä tapauksessa, koska taulukko sisältää
     * yksinkertaisia merkkijonoarvoja.
     */
    JSON.stringify(filters?.selectedLocations || []),
  ]);

  /*
   * Hook palauttaa backendistä saadun rivitaulukon.
   */
  return data;
}