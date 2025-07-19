import { UserRole } from "src/modules/users/enums";

export interface JwtPayload {
  sub: string;
  email: string;
  roles: UserRole[];
}
