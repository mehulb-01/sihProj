import React, { useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";

const LoginPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);

  // Controlled input states
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  const handleSubmit = async () => {
    setError(null);

    if (!username || !password || (isSignUp && !email)) {
      setError("Please fill all required fields");
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (isSignUp) {
      // Signup call
      try {
        const response = await fetch("http://localhost:5000/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password }),
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error || "Signup failed");
          return;
        }
        // After signup success toggle to login mode
        setIsSignUp(false);
        setError("Signup successful! Please login."); // show green success message
      } catch {
        setError("Network error during signup");
      }
    } else {
      // Login call
      try {
        const response = await fetch("http://localhost:5000/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error || "Login failed");
          return;
        }
        // Save JWT token and navigate
        localStorage.setItem("authToken", data.token);
        navigate("/dashboard");
      } catch {
        setError("Network error during login");
      }
    }
  };

  return (
    <StyledWrapper isSignUp={isSignUp}>
      <div className="card">
        <div className="card2">
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <p id="heading">{isSignUp ? "Sign Up" : "Login"}</p>

            {/* Username */}
            <div className="field">
              <svg
                viewBox="0 0 16 16"
                fill="currentColor"
                height={16}
                width={16}
                xmlns="http://www.w3.org/2000/svg"
                className="input-icon"
              >
                <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
              </svg>
              <input
                type="text"
                className="input-field"
                placeholder="Username"
                autoComplete="off"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            {/* Email - only for Sign Up */}
            {isSignUp && (
              <div className="field">
                <svg
                  viewBox="0 0 16 16"
                  fill="white"
                  height={16}
                  width={16}
                  xmlns="http://www.w3.org/2000/svg"
                  className="input-icon"
                >
                  <path d="M.05 3.555A2 2 0 0 1 2 2h12a2 2 0 0 1 1.95 1.555L8 8.414.05 3.555zM0 4.697v7.104l5.803-3.558L0 4.697zM6.761 8.83l-6.57 4.027A2 2 0 0 0 2 14h12a2 2 0 0 0 1.808-1.144l-6.57-4.027L8 9.586l-1.239-.756zM16 11.801V4.697l-5.803 3.546z" />
                </svg>
                <input
                  type="email"
                  className="input-field"
                  placeholder="Email"
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required={isSignUp}
                />
              </div>
            )}

            {/* Password */}
            <div className="field">
              <svg
                viewBox="0 0 16 16"
                fill="currentColor"
                height={16}
                width={16}
                xmlns="http://www.w3.org/2000/svg"
                className="input-icon"
              >
                <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
              </svg>
              <input
                type="password"
                className="input-field"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Confirm Password - only for Sign Up */}
            {isSignUp && (
              <div className="field">
                <svg
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  height={16}
                  width={16}
                  xmlns="http://www.w3.org/2000/svg"
                  className="input-icon"
                >
                  <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
                </svg>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required={isSignUp}
                />
              </div>
            )}

            {error && (
              <p
                style={{
                  color: error.startsWith("Signup successful") ? "limegreen" : "red",
                  textAlign: "center",
                }}
              >
                {error}
              </p>
            )}

            {/* Buttons */}
            <div className="btn">
              <button type="submit" className="button1">
                {isSignUp ? "Register" : "Login"}
              </button>
              <button
                type="button"
                className="button2"
                onClick={() => {
                  setIsSignUp((prev) => !prev);
                  setError(null);
                }}
              >
                {isSignUp ? "Login" : "Sign Up"}
              </button>
            </div>

            {!isSignUp && <button className="button3">Forgot Password</button>}
          </form>
        </div>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: #0f0f0f;
  font-family: "Times New Roman", Times, serif;

  .form {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 2em;
    background-color: #171717;
    border-radius: 25px;
    transition: 0.4s ease-in-out;
    margin-bottom: 0;
  }

  .card {
    width: 380px;
    max-width: 90%;
    margin: auto;
    background: linear-gradient(163deg, #00ff75 0%, #3700ff 100%);
    border-radius: 22px;
    padding: 3px;
    box-sizing: border-box;
    position: relative;
    transition: transform 0.8s cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 0.9s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .card:hover {
    box-shadow: 0px 0px 70px 16px rgba(0, 255, 117, 0.28);
    transform: scale(1.05);
  }

  .card2 {
    background: #171717;
    border-radius: 19px;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
  }

  .card2:hover {
    transform: scale(0.98);
    border-radius: 20px;
  }

  #heading {
    text-align: center;
    margin: 1.5em;
    color: #fff;
    font-size: 1.3em;
  }

  .field {
    display: flex;
    align-items: center;
    gap: 0.5em;
    border-radius: 25px;
    padding: 0.6em;
    background-color: #171717;
    box-shadow: inset 2px 5px 10px rgb(5, 5, 5);
  }

  .input-icon {
    height: 1.3em;
    width: 1.3em;
    fill: white;
  }

  .input-field {
    background: none;
    border: none;
    outline: none;
    width: 100%;
    color: #d3d3d3;
  }

  .form .btn {
    display: flex;
    justify-content: space-between;
    gap: 1em;
    margin-top: 2em;
  }

  .button1,
  .button2 {
    flex: 1;
    padding: 0.6em;
    border-radius: 5px;
    border: none;
    background-color: #252525;
    color: white;
    transition: 0.3s ease-in-out;
    cursor: pointer;
  }

  .button1:hover,
  .button2:hover {
    background-color: black;
  }

  .button3 {
    margin-top: 0.8em;
    padding: 0.5em;
    border-radius: 5px;
    border: none;
    background-color: #252525;
    color: white;
    width: 100%;
    transition: 0.3s ease-in-out;
  }

  .button3:hover {
    background-color: red;
  }
`;

export default LoginPage;
