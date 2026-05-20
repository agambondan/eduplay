export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message: string;
  error: string | null;
}

export interface AuthResponse {
  user: {
    id: string;
    username: string;
    email: string;
    xp: number;
    level: number;
    streak: number;
    avatar_color: string;
    email_verified: boolean;
  };
  access_token: string;
  refresh_token: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}
