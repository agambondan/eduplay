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
};
