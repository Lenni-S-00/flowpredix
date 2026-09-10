
// Ennusteen tarkkuus -kortti.
import "./predictionAccuracy.css";


// Muodostaa käyttäjälle helposti ymmärrettävän
// sanallisen arvion ennustemallin tarkkuudesta.
function getAccuracyAssessment(model) {
  // Jos tarvittavia tarkkuusarvoja ei ole,
  // arviota ei voida muodostaa luotettavasti.
  if (
    model?.r2 == null ||
    model?.mae == null ||
    model?.mse == null
  ) {
    return {
      label: "Ei arvioitavissa",
      description:
        "Mallin tarkkuudesta ei ole riittävästi tietoa.",
    };
  }

  // Muutetaan backendin arvot numeroiksi.
  const r2 = Number(model.r2);
  const mae = Number(model.mae);
  const mse = Number(model.mse);

  // RMSE lasketaan MSE-arvosta.
  //
  // RMSE on helpommin tulkittava kuin MSE,
  // koska se on samassa yksikössä kuin
  // ennustettava näytemäärä.
  const rmse = Math.sqrt(mse);

  // Verrataan RMSE:tä MAE:hen.
  //
  // Jos RMSE on selvästi MAE:ta suurempi,
  // mallissa esiintyy todennäköisesti
  // yksittäisiä suuria ennustevirheitä.
  const errorRatio =
    mae > 0
      ? rmse / mae
      : 1;

  // R² toimii tarkkuusarvion päämittarina.
  //
  // Pisteet:
  // 4 = erittäin hyvä
  // 3 = hyvä
  // 2 = kohtalainen
  // 1 = heikko
  // 0 = erittäin heikko
  let score;

  if (r2 >= 0.9) {
    score = 4;
  } else if (r2 >= 0.75) {
    score = 3;
  } else if (r2 >= 0.5) {
    score = 2;
  } else if (r2 >= 0) {
    score = 1;
  } else {
    score = 0;
  }

  // Jos RMSE on huomattavasti MAE:ta suurempi,
  // mallissa on tavallista suurempia yksittäisiä
  // ennustevirheitä.
  //
  // Tällöin sanallista arviota lasketaan
  // yhdellä tasolla.
  if (errorRatio >= 1.8) {
    score -= 1;
  }

  // Varmistetaan, että pisteet pysyvät
  // välillä 0–4.
  score = Math.max(
    0,
    Math.min(4, score)
  );

  // Käyttäjälle näytettävät sanalliset arviot.
  const assessments = [
    {
      label: "Erittäin heikko",
      description:
        "Ennusteeseen liittyy huomattavaa epävarmuutta ja sitä tulee käyttää vain suuntaa-antavana tietona.",
    },
    {
      label: "Heikko",
      description:
        "Ennusteen tarkkuus on rajallinen ja tuloksia kannattaa tulkita varauksella.",
    },
    {
      label: "Kohtalainen",
      description:
        "Ennuste antaa hyödyllistä suuntaa, mutta yksittäisissä tilanteissa voi esiintyä merkittäviä poikkeamia.",
    },
    {
      label: "Hyvä",
      description:
        "Mallin ennustetarkkuus on hyvä ja ennuste soveltuu päätöksenteon tueksi.",
    },
    {
      label: "Erittäin hyvä",
      description:
        "Malli ennustaa testidataa erittäin hyvin ja ennusteen epävarmuus on vähäinen.",
    },
  ];

  // Palautetaan sanallinen arvio sekä
  // tekniset arvot mahdollista lisänäyttöä varten.
  return {
    ...assessments[score],
    r2,
    mae,
    mse,
    rmse,
    errorRatio,
  };
}


// Ennusteen tarkkuuden käyttöliittymäkomponentti.
function PredictionAccuracy({
  model,
  loading = false,
  error = null,
}) {
  // Näytetään lataustila tiedonhaun aikana.
  if (loading) {
    return (
      <div className="prediction-accuracy">
        <span>
          Ennusteen tarkkuustietoja ladataan...
        </span>
      </div>
    );
  }

  // Näytetään virhe, jos tarkkuustietojen
  // hakeminen backendistä epäonnistui.
  if (error) {
    return (
      <div className="prediction-accuracy">
        <span>
          Ennusteen tarkkuustietoja ei voitu hakea.
        </span>
      </div>
    );
  }

  // Jos mallia ei löytynyt,
  // näytetään käyttäjälle selkeä ilmoitus.
  if (!model) {
    return (
      <div className="prediction-accuracy">
        <span>
          Ennustemallin tarkkuustietoja ei löytynyt.
        </span>
      </div>
    );
  }

  // Muodostetaan käyttäjälle
  // sanallinen tarkkuusarvio.
  const accuracy =
    getAccuracyAssessment(model);

  return (
    <div className="prediction-accuracy">
      <div className="prediction-accuracy-header">
        <span className="prediction-accuracy-label">
          Ennusteen tarkkuus
        </span>

        <strong className="prediction-accuracy-rating">
          {accuracy.label}
        </strong>
      </div>

      {/* 
        Käyttäjälle näytetään ensisijaisesti
        helposti ymmärrettävä sanallinen arvio.
      */}
      <p className="prediction-accuracy-description">
        {accuracy.description}
      </p>

      {/*
        Tekniset tarkkuusluvut näytetään
        pienempänä lisätietona.

        R² kertoo mallin selitysasteesta.
        MAE kertoo keskimääräisestä virheestä.
        RMSE huomioi erityisesti suuret virheet.
      */}
      <div className="prediction-accuracy-values">
        <div className="prediction-accuracy-item">
          <span className="prediction-accuracy-metric-label">
            R²
          </span>

          <strong>
            {accuracy.r2 != null
              ? accuracy.r2.toFixed(2)
              : "–"}
          </strong>
        </div>

        <div className="prediction-accuracy-item">
          <span className="prediction-accuracy-metric-label">
            MAE
          </span>

          <strong>
            {accuracy.mae != null
              ? accuracy.mae.toFixed(1)
              : "–"}
          </strong>
        </div>

        <div className="prediction-accuracy-item">
          <span className="prediction-accuracy-metric-label">
            RMSE
          </span>

          <strong>
            {accuracy.rmse != null
              ? accuracy.rmse.toFixed(1)
              : "–"}
          </strong>
        </div>
      </div>

      <p className="prediction-accuracy-info">
        Arvio perustuu mallin testidatan tarkkuuteen.
      </p>
    </div>
  );
}

export default PredictionAccuracy;
