import axios from 'axios';

// Use relative URL so Vite proxy correctly forwards to backend
const axiosInstance = axios.create({
    baseURL: '/',
    timeout: 30000, // 30 seconds for code execution
});

export default axiosInstance;
