import { io } from 'socket.io-client';
import { API_BASE_URL } from './api';

export const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  return API_BASE_URL.replace(/\/api\/?$/, '') || 'http://localhost:5000';
};

export const createShowSocket = () => {
  return io(getSocketUrl(), {
    autoConnect: true,
    transports: ['websocket', 'polling']
  });
};
