import { User } from '../../users/entities/user.entity';

declare global {
  namespace Express {
    interface User extends Pick<UserEntity, 'id' | 'email' | 'firstName'> {
      // Adicione outras propriedades necessárias aqui
    }
    interface Request {
      user?: User;
    }
  }
}