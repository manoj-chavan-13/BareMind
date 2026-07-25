import axios from 'axios';
import { api } from './api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const authService = {
  async register(data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    username?: string;
  }) {
    const response = await api.post('/auth/register', data);
    return response.data; // { message, user_id, email }
  },

  async checkUsername(username: string) {
    const response = await api.get('/auth/check-username', { params: { username } });
    return response.data; // { available: boolean, message?: string }
  },

  async login(data: { email?: string; username?: string; password: string }) {
    // OAuth2PasswordRequestForm expects form-data
    const formData = new URLSearchParams();
    formData.append('username', data.email || data.username || '');
    formData.append('password', data.password);

    const response = await api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data; // { access_token, token_type }
  },

  async getMe(token?: string) {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    const response = await api.get('/users/me', config);
    return response.data;
  },

  /** Silent refresh using the HttpOnly refresh cookie */
  async refresh(): Promise<string | null> {
    try {
      const response = await axios.post(
        `${API_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      );
      return response.data.access_token;
    } catch {
      return null;
    }
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore — we'll clear local state regardless
    }
  },

  async verifyEmail(userId: string, otp: string) {
    const response = await api.post('/auth/verify-email', { user_id: userId, otp });
    return response.data;
  },

  async resendOtp(userId: string) {
    const response = await api.post('/auth/resend-otp', { user_id: userId });
    return response.data;
  },

  async forgotPassword(email: string) {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data; // { message, user_id }
  },

  async resetPassword(userId: string, otp: string, newPassword: string) {
    const response = await api.post('/auth/reset-password', {
      user_id: userId,
      otp,
      new_password: newPassword,
    });
    return response.data;
  },
};
