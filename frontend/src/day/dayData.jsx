// Tarvitaan useEffect, jotta saadaan asioita tapahtumaan, kun sivu latautuu. Missä kaikkialla oikeestaan tarvitaan react-importtia...
import { useEffect } from "react";
// Tarvitaan API, joka importataan api.js -tiedostosta, joka viittaa apin urliin ja API luodaan käyttäen axiosia.
import API from "../api";

const locations = ["Lab1", "Lab2", "Lab3", "Lab4", "Lab5", "Lab6"];

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

// Generoi satunnaisen datan
function createRandomData() {
  const data2 = [];
  const startDate = new Date("2026-01-01");
  const days = 181;

  for (let day = 0; day < days; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + day);

    locations.forEach((location, index) => {
      const weeklyPattern = Math.sin(day / 7) * 18;
      const monthlyPattern = Math.sin(day / 30) * 28;
      const locationBase = 80 + index * 22;
      const noise = ((day * 13 + index * 17) % 31) - 15;

      const realized = Math.max(
        20,
        Math.round(locationBase + weeklyPattern + monthlyPattern + noise)
      );

      const forecast = Math.max(
        20,
        Math.round(
          locationBase +
            weeklyPattern * 0.8 +
            monthlyPattern * 1.1 +
            noise * 0.5 +
            10
        )
      );

      data2.push({
        date: formatDate(currentDate),
        location,
        realized,
        forecast,
      });
    });
  }

  return data2;
}

const dayData2 = createRandomData();

// Tällä tavoin saadaan oikea data.
function getRealData() {
  /*
  Ensin Reactin taikaa:
  Luodaan lista, johon saadaan useEffectin avulla data ja luodaan funktio datan muuttamiseen.
  useEffect palauttaa nämä oletuksena, eli datan nykyisen arvon ja funktion, jolla sitä muutetaan.
  Tätä funktiota ei tarvitse erikseen määritellä. useEffectin "parametrina" lista, eli palauttaa datan listana.
  */
  const [data, setData] = useEffect([]);
  /*
  Sitten haetaan datan url-osoite, johon axios antaa alkuosan ja tarvitaan vain tuo loppu. Tämä tehdään API .get() -komennolla.
  Tässä komennossa/pyynnössä (get) kestää, joten laitetaan sen jälkeen .then() (eli suoritetaan vasta, kun pyyntö on käsitelty)
  Tää on kai sitten PROMISE.
  then():lle annetaan parametriksi res, joka on vain tapa nimetä tavara, joka saadaan vastauksena pyyntöön. res lienee yleisin nimi.
  Tämän jälkeen kutsutaan setDataa, joka muuttaa datan arvon res.datan arvoksi.
  Huomaa myös, ettei tätä koko roskaa varsinaisesti kutsuta, vaan pelkästään määritellään, eli JavaScript hoitaa kutsumisen.
  */
  API.get("data/")
    .then((res) => {
      setData(res.data);
    })
  
    return data;

}

export default dayData2;