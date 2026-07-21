import type { LocationDto } from './location.dto';

/**
 * Development fixtures for `GET /locations` while the backend does not exist.
 * Stored in the wire DTO shape so the mock exercises the same validation and
 * mapping path as the real endpoint. A representative subset of the backend's
 * planned ~50-point seed (Seoul landmarks, café districts, Jeju spots).
 */
export const mockLocationDtos: LocationDto[] = [
  {
    id: 'mock-gyeongbokgung',
    name: '경복궁',
    lat: 37.5796,
    lng: 126.977,
    radius_meters: 500,
    message_template: '{name}에서 기록을 남겨보세요!',
    category: '관광지',
  },
  {
    id: 'mock-nseoul-tower',
    name: '남산서울타워',
    lat: 37.5512,
    lng: 126.9882,
    radius_meters: 500,
    message_template: '{name}에서 기록을 남겨보세요!',
    category: '관광지',
  },
  {
    id: 'mock-bukchon',
    name: '북촌한옥마을',
    lat: 37.5826,
    lng: 126.983,
    radius_meters: 500,
    message_template: '{name}의 골목을 담아보세요!',
    category: '관광지',
  },
  {
    id: 'mock-seongsu',
    name: '성수동 카페거리',
    lat: 37.5445,
    lng: 127.0559,
    radius_meters: 500,
    message_template: '{name}에서 감성 한 컷 어때요?',
    category: '카페',
  },
  {
    id: 'mock-yeonnam',
    name: '연남동',
    lat: 37.5626,
    lng: 126.925,
    radius_meters: 500,
    message_template: '{name}에서 감성 한 컷 어때요?',
    category: '카페',
  },
  {
    id: 'mock-hongdae',
    name: '홍대',
    lat: 37.5561,
    lng: 126.9236,
    radius_meters: 500,
    message_template: '{name}의 활기를 기록해보세요!',
    category: '카페',
  },
  {
    id: 'mock-seongsan',
    name: '성산일출봉',
    lat: 33.4581,
    lng: 126.9425,
    radius_meters: 500,
    message_template: '{name}에서 여행을 남겨보세요!',
    category: '여행지',
  },
  {
    id: 'mock-hyeopjae',
    name: '협재해변',
    lat: 33.394,
    lng: 126.2396,
    radius_meters: 500,
    message_template: '{name}의 순간을 담아보세요!',
    category: '여행지',
  },
];
