// =======================
// CONFIG
// =======================
const API_KEY = "4729c6f8666529e2b1c5e38bb99b43f0";   // tumhara key
const USE_BACKEND = false;
const BACKEND_URL = "/weather";

let units = "metric";          // "metric" | "imperial"
let currentCity = "";
let currentCoords = null;
let forecastChart = null;
let favorites = [];

// =======================
// DOM ELEMENTS
// =======================
const cityInput  = document.getElementById("cityInput");
const searchBtn  = document.getElementById("searchBtn");
const useGeoBtn  = document.getElementById("useGeo");
const unitToggleBtns = document.querySelectorAll("#unitToggle");

const cityNameEl = document.getElementById("cityName");
const tempEl     = document.getElementById("temp");
const descEl     = document.getElementById("desc");
const humidityEl = document.getElementById("humidity");
const windEl     = document.getElementById("wind");
const feelsEl    = document.getElementById("feels");
const iconEl     = document.getElementById("icon");

const favListEl    = document.getElementById("favList");
const saveFavBtn   = document.getElementById("saveFavBtn");
const clearFavsBtn = document.getElementById("clearFavs");

const clearBtn   = document.getElementById("clearBtn");
const loadingEl  = document.getElementById("loading");
const errorBox   = document.getElementById("errorBox");
const yearEl     = document.getElementById("year");

// =======================
// HELPERS
// =======================
function setYear() {
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

function formatTemp(t) {
  if (typeof t !== "number" || Number.isNaN(t)) {
    return `--°${units === "metric" ? "C" : "F"}`;
  }
  return `${Math.round(t)}°${units === "metric" ? "C" : "F"}`;
}

function setLoading(isLoading) {
  if (!loadingEl) return;
  loadingEl.classList.toggle("visually-hidden", !isLoading);
}

function showError(msg) {
  if (errorBox) errorBox.textContent = msg || "Something went wrong.";
}

function clearError() {
  if (errorBox) errorBox.textContent = "";
}

// ===== THEME BY WEATHER =====
function setThemeByWeather(condition) {
  const body = document.body;
  const c = (condition || "").toLowerCase();

  body.classList.remove(
    "theme-clear",
    "theme-clouds",
    "theme-rain",
    "theme-snow",
    "theme-default"
  );

  if (c.includes("clear")) body.classList.add("theme-clear");
  else if (c.includes("cloud")) body.classList.add("theme-clouds");
  else if (c.includes("rain") || c.includes("drizzle")) body.classList.add("theme-rain");
  else if (c.includes("snow")) body.classList.add("theme-snow");
  else body.classList.add("theme-default");
}

// =======================
// RENDER CURRENT WEATHER
// =======================
function renderWeather(data) {
  if (!data || !data.main || !data.weather || !data.weather[0]) {
    showError("Invalid weather data.");
    return;
  }

  clearError();

  const name = data.name || "";
  const country = data.sys && data.sys.country ? `, ${data.sys.country}` : "";
  currentCity = `${name}${country}`.trim();

  cityNameEl.textContent = currentCity || "Unknown Location";

  const mainCond = data.weather[0].main || "";
  const desc = data.weather[0].description || "";
  descEl.textContent = desc
    ? desc.charAt(0).toUpperCase() + desc.slice(1)
    : "—";

  tempEl.textContent = formatTemp(data.main.temp);
  humidityEl.textContent = `Humidity: ${data.main.humidity}%`;
  windEl.textContent = `Wind: ${data.wind.speed} ${
    units === "metric" ? "m/s" : "mph"
  }`;
  feelsEl.textContent = `Feels like: ${formatTemp(data.main.feels_like)}`;

  const icon = data.weather[0].icon;
  if (icon) {
    iconEl.src = `https://openweathermap.org/img/wn/${icon}@2x.png`;
    iconEl.alt = desc || mainCond;
  } else {
    iconEl.removeAttribute("src");
    iconEl.alt = "";
  }

  setThemeByWeather(mainCond);
}

// =======================
// FORECAST CHART
// =======================
function renderForecastChart(list) {
  const ctx = document.getElementById("forecastChart");
  if (!ctx || !Array.isArray(list) || !list.length) {
    if (forecastChart) {
      forecastChart.destroy();
      forecastChart = null;
    }
    return;
  }

  const points = list.slice(0, 5);
  const labels = points.map((item) => {
    const dt = new Date(item.dt * 1000);
    return `${dt.getHours()}:00`;
  });
  const temps = points.map((item) => item.main.temp);

  if (forecastChart) {
    forecastChart.destroy();
  }

  forecastChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Next hours",
          data: temps,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: "#9ca3af", font: { size: 11 } },
          grid: { display: false },
        },
        y: {
          ticks: {
            color: "#9ca3af",
            font: { size: 11 },
            callback: (value) =>
              `${Math.round(value)}°${units === "metric" ? "C" : "F"}`,
          },
          grid: { color: "rgba(55, 65, 81, 0.7)" },
        },
      },
    },
  });
}

// =======================
// API HELPERS
// =======================
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  if (data.cod && data.cod !== 200 && data.cod !== "200") {
    throw new Error(data.message || "API error");
  }
  return data;
}

// CITY
async function fetchWeatherByCity(city) {
  try {
    if (!city) {
      showError("Please enter a city name.");
      return;
    }
    clearError();
    setLoading(true);

    let weatherUrl;
    let forecastUrl;

    if (USE_BACKEND) {
      weatherUrl = `${BACKEND_URL}?city=${encodeURIComponent(city)}&units=${units}`;
      forecastUrl = `${BACKEND_URL}/forecast?city=${encodeURIComponent(
        city
      )}&units=${units}`;
    } else {
      weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        city
      )}&appid=${API_KEY}&units=${units}`;

      forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
        city
      )}&appid=${API_KEY}&units=${units}`;
    }

    const [weatherData, forecastData] = await Promise.all([
      fetchJSON(weatherUrl),
      fetchJSON(forecastUrl),
    ]);

    currentCoords = {
      lat: weatherData.coord.lat,
      lon: weatherData.coord.lon,
    };

    renderWeather(weatherData);
    renderForecastChart(forecastData.list);
  } catch (err) {
    console.error(err);
    showError("Couldn't fetch weather — " + (err.message || err));
  } finally {
    setLoading(false);
  }
}

// COORDS
async function fetchWeatherByCoords(lat, lon) {
  try {
    clearError();
    setLoading(true);

    let weatherUrl;
    let forecastUrl;

    if (USE_BACKEND) {
      weatherUrl = `${BACKEND_URL}?lat=${lat}&lon=${lon}&units=${units}`;
      forecastUrl = `${BACKEND_URL}/forecast?lat=${lat}&lon=${lon}&units=${units}`;
    } else {
      weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${units}`;
      forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${units}`;
    }

    const [weatherData, forecastData] = await Promise.all([
      fetchJSON(weatherUrl),
      fetchJSON(forecastUrl),
    ]);

    currentCoords = { lat, lon };
    renderWeather(weatherData);
    renderForecastChart(forecastData.list);
  } catch (err) {
    console.error(err);
    showError("Failed to fetch location weather — " + (err.message || err));
  } finally {
    setLoading(false);
  }
}

// =======================
// FAVORITES
// =======================
function loadFavorites() {
  try {
    const raw = localStorage.getItem("weather_favorites");
    favorites = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(favorites)) favorites = [];
  } catch {
    favorites = [];
  }
}

function saveFavorites() {
  localStorage.setItem("weather_favorites", JSON.stringify(favorites));
}

function renderFavorites() {
  if (!favListEl) return;
  favListEl.innerHTML = "";

  if (!favorites.length) {
    const p = document.createElement("p");
    p.className = "fav-empty";
    p.textContent = "No favorites yet. Save a city to access it quickly.";
    favListEl.appendChild(p);
    return;
  }

  favorites.forEach((city) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "fav-item";
    btn.textContent = city;
    btn.addEventListener("click", () => {
      cityInput.value = city;
      fetchWeatherByCity(city);
    });
    favListEl.appendChild(btn);
  });
}

function handleSaveFavorite() {
  if (!currentCity) {
    showError("Search a city first before saving to favorites.");
    return;
  }
  clearError();

  if (favorites.includes(currentCity)) {
    showError("This city is already in your favorites.");
    return;
  }

  favorites.push(currentCity);
  saveFavorites();
  renderFavorites();
}

function handleClearFavorites() {
  favorites = [];
  saveFavorites();
  renderFavorites();
}

// =======================
// RESET UI (Clear button)
// =======================
function resetUI() {
  cityInput.value = "";
  currentCity = "";
  currentCoords = null;

  cityNameEl.textContent = "Search a city to begin";
  descEl.textContent = "—";
  tempEl.textContent = formatTemp(NaN);
  humidityEl.textContent = "Humidity: --%";
  windEl.textContent = "Wind: -- " + (units === "metric" ? "m/s" : "mph");
  feelsEl.textContent = "Feels like: " + formatTemp(NaN);

  iconEl.removeAttribute("src");
  iconEl.alt = "";

  if (forecastChart) {
    forecastChart.destroy();
    forecastChart = null;
  }

  setThemeByWeather("");
  clearError();
}

// =======================
// EVENT WIRING
// =======================
function wireEvents() {
  // Search
  if (searchBtn && cityInput) {
    searchBtn.addEventListener("click", () => {
      const city = cityInput.value.trim();
      if (!city) {
        showError("Please enter a city name.");
        return;
      }
      fetchWeatherByCity(city);
    });

    cityInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        searchBtn.click();
      }
    });
  }

  // Use my location
  if (useGeoBtn) {
    useGeoBtn.addEventListener("click", () => {
      clearError();

      if (!navigator.geolocation) {
        showError("Geolocation is not supported in this browser.");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          currentCoords = { lat: latitude, lon: longitude };
          fetchWeatherByCoords(latitude, longitude);
        },
        () => {
          showError("Could not get your location. Please allow location access.");
        }
      );
    });
  }

  // Unit toggle (2 buttons same id)
  if (unitToggleBtns && unitToggleBtns.length) {
    unitToggleBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        units = units === "metric" ? "imperial" : "metric";

        unitToggleBtns.forEach((b) => {
          b.textContent = `Unit: ${units === "metric" ? "°C" : "°F"}`;
        });

        if (currentCoords) {
          fetchWeatherByCoords(currentCoords.lat, currentCoords.lon);
        } else if (currentCity) {
          fetchWeatherByCity(currentCity);
        }
      });
    });
  }

  // Save favorites
  if (saveFavBtn) {
    saveFavBtn.addEventListener("click", handleSaveFavorite);
  }

  // Clear favorites
  if (clearFavsBtn) {
    clearFavsBtn.addEventListener("click", handleClearFavorites);
  }

  // Clear current weather card
  if (clearBtn) {
    clearBtn.addEventListener("click", resetUI);
  }
}

// =======================
// INIT
// =======================
(function init() {
  setYear();
  loadFavorites();
  renderFavorites();
  wireEvents();
})();
