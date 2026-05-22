const locations = ["Lab1", "Lab2", "Lab3", "Lab4", "Lab5", "Lab6"];

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function createData() {
  const data = [];
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

      data.push({
        date: formatDate(currentDate),
        location,
        realized,
        forecast,
      });
    });
  }

  return data;
}

const dayData = createData();

export default dayData;