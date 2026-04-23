import axios from 'axios';

/**
 * Axios instance pre-configured for the GoalBoard backend.
 * All screens import this instead of using axios directly,
 * so the base URL only needs to change in one place.
 */
const api = axios.create({
  baseURL: 'https://goalboard-xreq.onrender.com',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

export default api;
