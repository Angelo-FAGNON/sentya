// Champs Sentya ajoutés à l'utilisateur, à la session et au jeton Auth.js.
import type { DefaultSession } from "next-auth";
import type { Role } from "@/lib/roles";

declare module "next-auth" {
  interface User {
    role?: Role;
    partenaireId?: string | null;
    totpRequis?: boolean;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      partenaireId: string | null;
      totpRequis: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    partenaireId?: string | null;
    totpRequis?: boolean;
  }
}
