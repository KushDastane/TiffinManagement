import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export const loginUser = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { user: userCredential.user, error: null };
    } catch (error) {
        return { user: null, error: error.message };
    }
};

export const registerUser = async (email, password) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return { user: userCredential.user, error: null };
    } catch (error) {
        return { user: null, error: error.message };
    }
};

export const logoutUser = async () => {
    try {
        await firebaseSignOut(auth);
        return { error: null };
    } catch (error) {
        return { error: error.message };
    }
};

export const createUserProfile = async (uid, data) => {
    try {
        const userRef = doc(db, 'users', uid);
        await setDoc(userRef, {
            id: uid,
            ...data,
            createdAt: new Date().toISOString(),
            joinedKitchens: [],
            currentKitchenId: null
        }, { merge: true });
        return { success: true };
    } catch (error) {
        console.error("Error creating user profile:", error);
        return { error: error.message };
    }
};

export const updateUserProfile = async (uid, data) => {
    try {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, data);
        return { success: true };
    } catch (error) {
        console.error("Error updating user profile:", error);
        return { error: error.message };
    }
};
