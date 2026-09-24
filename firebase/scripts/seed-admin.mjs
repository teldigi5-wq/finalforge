import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
const email=process.env.ADMIN_EMAIL?.trim(); const password=process.env.ADMIN_PASSWORD;
if(!email||!password) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables before running this script.');
initializeApp({credential:applicationDefault(),projectId:'finalforge-dd1cf'}); const auth=getAuth(),db=getFirestore();
let user; try{user=await auth.getUserByEmail(email); await auth.updateUser(user.uid,{password,emailVerified:true,disabled:false});}catch(e){if(e.code!=='auth/user-not-found')throw e;user=await auth.createUser({email,password,emailVerified:true});}
await auth.setCustomUserClaims(user.uid,{admin:true});
await db.collection('profiles').doc(user.uid).set({role:'admin',email,createdAt:FieldValue.serverTimestamp(),disabled:false},{merge:true});
console.log(`Admin provisioned: ${email}`);
