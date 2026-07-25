import "./loading.css";

function Loading({
  text = "Ladataan tietoja...",
  fullPage = false,
  size = "medium",
}) {
  const classNames = [
    "loading",
    fullPage ? "loading--full-page" : "",
    `loading--${size}`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classNames} role="status" aria-live="polite">
      <div className="loading-spinner" aria-hidden="true" />

      {text && <p className="loading-text">{text}</p>}
    </div>
  );
}

export default Loading;