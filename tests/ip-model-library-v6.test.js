import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const library=fs.readFileSync(new URL('../assets/ip-model-library-v6.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/practice-premium-v6.css',import.meta.url),'utf8');
const notice=fs.readFileSync(new URL('../tests/fixtures/ip-final-notice.txt',import.meta.url),'utf8');

test('verified IP structure remains 25 MCQ plus 2 Java programs from lectures 1-10',()=>{
  assert.match(notice,/25 MCQ questions/);
  assert.match(notice,/2 questions/);
  assert.match(notice,/Content from Lecture 1 to 10/);
  assert.match(library,/25 MCQs · 2 Java programs/);
  assert.match(library,/Lectures 1–10/);
});

test('IP model library expands deterministic papers through variant 10',()=>{
  assert.match(library,/for\(let n=5;n<=10;n\+\+\)/);
  assert.match(library,/data-start-mode=\"mock\"/);
  assert.match(library,/data-variant=\"\$\{n\}\"/);
  assert.match(library,/Ten repeatable IP model papers/);
});

test('additional IP bank covers all lecture coverage slots and three coding patterns',()=>{
  for(let coverage=1;coverage<=10;coverage++)assert.match(library,new RegExp(`coverage:${coverage}`));
  assert.match(library,/pattern:'parallel'/);
  assert.match(library,/pattern:'matrix'/);
  assert.match(library,/pattern:'methods'/);
  assert.match(library,/Student Bank Transactions/);
  assert.match(library,/LED Display Panel/);
  assert.match(library,/Night Supermarket Discount/);
});

test('review UI hides duplicate correct answer and differentiates wrong/correct answers',()=>{
  assert.match(css,/review-answer\.correct>span:nth-of-type\(2\)\{display:none!important\}/);
  assert.match(css,/review-answer\.incorrect>span:first-of-type/);
  assert.match(css,/review-answer\.incorrect>span:nth-of-type\(2\)/);
  assert.match(css,/--ff6-green:#63cfa6/);
  assert.match(css,/--ff6-red:#ef8794/);
});

test('module tabs use dark eye-comfort surfaces rather than white cards',()=>{
  assert.match(css,/practiceModuleTabs \.practice-tab/);
  assert.match(css,/background:linear-gradient\(155deg,rgba\(17,34,56/);
  assert.match(css,/data-practice-module=\"ip\"\]\.active/);
});
