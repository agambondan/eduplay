import api from './client';
import { ApiResponse } from '@/types/api';

export interface FriendResponse {
  id: string;
  username: string;
  status: string;
  avatar_color: string;
}

export const friendsApi = {
  list: async () => {
    const res = await api.get<ApiResponse<FriendResponse[]>>('/friends');
    return res.data.data;
  },
  listRequests: async () => {
    const res = await api.get<ApiResponse<FriendResponse[]>>('/friends/requests');
    return res.data.data;
  },
  sendRequest: async (username: string) => {
    const res = await api.post<ApiResponse<{ message: string }>>('/friends/request', { username });
    return res.data.data;
  },
  acceptRequest: async (id: string) => {
    const res = await api.post<ApiResponse<{ message: string }>>(`/friends/${id}/accept`);
    return res.data.data;
  },
  declineRequest: async (id: string) => {
    const res = await api.post<ApiResponse<{ message: string }>>(`/friends/${id}/decline`);
    return res.data.data;
  },
  removeFriend: async (id: string) => {
    const res = await api.delete<ApiResponse<{ message: string }>>(`/friends/${id}`);
    return res.data.data;
  },
};
