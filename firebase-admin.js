import admin from 'firebase-admin';

const adminApp = admin.initializeApp({
    credential: admin.credential.cert('./service-account.json'),
    databaseURL: 'https://potato-bca49-default-rtdb.asia-southeast1.firebasedatabase.app/'
});

export default adminApp;
export const adminAuth = adminApp.auth();