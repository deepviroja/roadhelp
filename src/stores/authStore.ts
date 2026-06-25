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
import { collection, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { authLite as auth, dbLite as db } from '@/config/firebase-lite';
import { UserRole, UserProfile, SignupData } from '@/types';

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

function getErrorCode(error: unknown): string | undefined {
  return (error as { code?: string } | null)?.code;
}

function normalizeDigits(value: string) {
  return value.replace(/\D+/g, '');
}

function isEmailIdentifier(identifier: string) {
  return identifier.includes('@');
}

async function findUserByPhone(identifier: string) {
  const digits = normalizeDigits(identifier);
  if (!digits) return null;

  const searches = [
    query(collection(db, 'users'), where('phoneDigits', '==', digits), limit(1)),
    query(collection(db, 'users'), where('phone', '==', identifier), limit(1)),
    query(collection(db, 'users'), where('phoneE164', '==', identifier), limit(1)),
  ];

  for (const q of searches) {
    const snap = await getDocs(q);
    if (!snap.empty) {
      const first = snap.docs[0];
      return { uid: first.id, data: first.data() } as { uid: string; data: Record<string, unknown> };
    }
  }

  return null;
}

interface AuthState {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  initialized: boolean;

  login: (identifier: string, password: string, role: UserRole) => Promise<void>;
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

      login: async (identifier, password, role) => {
        set({ isLoading: true });
        try {
          let credential;
          if (isEmailIdentifier(identifier)) {
            credential = await signInWithEmailAndPassword(auth, identifier, password);
          } else {
            const matched = await findUserByPhone(identifier);
            if (!matched?.data?.email) {
              throw new Error('We could not find an account with that mobile number.');
            }
            credential = await signInWithEmailAndPassword(auth, String(matched.data.email), password);
          }

          const userDoc = await getDoc(doc(db, 'users', credential.user.uid));

          if (!userDoc.exists()) {
            await signOut(auth);
            throw new Error('We could not find your profile. Please sign up first.');
          }

          const profileData = { uid: credential.user.uid, ...userDoc.data() } as UserProfile;

          if (profileData.role !== role) {
            await signOut(auth);
            throw new Error('Please switch to the correct account type and try again.');
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

          await credential.user.getIdToken(true);

          const dataWithCountry = data as SignupData & { countryCode?: string };
          const countryCode =
            typeof dataWithCountry.countryCode === 'string' && dataWithCountry.countryCode.length > 0
              ? dataWithCountry.countryCode
              : undefined;
          const phoneDigits = normalizeDigits(data.phone);
          const phoneE164 = countryCode ? `${countryCode}${phoneDigits}` : phoneDigits;

          const baseProfile = {
            uid: credential.user.uid,
            fullName: data.fullName,
            email: data.email,
            phone: data.phone,
            phoneDigits,
            phoneE164,
            countryCode,
            role: data.role as UserRole,
            createdAt: serverTimestamp(),
          };

          let fullProfile: Partial<UserProfile> = { ...baseProfile };

          if (data.role === 'provider') {
            const providerData = data as {
              companyName: string;
              serviceTypes: string[];
              vehicleNumber: string;
              businessAddress?: string;
              city?: string;
              state?: string;
              pin?: string;
              businessHours?: string;
              serviceRadiusKm?: number;
              latitude?: number;
              longitude?: number;
            };
            fullProfile = {
              ...baseProfile,
              companyName: providerData.companyName,
              businessAddress: providerData.businessAddress,
              city: providerData.city,
              state: providerData.state,
              pin: providerData.pin,
              businessHours: providerData.businessHours,
              serviceRadiusKm: providerData.serviceRadiusKm,
              location:
                typeof providerData.latitude === 'number' && typeof providerData.longitude === 'number'
                  ? { lat: providerData.latitude, lng: providerData.longitude }
                  : undefined,
              serviceTypes: providerData.serviceTypes as UserProfile['serviceTypes'],
              vehicleNumber: providerData.vehicleNumber,
              isVerified: false,
              isOnline: false,
              rating: 0,
              totalJobs: 0,
              totalEarnings: 0,
            };
          }

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
