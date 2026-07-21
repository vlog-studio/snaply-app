import { z } from 'zod';

import type { Location } from '../model/location';

/**
 * The wire shape of a location as returned by `GET /locations` (snake_case,
 * per the backend spec). Validated at the transport boundary and mapped to the
 * `Location` domain model so DTO field names never leak into the app.
 */
export const locationDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  radius_meters: z.number().int(),
  message_template: z.string(),
  category: z.enum(['관광지', '카페', '여행지']),
});

export type LocationDto = z.infer<typeof locationDtoSchema>;

export const locationsDtoSchema = z.array(locationDtoSchema);

export function mapLocation(dto: LocationDto): Location {
  return {
    id: dto.id,
    name: dto.name,
    latitude: dto.lat,
    longitude: dto.lng,
    radiusMeters: dto.radius_meters,
    messageTemplate: dto.message_template,
    category: dto.category,
  };
}
