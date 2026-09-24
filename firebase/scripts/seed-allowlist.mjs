import { readFile } from 'node:fs/promises';
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const rosterPath = new URL('../private/students.json', import.meta.url);
const roster = JSON.parse(await readFile(rosterPath,'utf8'));
const cred = process.env.FIREBASE_SERVICE_ACCOUNT_JSON ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)) : applicationDefault();
initializeApp({credential:cred});
const db=getFirestore();
const entries=Object.entries(roster);
for(let i=0;i<entries.length;i+=400){
  const batch=db.batch();
  for(const [studentId,meta] of entries.slice(i,i+400)){
    const normalizedId=studentId.toUpperCase();
    batch.set(db.collection('student_allowlist').doc(normalizedId),{
      studentId:normalizedId,
      sliitEmail:`${studentId.toLowerCase()}@my.sliit.lk`,
      name:meta.name||'',
      timetableGroup:meta.timetable_group||'',
      subGroup:meta.sub_group||'',
      projectGroup:meta.project_group||'',
      active:true,
      seededAt:FieldValue.serverTimestamp()
    },{merge:true});
  }
  await batch.commit();
  console.log(`Seeded ${Math.min(i+400,entries.length)} / ${entries.length}`);
}
console.log('Student allowlist seed complete.');
