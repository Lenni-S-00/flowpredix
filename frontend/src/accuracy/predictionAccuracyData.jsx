/*tässä haetaan tarkkuusdataa backendista*/
import { useEffect, useState } from "react";
import api from "../api";

export function usePredictionAccuracy(
  location
) {
  const [model, setModel] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState(null);

  useEffect(() => {
    if (!location) {
      setModel(null);
      return;
    }

    async function fetchModel() {
      setLoading(true);
      setError(null);

      try {
        const response =
          await api.get(
            "prediction-models/",
            {
              params: {
                location,
              },
            }
          );

        const models =
          Array.isArray(response.data)
            ? response.data
            : [];

        setModel(
          models.length > 0
            ? models[0]
            : null
        );
      } catch (err) {
        console.error(
          "Mallin tarkkuustietojen haku epäonnistui:",
          err
        );

        setError(
          "Ennusteen tarkkuustietoja ei voitu hakea."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchModel();
  }, [location]);

  return {
    model,
    loading,
    error,
  };
}