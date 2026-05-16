import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  deleteUser,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { UserRole, UserProfile, SignupData } from '@/types';

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

function getErrorCode(error: unknown): string | undefined {
  return (error as { code?: string } | null)?.code;
}

interface AuthState {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  initialized: boolean;

  login: (email: string, password: string, role: UserRole) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: FirebaseUser | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  initialize: () => () => void;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      role: null,
      isLoading: false,
      isAuthenticated: false,
      initialized: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setProfile: (profile) =>
        set({ profile, role: profile?.role ?? null }),

      initialize: () => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user) {
            // Load the profile with retries (network propagation / long-poll fallback can be slow).
            // If the profile doc truly doesn't exist, sign out to avoid redirect loops with `profile=null`.
            for (let attempt = 1; attempt <= 5; attempt++) {
              try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                  const profileData = { uid: user.uid, ...userDoc.data() } as UserProfile;
                  set({
                    user,
                    profile: profileData,
                    role: profileData.role,
                    isAuthenticated: true,
                    initialized: true,
                    isLoading: false,
                  });
                  return;
                }
              } catch (error) {
                const code = getErrorCode(error);
                // Retry on transient failures
                if (
                  code === 'permission-denied' ||
                  code === 'unauthenticated' ||
                  code === 'unavailable' ||
                  code === 'deadline-exceeded'
                ) {
                  await sleep(250 * attempt);
                  continue;
                }
                console.error('Failed to load user profile:', error);
                break;
              }
              await sleep(250 * attempt);
            }

            try {
              await signOut(auth);
            } catch {
              // ignore
            }
            set({
              user: null,
              profile: null,
              role: null,
              isAuthenticated: false,
              initialized: true,
              isLoading: false,
            });
          } else {
            set({
              user: null,
              profile: null,
              role: null,
              isAuthenticated: false,
              initialized: true,
              isLoading: false,
            });
          }
        });
        return unsubscribe;
      },

      refreshProfile: async () => {
        const { user } = get();
        if (!user) return;
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const profileData = { uid: user.uid, ...userDoc.data() } as UserProfile;
            set({ profile: profileData, role: profileData.role });
          }
        } catch (error) {
          console.error('Failed to refresh profile:', error);
        }
      },

      login: async (email, password, role) => {
        set({ isLoading: true });
        try {
          const credential = await signInWithEmailAndPassword(auth, email, password);
          const userDoc = await getDoc(doc(db, 'users', credential.user.uid));

          if (!userDoc.exists()) {
            await signOut(auth);
            throw new Error('User profile not found. Please sign up first.');
          }

          const profileData = { uid: credential.user.uid, ...userDoc.data() } as UserProfile;

          if (profileData.role !== role) {
            await signOut(auth);
            throw new Error(`Recheck information. Please Check the details and role.`);
          }

          set({
            user: credential.user,
            profile: profileData,
            role: profileData.role,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      signup: async (data) => {
        set({ isLoading: true });
        let createdUser: FirebaseUser | null = null;
        try {
          const credential = await createUserWithEmailAndPassword(auth, data.email, data.password);
          createdUser = credential.user;

          // Ensure the auth session/token is ready before first Firestore write.
          // Without this, some networks can intermittently fail the first write with permission errors,
          // leaving an Auth user created but no Firestore profile document.
          await credential.user.getIdToken(true);

          const dataWithCountry = data as SignupData & { countryCode?: string };
          const countryCode =
            typeof dataWithCountry.countryCode === 'string' && dataWithCountry.countryCode.length > 0
              ? dataWithCountry.countryCode
              : undefined;

          const baseProfile = {
            uid: credential.user.uid,
            fullName: data.fullName,
            email: data.email,
            phone: data.phone,
            countryCode,
            role: data.role as UserRole,
            createdAt: serverTimestamp(),
          };

          let fullProfile: Partial<UserProfile> = { ...baseProfile };

          if (data.role === 'provider') {
            const providerData = data as { companyName: string; serviceTypes: string[]; vehicleNumber: string };
            fullProfile = {
              ...baseProfile,
              companyName: providerData.companyName,
              serviceTypes: providerData.serviceTypes as UserProfile['serviceTypes'],
              vehicleNumber: providerData.vehicleNumber,
              isVerified: false,
              isOnline: false,
              rating: 0,
              totalJobs: 0,
              totalEarnings: 0,
              };
          }

          // Retry profile creation on transient auth propagation issues (permission/unauthenticated).
          let lastError: unknown = null;
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              await setDoc(doc(db, 'users', credential.user.uid), fullProfile);
              lastError = null;
              break;
            } catch (err: unknown) {
              lastError = err;
              const code = (err as { code?: string } | null)?.code;
              if (code === 'permission-denied' || code === 'unauthenticated') {
                await credential.user.getIdToken(true);
                await new Promise((r) => setTimeout(r, 250 * attempt));
                continue;
              }
              throw err;
            }
          }
          if (lastError) throw lastError;

          const profile = { ...fullProfile, uid: credential.user.uid } as UserProfile;
          set({
            user: credential.user,
            profile,
            role: profile.role,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          // Avoid orphaned Auth accounts (email shows in Firebase Auth but no Firestore profile).
          // If profile creation failed after the auth user was created, roll back the auth user.
          try {
            if (createdUser) await deleteUser(createdUser);
          } catch (rollbackError) {
            console.warn('Failed to rollback auth user after signup error:', rollbackError);
          }
          try {
            await signOut(auth);
          } catch {
            // ignore
          }
          throw error;
        }
      },

      logout: async () => {
        await signOut(auth);
        set({
          user: null,
          profile: null,
          role: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'roadhelp-auth',
      partialize: (state) => ({ role: state.role }),
    }
  )
);
