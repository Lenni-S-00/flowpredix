// App.jsx
import Login from "./Login";
import Dashboard from "./Dashboard";

export default function App() {
  const token = localStorage.getItem("access");

  return (
    <>
      {token ? <Dashboard /> : <Login />}
    </>
  );
}