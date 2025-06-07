export class LoginResponseDto {
  access_token: string;
  user: {
    id: string;
    email: string;
    role: string;
    isSuperAdmin: boolean;
    isAdmin: boolean;
    isClient: boolean;
  };
}