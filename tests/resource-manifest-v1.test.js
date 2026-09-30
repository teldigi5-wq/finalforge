import test from 'node:test';
import assert from 'node:assert/strict';
import { RESOURCE_MANIFEST, OFFICIAL_TIMETABLE_RESOURCE_ID, getResourceById, resourceIdForPath } from '../api/_resource-manifest-v1.js';

const entries = Object.values(RESOURCE_MANIFEST);
const course = entries.filter(item => item.id !== OFFICIAL_TIMETABLE_RESOURCE_ID);

test('recovered private manifest contains exactly the certified 100 course resources plus timetable', () => {
  assert.equal(course.length, 100);
  assert.equal(entries.length, 101);
  const counts = course.reduce((acc, item) => {
    const ext = item.storagePath.split('.').pop().toLowerCase();
    acc[ext] = (acc[ext] || 0) + 1;
    return acc;
  }, {});
  assert.deepEqual(counts, { pdf: 93, txt: 4, png: 3 });
  assert.equal(new Set(entries.map(item => item.id)).size, entries.length);
  assert.ok(entries.every(item => !item.storagePath.startsWith('/') && !item.storagePath.includes('..')));
  assert.ok(course.every(item => item.id === resourceIdForPath(item.storagePath)));
});

test('official timetable is a stable protected resource ID', () => {
  const item = getResourceById(OFFICIAL_TIMETABLE_RESOURCE_ID);
  assert.equal(item.id, OFFICIAL_TIMETABLE_RESOURCE_ID);
  assert.equal(item.storagePath, 'official/Y1S1_Final_Exam_Timetable_V3_15-09-2026.pdf');
});
