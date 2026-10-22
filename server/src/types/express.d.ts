import { AuthUser } from "./shared.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      coupleId?: string;
    }
  }
}

export {};
