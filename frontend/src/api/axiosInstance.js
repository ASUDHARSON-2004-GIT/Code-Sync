import axios from 'axios';

// During local development, if VITE_API_URL is empty, it will use the Vite proxy
const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '',
    timeout: 30000,
});

// Add a request interceptor to help debug
axiosInstance.interceptors.request.use(config => {
    console.log(`📡 Sending ${config.method.toUpperCase()} to ${config.baseURL}${config.url}`);
    return config;
}, error => {
    return Promise.reject(error);
});

export default axiosInstance;
