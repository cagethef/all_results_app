// API Configuration
// Trocar essa URL depois do deploy da Cloud Function
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Endpoints
export const ENDPOINTS = {
  getDevice: (deviceId: string) => `${API_URL}/getDevice?deviceId=${deviceId}`
};
