export interface User {
  id: string;
  email: string;
  role: 'admin' | 'default';
  created_at: string;
  is_online?: boolean;
  tokens?: number;
}

export interface UserStats {
  total_users: number;
  online_users: number;
  users_list: User[];
}