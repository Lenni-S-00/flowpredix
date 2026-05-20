import { useState } from "react";
import API from "./api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Tätä rakennetta pitäis käyttää API-pyynnöissä (async - await)
  const login = async () => {
    const res = await API.post("token/", {
      username,
      password,
    });

    localStorage.setItem("access", res.data.access);
    localStorage.setItem("refresh", res.data.refresh);

    window.location.reload();

    alert("Logged in!");
  };

  return (
    <div>
      <h2>Login</h2>

      <input
        placeholder="username"
        onChange={(e) => setUsername(e.target.value)}
      />

      <input
        placeholder="password"
        type="password"
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={login}>Login</button>
    </div>
  );
}