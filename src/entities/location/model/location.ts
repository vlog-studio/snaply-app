/**
 * A geofence point the app monitors for arrival. Coordinates and radius drive
 * `expo-location` geofencing; `messageTemplate` is the copy the backend uses
 * when it decides to send the arrival push. This is the app's domain model
 * (camelCase); the wire DTO is mapped in the `api` segment.
 */
export type Location = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  messageTemplate: string;
  category: LocationCategory;
};

export type LocationCategory = '관광지' | '카페' | '여행지';
