const API_URL = "https://mental-health-score-0skj.onrender.com/predict";

const form = document.getElementById("prediction-form");
const submitButton = document.getElementById("submit-button");
const buttonLabel = submitButton.querySelector(".button-label");
const formError = document.getElementById("form-error");
const resultCard = document.getElementById("result-card");
const scoreValue = document.getElementById("score-value");
const resultDescription = document.getElementById("result-description");

function showError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

function clearError() {
  formError.textContent = "";
  formError.hidden = true;
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.classList.toggle("is-loading", isLoading);
  buttonLabel.textContent = isLoading ? "Generating prediction..." : "Generate my prediction";
  submitButton.setAttribute("aria-busy", String(isLoading));
}

function readFormData() {
  const formData = new FormData(form);
  return {
    Age: Number(formData.get("Age")),
    Gender: formData.get("Gender"),
    Country: String(formData.get("Country")).trim(),
    Academic_Level: formData.get("Academic_Level"),
    Most_Used_Platform: formData.get("Most_Used_Platform"),
    Purpose_Of_Use: formData.get("Purpose_Of_Use"),
    Avg_Daily_Usage_Hours: Number(formData.get("Avg_Daily_Usage_Hours")),
    Daily_Unlocks: Number(formData.get("Daily_Unlocks")),
    Study_Hours: Number(formData.get("Study_Hours")),
    Physical_Activity_Hours: Number(formData.get("Physical_Activity_Hours")),
    Sleep_Hours_Per_Night: Number(formData.get("Sleep_Hours_Per_Night")),
    Stress_Level: formData.get("Stress_Level")
  };
}

function validatePayload(data) {
  if (!form.reportValidity()) return "Please complete all required fields and check the highlighted values.";
  if (!Number.isInteger(data.Age) || data.Age < 10 || data.Age > 100) {
    return "Age must be between 10 to 100";
  }
  if (!Number.isInteger(data.Daily_Unlocks) || data.Daily_Unlocks < 0) {
    return "Daily phone unlocks must be a whole number greater than or equal to 0.";
  }
  const hoursFields = [
    ["Avg_Daily_Usage_Hours", "Daily usage"],
    ["Study_Hours", "Study time"],
    ["Physical_Activity_Hours", "Physical activity"]
  ];
  for (const [key, label] of hoursFields) {
    if (!Number.isFinite(data[key]) || data[key] < 0 || data[key] > 24) {
      return `${label} must be between 0 and 24 hours.`;
    }
  }
  if (!Number.isFinite(data.Sleep_Hours_Per_Night) || data.Sleep_Hours_Per_Night <= 0 || data.Sleep_Hours_Per_Night > 24) {
    return "Sleep must be greater than 0 and no more than 24 hours.";
  }
  if (!Number.isFinite(data.Avg_Daily_Usage_Hours) ||
      !Number.isFinite(data.Study_Hours) ||
      !Number.isFinite(data.Physical_Activity_Hours)) {
    return "Please enter valid numeric values for all hour fields.";
  }
  return null;
}

function formatApiError(body, status) {
  if (body && Array.isArray(body.detail)) {
    return body.detail.map((item) => {
      const field = Array.isArray(item.loc) ? item.loc.filter((part) => part !== "body").join(" → ") : "Input";
      return `${field}: ${item.msg || "Invalid value"}`;
    }).join(" ");
  }
  if (body && typeof body.detail === "string") return body.detail;
  if (body && typeof body.message === "string") return body.message;
  return `The API returned HTTP ${status}. Please check your input and backend logs.`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();
  resultCard.hidden = true;

  const payload = readFormData();
  const validationMessage = validatePayload(payload);
  if (validationMessage) {
    showError(validationMessage);
    return;
  }

  setLoading(true);
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    let body = {};
    if (responseText) {
      try { body = JSON.parse(responseText); }
      catch { throw new Error("The backend returned an unreadable response. Check that the API is returning JSON."); }
    }

    if (!response.ok) {
      throw new Error(formatApiError(body, response.status));
    }

    const score = body.predicted_mental_health_score;
    if (typeof score !== "number" || !Number.isFinite(score)) {
      throw new Error("The API response did not include a valid 'predicted_mental_health_score' number.");
    }

    scoreValue.textContent = Number.isInteger(score) ? String(score) : score.toFixed(2);
    resultDescription.textContent = "Prediction received successfully from your machine-learning model. The score is an estimate based on the submitted information.";
    resultCard.hidden = false;
    resultCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    if (error instanceof TypeError) {
      showError("Could not connect to the API. Make sure your FastAPI server is running at http://127.0.0.1:2200 and that the frontend is opened from the same computer. If the browser reports a CORS error, the backend's CORS configuration must be valid.");
    } else {
      showError(error.message || "Something went wrong while requesting the prediction.");
    }
  } finally {
    setLoading(false);
  }
});
