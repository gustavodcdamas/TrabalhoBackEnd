export interface PasswordHasher {
  hash(password: string): Promise<string>;
  compare(attempt: string, hash: string): Promise<boolean>;
}
