/**
 * Gets location information from an IP address
 */
export const getLocationFromIp = async (ipAddress: string): Promise<{
  ipLocation?: string;
}> => {
  try {
    const response = await fetch(`https://ipapi.co/${ipAddress}/json/`);
    const data = await response.json();

    if (data.error) {
      console.error('Error getting location from IP:', data.error);
      return {};
    }

    // Combine city and country as a single string
    const city = data.city || '';
    const country = data.country_name || '';
    let ipLocation = '';

    if (city && country) {
      ipLocation = `${city}, ${country}`;
    } else if (city) {
      ipLocation = city;
    } else if (country) {
      ipLocation = country;
    }

    return {
      ipLocation: ipLocation || undefined
    };
  } catch (error) {
    console.error('Error getting location from IP:', error);
    return {};
  }
};
