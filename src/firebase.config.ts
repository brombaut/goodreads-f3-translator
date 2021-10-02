import dotenv = require('dotenv');
import { FirebaseConfigurer } from "firebase-firestore-facade";
dotenv.config();

const firebaseConfig: FirebaseConfigurer = {
  apiKey: process.env.API_KEY || '',
  authDomain: process.env.AUTH_DOMAIN || '',
  projectId: process.env.PROJECT_ID || '',
  storageBucket: process.env.STORAGE_BUCKET || '',
  messagingSenderId: process.env.MESSAGING_SENDER_ID || '',
  appId: process.env.APP_ID || '',
  measurementId: process.env.MEASUREMENT_ID || '',
  auth: {
    email: process.env.TEST_USER_EMAIL || '',
    password: process.env.TEST_USER_PASSWORD || '',
  },
};

export { firebaseConfig };
