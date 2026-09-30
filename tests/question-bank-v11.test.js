import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeQuestion } from '../api/_question-bank-core.js';

const rootCore=fs.readFileSync('api/_question-bank-core.js','utf8');
const azureCore=fs.readFileSync('azure-api/src/vercel/_question-bank-core.js','utf8');
const rootAdmin=fs.readFileSync('api/admin-questions.js','utf8');
const rootAdminAlias=fs.readFileSync('api/question-studio-admin.js','utf8');
const azureAdmin=fs.readFileSync('azure-api/src/vercel/admin-questions.js','utf8');
const rootBank=fs.readFileSync('api/question-bank.js','utf8');
const azureBank=fs.readFileSync('azure-api/src/vercel/question-bank.js','utf8');
const azureIndex=fs.readFileSync('azure-api/src/index.js','utf8');
const rules=fs.readFileSync('firebase/firestore.rules','utf8');
const publishedRuntime=fs.readFileSync('assets/question-bank-v11.js','utf8');
const adminRuntime=fs.readFileSync('assets/admin-question-studio-v11.js','utf8');
const adminCss=fs.readFileSync('assets/admin-question-studio-v11.css','utf8');
const loader=fs.readFileSync('assets/core-loader.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');

test('question-bank server core is byte-identical across Vercel and Azure adapters',()=>{
  assert.equal(rootCore,azureCore);
  assert.equal(rootAdmin,azureAdmin);
  assert.equal(rootBank,azureBank);
  assert.match(rootAdminAlias,/export \{ default \} from '\.\/admin-questions\.js'/);
});

test('server authorization verifies revoked tokens and preserves student isolation',()=>{
  assert.match(rootCore,/verifyIdToken\(token, true\)/);
  assert.match(rootCore,/decoded\?\.admin !== true/);
  assert.match(rootCore,/decoded\?\.email_verified !== true/);
  assert.match(rootCore,/db\.collection\('profiles'\)\.doc\(uid\)/);
  assert.match(rootCore,/db\.collection\('student_allowlist'\)\.doc\(studentId\)/);
  assert.match(rootCore,/db\.collection\('student_claims'\)\.doc\(studentId\)/);
  assert.match(rootCore,/allow\?\.active !== true/);
  assert.match(rootCore,/claim\?\.uid !== uid/);
  assert.match(rootCore,/QUESTION_COLLECTION = 'question_bank_v1'/);
  assert.doesNotMatch(rules,/match \/question_bank_v1/);
});

test('admin CRUD is claim-gated, bounded and no-store',()=>{
  assert.match(rootAdmin,/verifyAdmin\(req, auth\)/);
  assert.match(rootAdmin,/MAX_BODY_BYTES = 32768/);
  assert.match(rootAdmin,/MAX_RESULTS = 250/);
  assert.match(rootAdmin,/Cache-Control', 'no-store, private/);
  assert.match(rootAdmin,/\['GET', 'POST', 'PATCH', 'DELETE'\]/);
  assert.match(rootAdmin,/Unexpected request fields/);
  assert.match(rootAdmin,/collection\.orderBy\('updatedAt', 'desc'\)\.limit\(MAX_RESULTS\)/);
  assert.match(rootAdmin,/adminWriteFields\(question, decoded/);
});

test('published feed returns published questions only after approved-account verification',()=>{
  assert.match(rootBank,/verifyQuestionReader\(req, \{ auth, db \}\)/);
  assert.match(rootBank,/where\('status', '==', 'published'\)/);
  assert.match(rootBank,/limit\(MAX_RESULTS\)/);
  assert.match(rootBank,/Cache-Control', 'no-store, private/);
  assert.doesNotMatch(rootBank,/draft/);
});

test('question validation rejects unsafe or malformed MCQs and coding questions',()=>{
  const mcq=normalizeQuestion({module:'ip',kind:'mcq',status:'published',topic:'Methods',coverage:9,q:'What is returned?',o:['1','2','3','4'],a:2,e:'Three.',snippet:'',p:[],starter:'',pattern:''});
  assert.equal(mcq.a,2);
  assert.equal(mcq.module,'ip');
  assert.throws(()=>normalizeQuestion({module:'ip',kind:'mcq',status:'published',topic:'X',coverage:1,q:'Bad',o:['A','A'],a:0}),/unique/);
  assert.throws(()=>normalizeQuestion({module:'ip',kind:'mcq',status:'published',topic:'X',coverage:1,q:'Bad',o:['A','B'],a:9}),/Correct answer/);
  assert.throws(()=>normalizeQuestion({module:'ip',kind:'code',status:'draft',topic:'Methods',coverage:9,q:'Write code',p:[]}),/rubric/);
  const code=normalizeQuestion({module:'ip',kind:'code',status:'draft',topic:'Methods',coverage:9,q:'Write code',p:['Return a double'],starter:'public class Main {}'});
  assert.deepEqual(code.p,['Return a double']);
});

test('Azure registers both v75 question routes without the reserved admin route prefix',()=>{
  assert.match(azureIndex,/app\.http\('question-studio-admin'/);
  assert.match(azureIndex,/methods: \['GET', 'POST', 'PATCH', 'DELETE'\]/);
  assert.match(azureIndex,/route: 'question-studio-admin'/);
  assert.match(azureIndex,/maxBodyBytes: 32768/);
  assert.doesNotMatch(azureIndex,/route: 'admin-questions'/);
  assert.match(azureIndex,/app\.http\('question-bank'/);
  assert.match(azureIndex,/route: 'question-bank'/);
});

test('published-question browser runtime only merges server-returned published bank entries',()=>{
  assert.doesNotThrow(()=>new Function(publishedRuntime));
  assert.match(publishedRuntime,/FINALFORGE_QUESTION_BANK_V11/);
  assert.match(publishedRuntime,/version:'11\.0\.0'/);
  assert.match(publishedRuntime,/fetch\('\/api\/question-bank'/);
  assert.match(publishedRuntime,/'X-FinalForge-Token':token/);
  assert.match(publishedRuntime,/cache:'no-store'/);
  assert.match(publishedRuntime,/_finalforgeSource:SOURCE/);
  assert.match(publishedRuntime,/finalforge-question-bank-updated/);
  assert.doesNotMatch(publishedRuntime,/Supabase|FINALFORGE_SUPABASE_SECRET_KEY/);
});

test('admin studio rechecks admin claim, uses neutral API route and labels analytics as bank health',()=>{
  assert.doesNotThrow(()=>new Function(adminRuntime));
  assert.match(adminRuntime,/getIdTokenResult\(true\)/);
  assert.match(adminRuntime,/claims\?\.admin===true/);
  assert.match(adminRuntime,/claims\?\.email_verified===true/);
  assert.match(adminRuntime,/ADMIN_API='\/api\/question-studio-admin'/);
  assert.match(adminRuntime,/fetch\(ADMIN_API/);
  assert.doesNotMatch(adminRuntime,/\/api\/admin-questions/);
  assert.match(adminRuntime,/Bank-quality metric, not a student score/);
  assert.match(adminRuntime,/does not currently centralize per-question student performance/);
  assert.match(adminRuntime,/Drafts & published questions/);
  assert.match(adminRuntime,/finalforge-question-bank-refresh/);
  assert.doesNotMatch(adminRuntime,/Supabase|FINALFORGE_SUPABASE_SECRET_KEY/);
});

test('admin studio styling is scoped, responsive and low motion',()=>{
  assert.match(adminCss,/Admin Question Studio v11/);
  assert.match(adminCss,/\.ff-v11-admin-studio/);
  assert.match(adminCss,/\.ff-v11-layout/);
  assert.match(adminCss,/\.ff-v11-bank-health/);
  assert.match(adminCss,/@media\(max-width:1120px\)/);
  assert.match(adminCss,/@media\(max-width:760px\)/);
  assert.match(adminCss,/@media\(max-width:480px\)/);
  assert.match(adminCss,/prefers-reduced-motion:reduce/);
  assert.doesNotMatch(adminCss,/animation\s*:\s*[^;]*infinite/i);
});

test('production loader and service worker certify v75 question studio assets',()=>{
  assert.match(loader,/product-v75-admin-question-studio/);
  assert.match(loader,/admin-question-studio-v11\.css/);
  assert.match(loader,/question-bank-v11\.js/);
  assert.match(loader,/admin-question-studio-v11\.js/);
  assert.ok(loader.indexOf("loadScript('assets/auth.js')")<loader.indexOf("loadScript('assets/admin-question-studio-v11.js')"));
  assert.match(sw,/finalforge-v75-admin-question-studio/);
  assert.match(sw,/\.\/assets\/question-bank-v11\.js/);
  assert.match(sw,/\.\/assets\/admin-question-studio-v11\.js/);
  assert.match(sw,/\.\/assets\/admin-question-studio-v11\.css/);
  assert.match(sw,/protectedPath\(pathname\)/);
  assert.match(sw,/cache:'no-store'/);
});
