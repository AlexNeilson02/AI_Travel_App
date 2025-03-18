import axios from 'axios';

interface WeatherData {
  description: string;
  temperature: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  precipitation_probability: number;
  is_suitable_for_outdoor: boolean;
}

interface GeocodingResponse {
  results?: Array<{
    latitude: number;
    longitude: number;
  }>;
}

export async function getWeatherForecast(location: string, date: Date): Promise<WeatherData | null> {
  try {
    console.log('Starting weather forecast fetch for:', location, 'date:', date);

    // Format the location string by removing country and extra spaces
    const formattedLocation = location.split(',')[0].trim();
    console.log('Formatted location:', formattedLocation);

    // Get coordinates using Open-Meteo Geocoding API
    const geoResponse = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
      params: {
        name: formattedLocation,
        count: 1,
        language: 'en',
        format: 'json'
      }
    });

    const geoData = geoResponse.data as GeocodingResponse;
    if (!geoData.results || geoData.results.length === 0) {
      console.error('Location not found:', formattedLocation);
      return null;
    }

    const { latitude, longitude } = geoData.results[0];
    console.log(`Found coordinates for ${formattedLocation}:`, { latitude, longitude });

    // Get weather forecast from Open-Meteo API
    const forecastResponse = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude,
        longitude,
        hourly: ['temperature_2m', 'relative_humidity_2m', 'precipitation_probability', 'weather_code', 'apparent_temperature', 'wind_speed_10m'],
        temperature_unit: 'fahrenheit',
        wind_speed_unit: 'mph',
        timezone: 'auto'
      }
    });

    if (!forecastResponse.data || !forecastResponse.data.hourly) {
      console.error('No forecast data received');
      return null;
    }

    // Find the forecast closest to the target date
    const targetTimestamp = date.getTime();
    const hourlyData = forecastResponse.data.hourly;
    const timeIndex = hourlyData.time.findIndex((time: string) => {
      const forecastTime = new Date(time).getTime();
      return forecastTime >= targetTimestamp;
    });

    if (timeIndex === -1) {
      console.error('No forecast data available for the target date');
      return null;
    }

    // Convert weather code to description
    const weatherCode = hourlyData.weather_code[timeIndex];
    const description = getWeatherDescription(weatherCode);

    // Determine if weather is suitable for outdoor activities
    const temperature = hourlyData.temperature_2m[timeIndex];
    const windSpeed = hourlyData.wind_speed_10m[timeIndex];
    const precipProb = hourlyData.precipitation_probability[timeIndex];

    const isSuitableForOutdoor = (
      temperature >= 40 &&
      temperature <= 95 &&
      windSpeed <= 20 &&
      precipProb < 50 &&
      !['thunderstorm', 'heavy rain', 'snow', 'heavy snow'].includes(description.toLowerCase())
    );

    const weatherData: WeatherData = {
      description,
      temperature,
      feels_like: hourlyData.apparent_temperature[timeIndex],
      humidity: hourlyData.relative_humidity_2m[timeIndex],
      wind_speed: windSpeed,
      precipitation_probability: precipProb,
      is_suitable_for_outdoor: isSuitableForOutdoor
    };

    console.log('Processed weather data for', formattedLocation, ':', weatherData);
    return weatherData;
  } catch (error: any) {
    console.error('Error fetching weather data:', error.response?.data || error.message);
    return null;
  }
}

function getWeatherDescription(code: number): string {
  // WMO Weather interpretation codes (https://open-meteo.com/en/docs)
  const weatherCodes: { [key: number]: string } = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail'
  };
  return weatherCodes[code] || 'Unknown';
}

export function suggestAlternativeActivities(weather: WeatherData, activity: string): string[] {
  const alternativeActivities: Set<string> = new Set();

  if (!weather.is_suitable_for_outdoor && activity.toLowerCase().includes('outdoor')) {
    alternativeActivities.add('Visit a local museum');
    alternativeActivities.add('Explore an indoor market');
    alternativeActivities.add('Take a cooking class');
    alternativeActivities.add('Visit an art gallery');
    alternativeActivities.add('Check out local cafes');
  }

  if (weather.temperature > 95) {
    alternativeActivities.add('Visit an indoor ice rink');
    alternativeActivities.add('Explore air-conditioned shopping centers');
    alternativeActivities.add('Visit an aquarium');
    alternativeActivities.add('Indoor spa day');
  }

  if (weather.precipitation_probability > 50) {
    alternativeActivities.add('Watch a local theater performance');
    alternativeActivities.add('Visit indoor attractions');
    alternativeActivities.add('Try local restaurants');
    alternativeActivities.add('Visit indoor entertainment centers');
  }

  return Array.from(alternativeActivities);
}