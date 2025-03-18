import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { app } from './firebase'

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export const login = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("ログイン失敗:", error);
    return null;
  }
};

export const logout = async () => {
  await signOut(auth);
};
export { auth };
