import "./waitingState.css";

function WaitingState({
  title = "Valitse suodattimet",
  text = "Valitse yksikkö ja aikaväli, niin tiedot näytetään tässä.",
  icon = "⏳",
}) {
  return (
    <div className="waiting-state">
      <div className="waiting-state-icon">{icon}</div>

      <h3>{title}</h3>

      <p>{text}</p>
    </div>
  );
}

export default WaitingState;