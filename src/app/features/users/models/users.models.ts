import { User } from '../../../core/models/user.model';

export interface UserInvite {
  id: string;
  email: string;
  role?: string;
  tabs?: string[];
  inviteToken: string;
  inviteExpiresAt: string;
  invitedBy: User;
  createdAt: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  tabs: string[];
}

export interface InviteResponse {
  user: User;
  inviteLink: string;
  inviteCode: string;
  emailSent: boolean;
  emailError?: string;
}

export type UsersTab = 'users' | 'invites' | 'registrations';
