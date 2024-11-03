const MAX_SEARCH_LENGTH = 10
const searchList = [];
const API_KEY = 'ac68328f88fc7aff6020bc6d85bcbd63'
const geoCodingApiUrl = (loc) =>
  `https://api.openweathermap.org/geo/1.0/direct?q=${loc}&appid=${API_KEY}`;
const currentWeatherApiUrl = (lat, lng) =>
  `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=imperial&appid=${API_KEY}`;
const forecastApiUrl = (lat, lng) =>
  `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&units=imperial&appid=${API_KEY}`;

const todayDateStr =  () => new Date().toISOString().substring(0, 10);

// GENERATE SAMPLE FORECAST 
function getSampleForecast(location) {

  const results =  {
    "location": location,
    "date": new Date().toLocaleDateString(),
    "currentConditions": 'sunny',
    "currentTemp": 78,
    "currentWindSpeed": "3",
    "currentHumidity": "45",
    "forecast": []
  }

  for(let i = 1; i <= 5; i++) {
    const date = new Date();
    const forecastDate = new Date(date.setDate(date.getDate() + i));
    results.forecast.push(
      {
        "forecastDate": forecastDate.toLocaleDateString(),
        "forecastConditions": "cloudy",
        "forecastTemp": 65,
        "forecastWindSpeed": "3-5",
        "forecastHumidity": "varies",
      }
    )
  }

  return results;
}

// GENERATE THE WEATHER FORECAST FOR A CITY
async function getForecast(cityName) {
  const geoRes = await fetch(geoCodingApiUrl(cityName))

  if(geoRes.ok) {
    const geoBody = await geoRes.json();
    if(geoBody.length > 0) {

      const geoLoc = geoBody[0];
      const lat = geoLoc.lat;
      const lng = geoLoc.lon;

      const current = {};
      const forecastMap = {};
    
      const currentWeatherRes = await fetch(currentWeatherApiUrl(lat, lng))
      if(currentWeatherRes.ok) {
        const body = await currentWeatherRes.json();
        current.location = `${body?.name} ${geoLoc.state} ${body?.sys?.country}`;
        current.date = new Date().toLocaleDateString();
        current.currentCondition = `${body?.weather[0].main} (${body?.weather[0].description})`;
        current.currentConditionIcon = body?.weather[0].icon;
        current.currentTemp = body?.main?.temp;
        current.currentWindSpeed = body?.wind?.speed;
        current.currentHumidity = body?.main?.humidity;
      }
    
      const forecastRes = await fetch(forecastApiUrl(lat, lng))
      if(forecastRes.ok) {
        const body = await forecastRes.json();

        const datesInForcast = Array.from(
          new Set(body.list.map(elem => elem.dt_txt.substring(0, 10)))
        ).sort();

        console.log('getForecast: raw results', {body, datesInForcast});

        for(let foreCst of body?.list||[]) {
          const dateKeyToks = foreCst.dt_txt?.split(' ')[0].split('-');
          const dateKey = `${dateKeyToks[1]}/${dateKeyToks[2]}/${dateKeyToks[0]}`

          if(!(dateKey in forecastMap)) {
            forecastMap[dateKey] = [];
          }

          forecastMap[dateKey].push({
            "conditions": (foreCst.weather.length > 0)?foreCst.weather[0]: undefined,
            "temp": foreCst.main.temp,
            "windSpeed": foreCst.wind.speed,
            "humidity": foreCst.main.humidity,
            "dt": foreCst.dt,
            "dt_txt": foreCst.dt_txt,
          })
        }

        for(let dateKey in forecastMap) {
          const foreCstLst = forecastMap[dateKey];
          if(foreCstLst.length > 1) {
            condSet = new Set();
            minTemp = foreCstLst[0].temp
            maxTemp = foreCstLst[0].temp
            minWindSpeed = foreCstLst[0].windSpeed
            maxWindSpeed = foreCstLst[0].windSpeed
            minHumidity = foreCstLst[0].humidity
            maxHumidity = foreCstLst[0].humidity
            for(let foreCst of foreCstLst) {
              if(foreCst.temp < minTemp) { minTemp = foreCst.temp; }
              if(foreCst.temp > maxTemp) { maxTemp = foreCst.temp; }
              if(foreCst.windSpeed < minWindSpeed) { minWindSpeed = foreCst.windSpeed; }
              if(foreCst.windSpeed > maxWindSpeed) { maxWindSpeed = foreCst.windSpeed; }
              if(foreCst.humidity < minHumidity) { minHumidity = foreCst.humidity; }
              if(foreCst.humidity > maxHumidity) { maxHumidity = foreCst.humidity; }
              condSet.add({...foreCst.conditions,  "dt": foreCst.dt, "dt_txt": foreCst.dt_txt})
            }
            forecastMap[dateKey] = {
              "conditions": Array.from(condSet),
              "temp": `${minTemp} - ${maxTemp}`,
              "lowTemp": minTemp,
              "highTemp": maxTemp,
              "windSpeed": `${minWindSpeed} - ${maxWindSpeed}`,
              "lowWindSpeed": minWindSpeed,
              "highWindSpeed": maxWindSpeed,
              "humidity": `${minHumidity} - ${maxHumidity}`,
              "lowHumidity": minHumidity,
              "highHumidity": maxHumidity            
            }
          } else if(foreCstLst.length == 1){
            forecastMap[dateKey] = foreCstLst[0];
          }
        }
        // CHOOSE AN OVERALL CONDITION FOR THE SHORT VIEW
        for(let dateKey in forecastMap) {
          const foreCst = forecastMap[dateKey];

          if(Array.isArray(foreCst.conditions)) {
            foreCst.currentConditionIcon = foreCst.conditions[0].icon;
            foreCst.currentCondition = foreCst.conditions[0].description;
            
          } else {
            foreCst.currentConditionIcon = foreCst.conditions?.icon;
            foreCst.currentCondition = foreCst.conditions?.description;
          }
        }

        if(forecastMap[todayDateStr()])  delete forecastMap[todayDateStr];

        console.log({geoBody, body, current, forecastMap})
      }
      
      return {
        current,
        "forecast": forecastMap
      };
    }
  }
}

function toCapitalCase(word) {
  return word
}
// RENDER FORECAST TO BROWSER WEBPAGE
function render(forecast, cityName) {
  
  document.getElementById('weather-dtls-loc').innerText = 
    toCapitalCase(forecast.current?.location);
  document.getElementById('weather-dtls-dt').innerText =
    forecast.current?.date;
  const icon = document.getElementById('weather-dtls-icon')
  icon.src = `https://openweathermap.org/img/wn/${forecast.current?.currentConditionIcon}@2x.png`;
  icon.alt = forecast.current?.currentCondition;
  document.getElementById('weather-dtls-temp').innerText =
    forecast.current?.currentTemp.toFixed(0);
  document.getElementById('weather-dtls-wind').innerText =
    forecast.current?.currentWindSpeed.toFixed(0);
  document.getElementById('weather-dtls-humd').innerText =
    forecast.current?.currentHumidity;
  
  const forecastDates = Object.keys(forecast.forecast).sort()
  let i = 0;
  for(let date of forecastDates) {
    i++
    const datum = forecast.forecast[date];
    const elem = document.getElementById(`weather-5d-d${i}`);
    
    if(elem){
      elem.getElementsByClassName('date')[0].innerText = date
      const iconImg = elem.querySelector('img.weather-icon');
      iconImg.src = `https://openweathermap.org/img/wn/${datum.currentConditionIcon}.png`;
      iconImg.alt = datum.currentCondition;
      elem.getElementsByClassName('low-temp')[0].innerText = Math.round(datum?.lowTemp)
      elem.getElementsByClassName('high-temp')[0].innerText = Math.round(datum?.highTemp)
      elem.getElementsByClassName('low-wind')[0].innerText = Math.round(datum?.lowWindSpeed)
      elem.getElementsByClassName('high-wind')[0].innerText = Math.round(datum?.highWindSpeed)
      elem.getElementsByClassName('low-humd')[0].innerText = Math.round(datum?.lowHumidity)
      elem.getElementsByClassName('high-humd')[0].innerText = Math.round(datum?.highHumidity)
    }
  }
  
  const pastSearchIndx = searchList.indexOf(cityName);
  if(pastSearchIndx >= 0) {
    searchList.splice(pastSearchIndx, 1);
  }
  searchList.unshift(cityName);
  while(searchList.length > MAX_SEARCH_LENGTH) {
    searchList.pop()
  }
 
  const prevSearchesLIArray = [];
  for(let loc of searchList) {
    const prevSearchBtn = document.createElement('button');
    prevSearchBtn.type = 'button';
    prevSearchBtn.classList.add('btn', 'btn-secondary', 'mb-1');
    prevSearchBtn.dataset.loc = loc;
    prevSearchBtn.addEventListener('click', onClick);
    prevSearchBtn.style.width = "100%";
    prevSearchBtn.innerText = loc;
    const li = document.createElement('li');
    li.appendChild(prevSearchBtn);
    prevSearchesLIArray.push(li);
  }
  document.getElementById('prev-searches').replaceChildren(...prevSearchesLIArray);
}

function onSubmit(event) {
  event.preventDefault();
  onClick(event);
}

async function onClick(event) {
  try {
    let cityName = event.target?.dataset?.loc;
    if(!cityName) {
      cityName = document.getElementById('city-input').value;
    }
    const forecast = await getForecast(cityName);
    if(forecast) {
      document.getElementById("weather-dtls").style.display = "block";
      document.getElementById("weather-5d").style.display = "block";
    }
    render(forecast, cityName)
  } catch(err) {
    console.error(err);
  }
}