// Safe authentication boundary microbenchmark. NO Firebase app, network, or real students.
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {cpus, platform, arch, availableParallelism} from 'node:os';
import {writeFileSync} from 'node:fs';
import {registerStudent} from '../api/signup.js';

let authCreateAttempts=0, transactionCount=0, allowlistReads=0, claimReads=0;
const auth={createUser:async()=>{authCreateAttempts++;throw Error('Benchmark must not create accounts');}};
const db={
  runTransaction: async fn=>{
    transactionCount++;
    return fn({get:async()=>({data:()=>null}),set:()=>{}});
  },
  collection:name=>({
    doc:id=>({
      get:async()=>{
        if(name==='student_allowlist'){
          allowlistReads++;
          const approved=id.endsWith('22222');
          const active=!id.endsWith('22222');
          return {exists:approved||id.endsWith('33333'),
            data:()=>({active,sliitEmail:id.toLowerCase()+'@my.sliit.lk'})};
        }
        if(name==='student_claims'){
          claimReads++;
          return {exists:id.endsWith('33333')};
        }
        throw Error('Benchmark accessed an unexpected Firestore collection: '+name);
      }
    })
  })
};
const backend={auth,db},password='synthetic-benchmark-only-passphrase';
const inputs=[
  {scenario:'invalid_identifier',runs:600,budgetMs:15,
    input:{studentId:'INVALID',password,ip:'198.51.100.1'},expected:400},
  {scenario:'unapproved_allowlist_denial',runs:300,budgetMs:40,
    input:{studentId:'IT26111111',password,ip:'198.51.100.2'},expected:403},
  {scenario:'inactive_allowlist_denial',runs:300,budgetMs:40,
    input:{studentId:'IT26122222',password,ip:'198.51.100.3'},expected:403},
  {scenario:'claimed_account_rejection',runs:300,budgetMs:40,
    input:{studentId:'IT26133333',password,ip:'198.51.100.4'},expected:409},
];
const percentile=(sorted,p)=>Number(sorted[Math.max(0,Math.ceil(sorted.length*p)-1)].toFixed(4));
const round=n=>Number(n.toFixed(4));
async function measure(target){
  for(let i=0;i<16;i++){
    const warm=await registerStudent(target.input,backend);
    assert.equal(warm.status,target.expected);
  }
  if(globalThis.gc)globalThis.gc();
  const startHeap=process.memoryUsage().heapUsed,startCpu=process.cpuUsage();
  const timings=[],began=performance.now();
  let peak=startHeap;
  for(let i=0;i<target.runs;i++){
    const t=performance.now();
    const result=await registerStudent(target.input,backend);
    timings.push(performance.now()-t);
    assert.equal(result.status,target.expected);
    if(i%20===0)peak=Math.max(peak,process.memoryUsage().heapUsed);
  }
  const elapsed=performance.now()-began,cpu=process.cpuUsage(startCpu);
  if(globalThis.gc)globalThis.gc();
  const heapDelta=process.memoryUsage().heapUsed-startHeap;
  timings.sort((a,b)=>a-b);
  return {
    scenario:target.scenario,operations:target.runs,success:target.runs,
    medianMs:percentile(timings,.5),p95Ms:percentile(timings,.95),
    p99Ms:percentile(timings,.99),maxMs:round(timings.at(-1)),
    elapsedMs:round(elapsed),inProcessOpsPerSecond:round(target.runs*1000/elapsed),
    cpuMs:round((cpu.user+cpu.system)/1000),
    peakHeapMiB:round(peak/1048576),heapDeltaAfterGcMiB:round(heapDelta/1048576),
    proposedP95BudgetMs:target.budgetMs,
    budgetAdvisory:percentile(timings,.95)>target.budgetMs?'REVIEW':'within budget'
  };
}
const results=[];
for(const scenario of inputs){
  const row=await measure(scenario);
  results.push(row);
  console.log('BENCH '+JSON.stringify(row));
}
assert.equal(authCreateAttempts,0,'No Firebase accounts must be created');
assert.ok(transactionCount>0 && allowlistReads>0 && claimReads>0,'Expected denial paths exercised');
const output={
  benchmark:'FinalForge offline registration-denial baseline',
  scope:'IN-PROCESS mocked Firestore, not end-to-end Firebase Auth, Firestore, Vercel, or deployed performance',
  gitSha:process.env.GITHUB_SHA||'local',node:process.version,
  platform:platform(),arch:arch(),cpuModel:cpus()[0]?.model||'unknown',
  availableCpus:availableParallelism(),results,
  fakeBackend:{authCreateAttempts,transactionCount,allowlistReads,claimReads},
  budgets:'advisory only due to shared CI variance; correctness and zero account creation are required'
};
writeFileSync('benchmark-results.json',JSON.stringify(output,null,2)+'\n');
console.log('BENCH_SUMMARY '+JSON.stringify({
  scenarios:results.length,totalOperations:results.reduce((x,row)=>x+row.operations,0),
  passed:results.every(r=>r.success===r.operations),
  authCreateAttempts,advisories:results.filter(x=>x.budgetAdvisory==='REVIEW').map(x=>x.scenario)
}));
