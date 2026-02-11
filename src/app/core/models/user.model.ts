export type UserRole = 'master' | 'admin' | 'manager' | 'user';
export type UserStatus = 'pending' | 'active' | 'inactive';

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    status: UserStatus;
    isActive: boolean;
    avatarUrl?: string | null;
    invitedBy?: User | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface AuthResponse {
    access_token: string;
    user: User;
}

export interface LoginRequest {
    email: string;
    password: string;
}
