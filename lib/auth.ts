export const ownerMode = true;

export type LocalOwnerSession = {
  user: {
    email: string;
    name: string;
  };
};

export function isApprovedEmail(_email?: string | null): boolean {
  return ownerMode;
}

export async function getServerAuthSession(): Promise<LocalOwnerSession> {
  return {
    user: {
      email: "local-owner@example.local",
      name: "Local Owner"
    }
  };
}

export async function requireOwnerSession(): Promise<LocalOwnerSession> {
  return getServerAuthSession();
}
