import axios from 'axios';

// API 베이스 경로 설정 (백엔드 main.py의 prefix와 일치)
const API_BASE_URL = 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// 모든 요청에 JWT 토큰을 자동으로 포함시키는 인터셉터
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 에러 처리 (401 발생 시 로그인 페이지로 이동 등)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);