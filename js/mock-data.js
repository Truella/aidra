// @ts-check
import './types.js';

/** @type {import('./types.js').Provider[]} */
export const PROVIDERS = [
  { id: 'p1', name: 'Dr. Sarah Chen', specialty: 'Family Medicine' },
  { id: 'p2', name: 'Dr. Marcus Vance', specialty: 'Cardiology' },
  { id: 'p3', name: 'Dr. Elena Rostova', specialty: 'Neurology' },
];

/** @type {import('./types.js').Slot[]} */
export const SLOTS = [
  // Dr. Sarah Chen (Family Medicine)
  { id: 's1', providerId: 'p1', day: 'Monday', time: '09:00', timeRange: 'morning' },
  { id: 's2', providerId: 'p1', day: 'Monday', time: '14:00', timeRange: 'afternoon' },
  { id: 's3', providerId: 'p1', day: 'Tuesday', time: '09:00', timeRange: 'morning' },
  { id: 's4', providerId: 'p1', day: 'Tuesday', time: '10:30', timeRange: 'morning' },
  { id: 's5', providerId: 'p1', day: 'Tuesday', time: '15:00', timeRange: 'afternoon' },
  { id: 's6', providerId: 'p1', day: 'Wednesday', time: '11:00', timeRange: 'morning' },

  // Dr. Marcus Vance (Cardiology)
  { id: 's7', providerId: 'p2', day: 'Monday', time: '10:00', timeRange: 'morning' },
  { id: 's8', providerId: 'p2', day: 'Tuesday', time: '14:00', timeRange: 'afternoon' },
  { id: 's9', providerId: 'p2', day: 'Tuesday', time: '16:00', timeRange: 'afternoon' },
  { id: 's10', providerId: 'p2', day: 'Wednesday', time: '09:30', timeRange: 'morning' },

  // Dr. Elena Rostova (Neurology)
  { id: 's11', providerId: 'p3', day: 'Monday', time: '11:30', timeRange: 'morning' },
  { id: 's12', providerId: 'p3', day: 'Monday', time: '15:30', timeRange: 'afternoon' },
  { id: 's13', providerId: 'p3', day: 'Tuesday', time: '11:00', timeRange: 'morning' },
  { id: 's14', providerId: 'p3', day: 'Wednesday', time: '14:30', timeRange: 'afternoon' },
];

export const DAYS = ['Monday', 'Tuesday', 'Wednesday'];
