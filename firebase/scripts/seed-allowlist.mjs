import { readFile } from 'node:fs/promises';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const rosterPath = new URL('../private/students.json', import.meta.url);
const roster = JSON.parse(await readFile(rosterPath,'utf8'));
initializeApp({credential:applicationDefault(),projectId:'finalforge-dd1cf'});
const db=getFirestore();
const entries=Object.entries(roster);
const seen=new Set();
for(const [rawId] of entries){
  const id=rawId.trim().toUpperCase();
  if(!/^IT\d{8}$/.test(id)||seen.has(id)) throw new Error('Roster contains an invalid or duplicate Student ID. No documents were written.');
  seen.add(id);
}
for(let i=0;i<entries.length;i+=400){
  const batch=db.batch();
  for(const [studentId,meta] of entries.slice(i,i+400)){
    const normalizedId=studentId.trim().toUpperCase();
    batch.set(db.collection('student_allowlist').doc(normalizedId),{
      studentId:normalizedId,
      sliitEmail:`${normalizedId.toLowerCase()}@my.sliit.lk`,
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
