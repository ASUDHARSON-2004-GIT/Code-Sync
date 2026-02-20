import axios from 'axios';

// Use relative URL so Vite proxy correctly forwards to backend
const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/',
    timeout: 30000,
});

export default axiosInstance;
