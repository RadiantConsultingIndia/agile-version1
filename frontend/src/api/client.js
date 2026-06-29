import axios from 'axios'
import { toast } from '../utils/toast'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  withCredentials: true,
})

api.interceptors.response.use(
  res => res,
  err => {
    if (!err.response) {
      toast('Cannot reach the server. Please check your connection.')
    } else if (err.response.status >= 500 && !err.response.data?.detail) {
      // Only show generic toast if backend didn't send a specific message
      // (specific messages are handled by individual page catch blocks)
      toast('Something went wrong on the server. Please try again.')
    }
    return Promise.reject(err)
  }
)

export default api
