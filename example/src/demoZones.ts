import type {Zone, Coordinate} from 'polyfence-react-native';

export const demoZones: Zone[] = [
  {
    id: 'demo_circle_1',
    name: 'Office',
    type: 'circle',
    center: {
      latitude: 51.5074,
      longitude: -0.1278,
    } as Coordinate,
    radius: 100,
  },
  {
    id: 'demo_polygon_1',
    name: 'London ULEZ',
    type: 'polygon',
    polygon: [
      {latitude: 51.5200, longitude: -0.1400} as Coordinate,
      {latitude: 51.5200, longitude: -0.0900} as Coordinate,
      {latitude: 51.4950, longitude: -0.0900} as Coordinate,
      {latitude: 51.4950, longitude: -0.1400} as Coordinate,
    ],
  },
  {
    id: 'demo_polygon_2',
    name: 'Parking Lot',
    type: 'polygon',
    polygon: [
      {latitude: 51.5090, longitude: -0.1180} as Coordinate,
      {latitude: 51.5100, longitude: -0.1160} as Coordinate,
      {latitude: 51.5095, longitude: -0.1140} as Coordinate,
      {latitude: 51.5085, longitude: -0.1160} as Coordinate,
    ],
  },
];
