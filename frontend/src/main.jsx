import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import axios from 'axios'

// Set default base URL for all axios requests
// In production, VITE_API_URL should be set to your backend URL
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'https://code-sync-backend-x3t4.onrender.com';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
