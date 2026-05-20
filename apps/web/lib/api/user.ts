import api from './client';
import { ApiResponse } from '@/types/api';
import { User, UserStats } from '@/types/user';

export const userApi = {
  getMe: async () => {
    const res = await api.get<ApiResponse<User>>('/user/me');
    return res.data.data;
  },
  getStats: async () => {
    const res = await api.get<ApiResponse<UserStats>>('/user/stats');
    return res.data.data;
  },
  updateProfile: async (data: { username?: string }) => {
    const res = await api.patch<ApiResponse<User>>('/user/profile', data);
    return res.data.data;
  },
  uploadAvatar: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await api.post<ApiResponse<{ avatar_url: string }>>('/user/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.avatar_url;
  },
};
