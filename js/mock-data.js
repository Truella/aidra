// @ts-check
import './types.js';

/** @type {import('./types.js').Provider[]} */
export const PROVIDERS = [
  { id: 'p1', name: 'Dr. Chen', specialty: 'Family Medicine' },
];

/** @type {import('./types.js').Slot[]} */
export const SLOTS = [
  { id: 's1', providerId: 'p1', day: 'Monday', time: '09:00', timeRange: 'morning' },
  { id: 's2', providerId: 'p1', day: 'Monday', time: '14:00', timeRange: 'afternoon' },
  { id: 's3', providerId: 'p1', day: 'Tuesday', time: '09:00', timeRange: 'morning' },
  { id: 's4', providerId: 'p1', day: 'Tuesday', time: '10:30', timeRange: 'morning' },
  { id: 's5', providerId: 'p1', day: 'Tuesday', time: '15:00', timeRange: 'afternoon' },
  { id: 's6', providerId: 'p1', day: 'Wednesday', time: '11:00', timeRange: 'morning' },
];

export const DAYS = ['Monday', 'Tuesday', 'Wednesday'];
