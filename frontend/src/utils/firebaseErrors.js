export const getFirebaseErrorMessage = (error) => {
    const errorCode = error.code;

    switch (errorCode) {
        case 'auth/operation-not-allowed':
            return 'Google Sign-In is not enabled in the Firebase Console. Please enable it in Authentication > Sign-in method.';
        case 'auth/user-not-found':
            return 'No user found with this email.';
        case 'auth/wrong-password':
            return 'Incorrect password.';
        case 'auth/email-already-in-use':
            return 'This email is already registered.';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters.';
        case 'auth/popup-closed-by-user':
            return 'Sign-in popup closed before finishing.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your internet connection.';
        case 'auth/invalid-email':
            return 'Invalid email address.';
        default:
            return error.message || 'An unexpected error occurred. Please try again.';
    }
};
