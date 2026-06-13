import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000';

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: 'admin' | 'caregiver';
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

/**
 * Authenticate with the FastAPI backend and store the returned access token
 * and user metadata in localStorage.
 */
export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const response = await axios.post<LoginResponse>(`${API_URL}/auth/login`, {
    email,
    password,
  });
  
  if (response.data.access_token) {
    try {
      localStorage.setItem('carepulse_token', response.data.access_token);
      localStorage.setItem('carepulse_user', JSON.stringify(response.data.user));
    } catch (e) {
      console.error('Error writing to localStorage:', e);
    }
  }
  
  return response.data;
};

/**
 * Remove stored session tokens and redirect payload.
 */
export const logout = (): void => {
  try {
    localStorage.removeItem('carepulse_token');
    localStorage.removeItem('carepulse_user');
  } catch (e) {
    console.error('Error clearing localStorage on logout:', e);
  }
};

/**
 * Retrieve the current logged-in user's profile metadata.
 */
export const getCurrentUser = (): User | null => {
  try {
    const userStr = localStorage.getItem('carepulse_user');
    if (!userStr || userStr === 'undefined' || userStr === 'null') return null;
    return JSON.parse(userStr) as User;
  } catch (e) {
    console.error('Error reading user from localStorage:', e);
    return null;
  }
};

/**
 * Check if the client session has a token.
 */
export const isAuthenticated = (): boolean => {
  try {
    const token = localStorage.getItem('carepulse_token');
    if (!token || token === 'undefined' || token === 'null') {
      return false;
    }
    return true;
  } catch (e) {
    console.error('Error checking isAuthenticated status:', e);
    return false;
  }
};

