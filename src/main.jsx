import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const initialForm = {
  fullName: "",
  age: "",
  phone: "",
  bloodGroup: "",
  location: "",
  lastDonationDate: ""
};

const today = new Date().toISOString().split("T")[0];

function validateField(name, value) {
  if (["fullName", "age", "phone", "bloodGroup", "location"].includes(name) && !value.trim()) {
    return "This field is required.";
  }

  if (name === "fullName" && value && !/^[A-Za-z ]{2,50}$/.test(value)) {
    return "Please enter a valid full name";
  }

  if (name === "age" && value && (Number(value) < 18 || Number(value) > 65)) {
    return "Age must be between 18 and 65";
  }

  if (name === "phone" && value && !/^[6-9]\d{9}$/.test(value)) {
    return "Please enter a valid phone number";
  }

  if (name === "lastDonationDate" && value && value > today) {
    return "Date cannot be in the future";
  }

  return "";
}

function App() {
  const [form, setForm] = useState(initialForm);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const errors = Object.fromEntries(
    Object.entries(form).map(([name, value]) => [name, validateField(name, value)])
  );

  const requiredFields = ["fullName", "age", "phone", "bloodGroup", "location"];
  const formInvalid = requiredFields.some((name) => errors[name]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setSubmitted(false);
  }

  function handleBlur(e) {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  }

  function handleSubmit(e) {
    e.preventDefault();

    const allTouched = Object.fromEntries(
      Object.keys(form).map((key) => [key, true])
    );
    setTouched(allTouched);

    if (formInvalid) return;

    setSubmitted(true);
  }

  function stateClass(name) {
    if (!touched[name]) return "";
    return errors[name] ? "invalid" : "valid";
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-logo">
            <span>♥</span>
          </div>
          <div>
            <div className="brand-title">Blood Donation</div>
            <div className="brand-subtitle">
              <span>Give Blood</span>
              <b>•</b>
              <span>Save Lives</span>
            </div>
          </div>
        </div>

        <div className="header-message">
          <span>A small act of kindness<br />can make a big difference</span>
          <span className="drop">♥</span>
        </div>
      </header>

      <div className="decor decor-left">
        <div className="hands">♢</div>
        <div className="big-drop">♥</div>
      </div>

      <div className="decor decor-right">
        <div className="heart-line">〰♥〰</div>
      </div>

      <main className="content">
        <section className="form-card">
          <div className="form-heading">
            <h1>Donor Registration</h1>
            <p>Fill in the details below to become a blood donor and help save lives.</p>
          </div>

          {submitted && (
            <div className="success-banner">
              <strong>✓ Registration submitted successfully!</strong>
              <span>Thank you for volunteering to donate blood.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <section className="form-section">
              <div className="section-title">
                <span className="section-icon person">●</span>
                <h2>Personal Details</h2>
              </div>

              <div className="fields personal-grid">
                <InputField
                  label="Full Name"
                  name="fullName"
                  required
                  placeholder="Enter your full name"
                  value={form.fullName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.fullName ? errors.fullName : ""}
                  className={stateClass("fullName")}
                />

                <InputField
                  label="Age"
                  name="age"
                  required
                  type="number"
                  min="18"
                  max="65"
                  placeholder="Enter your age"
                  value={form.age}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.age ? errors.age : ""}
                  className={stateClass("age")}
                />

                <InputField
                  label="Phone Number"
                  name="phone"
                  required
                  type="tel"
                  inputMode="numeric"
                  maxLength="10"
                  placeholder="Enter your phone number"
                  value={form.phone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.phone ? errors.phone : ""}
                  className={stateClass("phone")}
                />
              </div>
            </section>

            <section className="form-section">
              <div className="section-title">
                <span className="section-icon blood">♥</span>
                <h2>Blood Group</h2>
              </div>

              <div className="fields medical-grid">
                <SelectField
                  label="Blood Group"
                  name="bloodGroup"
                  required
                  value={form.bloodGroup}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.bloodGroup ? errors.bloodGroup : ""}
                  className={stateClass("bloodGroup")}
                />

                <InputField
                  label="Last Donation Date"
                  name="lastDonationDate"
                  type="date"
                  value={form.lastDonationDate}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.lastDonationDate ? errors.lastDonationDate : ""}
                  className={stateClass("lastDonationDate")}
                  optional
                />
              </div>
            </section>

            <section className="form-section">
              <div className="section-title">
                <span className="section-icon location">●</span>
                <h2>Location</h2>
              </div>

              <div className="fields">
                <InputField
                  label="Target Location / City"
                  name="location"
                  required
                  placeholder="Enter your city or location"
                  value={form.location}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.location ? errors.location : ""}
                  className={stateClass("location")}
                />
              </div>
            </section>

            <div className="submit-area">
              <button
                type="submit"
                className="submit-button"
                disabled={formInvalid}
              >
                Submit Registration
              </button>
            </div>
          </form>
        </section>
      </main>

      <div className="bottom-wave" />
    </div>
  );
}

function InputField({
  label,
  name,
  required,
  optional,
  error,
  className,
  ...props
}) {
  return (
    <div className="field">
      <label htmlFor={name}>
        {label}{" "}
        {required && <span className="required">*</span>}
        {optional && <span className="optional"> (optional)</span>}
      </label>

      <div className="input-wrap">
        <input
          id={name}
          name={name}
          className={className}
          aria-invalid={Boolean(error)}
          {...props}
        />
        {className === "valid" && <span className="state-icon success">✓</span>}
        {className === "invalid" && <span className="state-icon failure">×</span>}
      </div>

      {error && <small className="error">▲ {error}</small>}
    </div>
  );
}

function SelectField({
  label,
  name,
  required,
  error,
  className,
  ...props
}) {
  return (
    <div className="field">
      <label htmlFor={name}>
        {label} <span className="required">{required ? "*" : ""}</span>
      </label>

      <div className="input-wrap">
        <select
          id={name}
          name={name}
          className={className}
          aria-invalid={Boolean(error)}
          {...props}
        >
          <option value="">Select blood group</option>
          <option value="A+">A+</option>
          <option value="A-">A-</option>
          <option value="B+">B+</option>
          <option value="B-">B-</option>
          <option value="O+">O+</option>
          <option value="O-">O-</option>
          <option value="AB+">AB+</option>
          <option value="AB-">AB-</option>
        </select>
        {className === "valid" && <span className="state-icon success">✓</span>}
      </div>

      {error && <small className="error">▲ {error}</small>}
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
