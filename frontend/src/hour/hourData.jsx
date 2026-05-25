const locations = ["Lab1", "Lab2", "Lab3", "Lab4", "Lab5", "Lab6"];

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function formatHour(date) {
  return date.toISOString().slice(0, 13) + ":00";
}

function createData() {
  const data = [];
  const startDate = new Date("2026-01-01T00:00:00");
  const days = 181;
  const hoursPerDay = 24;

  for (let day = 0; day < days; day++) {
    for (let hour = 0; hour < hoursPerDay; hour++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);
      currentDate.setHours(hour);

      locations.forEach((location, index) => {
        const weeklyPattern = Math.sin(day / 7) * 18;
        const monthlyPattern = Math.sin(day / 30) * 28;
        const hourlyPattern = Math.sin((hour / 24) * Math.PI * 2) * 16;

        const locationBase = 80 + index * 22;
        const noise = ((day * 13 + hour * 7 + index * 17) % 31) - 15;

        const realized = Math.max(
          5,
          Math.round(
            locationBase +
              weeklyPattern +
              monthlyPattern +
              hourlyPattern +
              noise
          )
        );

        const forecast = Math.max(
          5,
          Math.round(
            locationBase +
              weeklyPattern * 0.8 +
              monthlyPattern * 1.1 +
              hourlyPattern * 0.9 +
              noise * 0.5 +
              10
          )
        );

        data.push({
          date: formatDate(currentDate),
          hour: formatHour(currentDate),
          location,
          realized,
          forecast,
        });
      });
    }
  }

  return data;
}

const hourData = createData();

export default hourData;