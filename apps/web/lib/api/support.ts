import api from './client';

export interface SupportTicketPayload {
  name: string;
  email: string;
  category: 'bug' | 'feedback' | 'saran';
  message: string;
}

export const supportApi = {
  submit: async (payload: SupportTicketPayload) => {
    const res = await api.post('/support', payload);
    return res.data;
  },
};
