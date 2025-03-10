import axios from 'axios';

const API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const BASE_URL = 'http://api.openweathermap.org/data/2.5';

interface WeatherData {
  description: string;
  temperature: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  precipitation_probability: number;
  is_suitable_for_outdoor: boolean;
}

export async function getWeatherForecast(city: string, date: Date): Promise<WeatherData | null> {
  try {
    // Get coordinates first
    const geoResponse = await axios.get(`${BASE_URL}/geo/1.0/direct`, {
      params: {
        q: city,
        limit: 1,
        appid: API_KEY
      }
    });

    if (!geoResponse.data?.[0]) {
      console.error('Location not found:', city);
      return null;
    }

    const { lat, lon } = geoResponse.data[0];

    // Get 5-day forecast
    const forecastResponse = await axios.get(`${BASE_URL}/forecast`, {
      params: {
        lat,
        lon,
        appid: API_KEY,
        units: 'imperial'
      }
    });

    // Find the forecast closest to the target date
    const targetTimestamp = date.getTime();
    const forecast = forecastResponse.data.list.reduce((closest: any, current: any) => {
      const currentDiff = Math.abs(new Date(current.dt * 1000).getTime() - targetTimestamp);
      const closestDiff = Math.abs(new Date(closest.dt * 1000).getTime() - targetTimestamp);
      return currentDiff < closestDiff ? current : closest;
    });

    // Determine if weather is suitable for outdoor activities
    const isSuitableForOutdoor = (
      forecast.weather[0].main !== 'Rain' &&
      forecast.weather[0].main !== 'Snow' &&
      forecast.weather[0].main !== 'Thunderstorm' &&
      forecast.main.temp >= 40 &&
      forecast.main.temp <= 95 &&
      forecast.wind.speed <= 20
    );

    return {
      description: forecast.weather[0].description,
      temperature: forecast.main.temp,
      feels_like: forecast.main.feels_like,
      humidity: forecast.main.humidity,
      wind_speed: forecast.wind.speed,
      precipitation_probability: forecast.pop * 100,
      is_suitable_for_outdoor: isSuitableForOutdoor
    };
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return null;
  }
}

export function suggestAlternativeActivities(weather: WeatherData, activity: string): string[] {
  const alternativeActivities: string[] = [];
  
  if (!weather.is_suitable_for_outdoor && activity.toLowerCase().includes('outdoor')) {
    alternativeActivities.push(
      'Visit a local museum',
      'Explore an indoor market',
      'Take a cooking class',
      'Visit an art gallery',
      'Check out local cafes'
    );
  }

  if (weather.temperature > 95) {
    alternativeActivities.push(
      'Visit an indoor ice rink',
      'Explore air-conditioned shopping centers',
      'Visit an aquarium',
      'Indoor spa day'
    );
  }

  if (weather.precipitation_probability > 50) {
    alternativeActivities.push(
      'Watch a local theater performance',
      'Visit indoor attractions',
      'Try local restaurants',
      'Visit indoor entertainment centers'
    );
  }

  return alternativeActivities;
}
