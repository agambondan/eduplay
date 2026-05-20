import api from './client';
import { RegisterRequest, LoginRequest, AuthResponse, ApiResponse } from '@/types/api';

export const authApi = {
  register: async (data: RegisterRequest) => {
    const res = await api.post<ApiResponse<AuthResponse>>('/auth/register', data);
    return res.data.data;
  },
  login: async (data: LoginRequest) => {
    const res = await api.post<ApiResponse<AuthResponse>>('/auth/login', data);
    return res.data.data;
  },
  logout: async () => {
    await api.post('/auth/logout');
  },
  googleLogin: async (idToken: string) => {
    const res = await api.post<ApiResponse<AuthResponse>>('/auth/google', { id_token: idToken });
    return res.data.data;
  },
  forgotPassword: async (email: string) => {
    const res = await api.post<ApiResponse<{ message: string }>>('/auth/forgot-password', { email });
    return res.data;
  },
  resetPassword: async (token: string, new_password: string) => {
    const res = await api.post<ApiResponse<{ message: string }>>('/auth/reset-password', { token, new_password });
    return res.data;
  },
  verifyEmail: async (token: string) => {
    const res = await api.get<ApiResponse<{ message: string }>>('/auth/verify-email', { params: { token } });
    return res.data;
  },
  requestVerification: async () => {
    const res = await api.post<ApiResponse<{ message: string }>>('/auth/request-verification');
    return res.data;
  },
};
