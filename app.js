
const API_KEY = "4729c6f8666529e2b1c5e38bb99b43f0";
let units = "metric"; 
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const useGeo = document.getElementById("useGeo");
const unitToggle = document.getElementById("unitToggle");
const loading = document.getElementById("loading");
const errorBox = document.getElementById("errorBox");
const card = document.getElementById("card");
const resultPanel = document.getElementById("resultPanel");

const cityNameEl = document.getElementById("cityName");
const tempEl = document.getElementById("temp");
const descEl = document.getElementById("desc");
const iconEl = document.getElementById("icon");
const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("wind");
const feelsEl = document.getElementById("feels");
const forecastCanvas = document.getElementById("forecastChart");

const favListEl = document.getElementById("favList");
const saveFavBtn = document.getElementById("saveFav");
const clearBtn = document.getElementById("clearBtn");

document.getElementById("year").textContent = new Date().getFullYear();

/* Chart instance */
let chart = null;

/* Helper UI functions */
function showLoading() {
  if (loading) loading.classList.remove("hide");
  if (errorBox) errorBox.classList.add("hide");
  if (card) card.classList.add("hide");
}
function hideLoading() {
  if (loading) loading.classList.add("hide");
}
function showError(msg) {
  if (errorBox) {
    errorBox.textContent = msg;
    errorBox.classList.remove("hide");
  }
  if (card) card.classList.add("hide");
}
function clearError() {
  if (errorBox) {
    errorBox.textContent = "";
    errorBox.classList.add("hide");
  }
}
function revealCard() {
  if (!card) return;
  card.classList.remove("hide");
  card.style.opacity = 0;
  card.style.transform = "translateY(8px)";
  requestAnimationFrame(() => {
    card.style.transition = "transform .36s cubic-bezier(.2,.9,.3,1), opacity .36s";
    card.style.transform = "translateY(0)";
    card.style.opacity = 1;
  });
}

/* Utility */
function iconUrl(icon) {
  return icon ? `https://openweathermap.org/img/wn/${icon}@2x.png` : "";
}
function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

/* Favorites (localStorage) */
function getFavs() {
  try {
    return JSON.parse(localStorage.getItem("wp_favs") || "[]");
  } catch (e) {
    return [];
  }
}
function setFavs(list) {
  localStorage.setItem("wp_favs", JSON.stringify(list));
  renderFavs();
}
function addFav(city) {
  const list = getFavs();
  if (!list.includes(city)) {
    list.unshift(city);
    setFavs(list.slice(0, 6));
  }
}
function removeFav(city) {
  setFavs(getFavs().filter(c => c !== city));
}
function renderFavs() {
  if (!favListEl) return;
  const list = getFavs();
  favListEl.innerHTML = "";
  if (list.length === 0) {
    favListEl.innerHTML = '<span class="muted">No favorites yet</span>';
    return;
  }
  list.forEach(city => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "fav-item";
    btn.textContent = city;
    btn.onclick = () => fetchCurrentByCity(city);
    favListEl.appendChild(btn);
  });
}

/* Fetch current weather by city name */
async function fetchCurrentByCity(city) {
  if (!city) return showError("Please enter a city name.");
  clearError();
  showLoading();
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=${units}`;
    const res = await fetch(url);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    renderCurrent(data);
    // fetch forecast by coordinates
    if (data && data.coord) fetchForecastByCoords(data.coord.lat, data.coord.lon);
  } catch (err) {
    showError("Unable to load weather: " + (err.message || err));
  } finally {
    hideLoading();
  }
}

/* Fetch 5-day / 3-hour forecast by coordinates */
async function fetchForecastByCoords(lat, lon) {
  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${units}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Forecast HTTP ${res.status}`);
    const data = await res.json();
    const daily = aggregateDaily(data.list);
    renderChart(daily);
  } catch (err) {
    // Non-fatal: clear chart
    renderChart([]);
  }
}

/* Aggregate 3-hour list into 5-day summary */
function aggregateDaily(list) {
  const map = {};
  (list || []).forEach(item => {
    const key = item.dt_txt.split(" ")[0];
    map[key] = map[key] || [];
    map[key].push(item);
  });
  return Object.keys(map).slice(0, 5).map(k => {
    const arr = map[k];
    const temps = arr.map(i => i.main.temp);
    return {
      label: new Date(k).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      min: Math.round(Math.min(...temps)),
      max: Math.round(Math.max(...temps))
    };
  });
}

/* Render current weather into card */
function renderCurrent(data) {
  if (!data) return;
  if (cityNameEl) cityNameEl.textContent = `${data.name}, ${data.sys && data.sys.country ? data.sys.country : ''}`;
  if (tempEl) tempEl.textContent = `${Math.round(data.main.temp)}°${units === 'metric' ? 'C' : 'F'}`;
  if (descEl) descEl.textContent = capitalize(data.weather && data.weather[0] ? data.weather[0].description : '');
  if (iconEl) {
    iconEl.style.opacity = 0;
    iconEl.src = iconUrl(data.weather && data.weather[0] ? data.weather[0].icon : '');
    iconEl.alt = data.weather && data.weather[0] ? data.weather[0].description : 'weather icon';
    iconEl.onload = () => {
      iconEl.style.transition = 'opacity .35s ease';
      iconEl.style.opacity = 1;
    };
  }
  if (humidityEl) humidityEl.textContent = `${data.main.humidity}%`;
  if (windEl) windEl.textContent = `${data.wind.speed} ${units === 'metric' ? 'm/s' : 'mph'}`;
  if (feelsEl) feelsEl.textContent = `${Math.round(data.main.feels_like)}°${units === 'metric' ? 'C' : 'F'}`;
  clearError();
  revealCard();
}

/* Render Chart using Chart.js */
function renderChart(days) {
  const labels = days.map(d => d.label);
  const mins = days.map(d => d.min);
  const maxs = days.map(d => d.max);

  if (chart) {
    chart.destroy();
    chart = null;
  }

  if (!labels.length) {
    if (forecastCanvas && forecastCanvas.getContext) {
      const ctx = forecastCanvas.getContext('2d');
      ctx.clearRect(0, 0, forecastCanvas.width, forecastCanvas.height);
    }
    return;
  }

  chart = new Chart(forecastCanvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Min', data: mins, borderWidth: 2, tension: 0.25, pointRadius: 3, borderColor: '#7dd3fc', backgroundColor: 'rgba(125,211,252,0.06)', fill: false },
        { label: 'Max', data: maxs, borderWidth: 0, tension: 0.25, pointRadius: 0, backgroundColor: 'rgba(96,165,250,0.14)', fill: true }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: '#dbeafe' } } },
      scales: {
        x: { ticks: { color: '#cfe7ff' } },
        y: { ticks: { color: '#cfe7ff' } }
      }
    }
  });
}

/* Geolocation handler */
useGeo.addEventListener('click', () => {
  clearError();
  if (!navigator.geolocation) {
    showError("Geolocation not supported by this browser.");
    return;
  }
  showLoading();
  navigator.geolocation.getCurrentPosition(async (pos) => {
    try {
      const { latitude, longitude } = pos.coords;
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=${units}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      renderCurrent(data);
      fetchForecastByCoords(latitude, longitude);
    } catch (err) {
      showError("Failed to fetch location weather: " + (err.message || err));
    } finally {
      hideLoading();
    }
  }, (err) => {
    showError("Location permission denied or unavailable.");
    hideLoading();
  }, { timeout: 10000 });
});

/* Search handlers */
searchBtn.addEventListener('click', () => {
  const city = cityInput.value.trim();
  if (!city) {
    showError("Please enter a city name.");
    return;
  }
  addRecent(city);
  fetchCurrentByCity(city);
});
cityInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchBtn.click();
});

/* Unit toggle */
unitToggle.addEventListener('click', () => {
  units = units === 'metric' ? 'imperial' : 'metric';
  unitToggle.textContent = `Unit: ${units === 'metric' ? '°C' : '°F'}`;
  // re-fetch current if visible
  const currentCity = (cityNameEl && cityNameEl.textContent) ? cityNameEl.textContent.split(",")[0] : null;
  if (currentCity && currentCity !== '—') fetchCurrentByCity(currentCity);
});

/* Save favorite */
if (saveFavBtn) {
  saveFavBtn.addEventListener('click', () => {
    const city = cityNameEl.textContent.split(",")[0];
    if (city && city !== '—') addFav(city);
  });
}

/* Clear / hide card */
if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    if (card) card.classList.add("hide");
    clearError();
  });
}

/* Quick keyboard shortcut to focus search '/' */
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement !== cityInput) {
    e.preventDefault();
    cityInput.focus();
  }
});

/* Recent helper (simple) */
function addRecent(city) {
  try {
    const key = "wp_recent";
    const arr = JSON.parse(localStorage.getItem(key) || "[]");
    if (!arr.includes(city)) arr.unshift(city);
    localStorage.setItem(key, JSON.stringify(arr.slice(0, 10)));
  } catch (e) { /* ignore */ }
}

/* Init on load */
(function init() {
  renderFavs();
  // if favorites exist, load first favorite
  const favs = getFavs();
  if (favs.length) fetchCurrentByCity(favs[0]);
})();
