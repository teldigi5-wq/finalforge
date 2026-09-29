import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const signup=fs.readFileSync('api/signup.js','utf8');
const azureSignup=fs.readFileSync('azure-api/src/vercel/signup.js','utf8');
const activate=fs.readFileSync('api/activate-account.js','utf8');
const azureActivate=fs.readFileSync('azure-api/src/vercel/activate-account.js','utf8');
const restart=fs.readFileSync('api/restart-registration.js','utf8');
const azureRestart=fs.readFileSync('azure-api/src/vercel/restart-registration.js','utf8');
const auth=fs.readFileSync('assets/auth.js','utf8');
const dom=fs.readFileSync('assets/auth-flow-dom-v1.js','utf8');
const mobileCss=fs.readFileSync('assets/mobile-premium-v7.css','utf8');
const compactCss=fs.readFileSync('assets/auth-mobile-compact-v8.css','utf8');
const premiumAuthCss=fs.readFileSync('assets/auth-premium-v9.css','utf8');
const mobilePremiumV10=fs.readFileSync('assets/auth-mobile-premium-v10.css','utf8');
const desktopPremiumV11=fs.readFileSync('assets/auth-desktop-premium-v11.css','utf8');
const viewportJs=fs.readFileSync('assets/auth-mobile-viewport-v1.js','utf8');
const loader=fs.readFileSync('assets/core-loader.js','utf8');
const rules=fs.readFileSync('firebase/firestore.rules','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const azureIndex=fs.readFileSync('azure-api/src/index.js','utf8');

const executable=source=>source.replace(/^\s*\/\/.*$/gm,'').replace(/\s+/g,' ').trim();

test('Vercel and Azure signup handlers stay identical',()=>{
  assert.equal(signup,azureSignup);
  assert.match(signup,/REGISTRATION_WINDOW_MS = 20 \* 60 \* 1000/);
  assert.match(signup,/pending_registrations/);
  assert.match(signup,/const email = \/\^IT\\d\{8\}\$\/.test\(id\)/);
  assert.match(signup,/Unexpected signup fields/);
  assert.doesNotMatch(signup,/FieldValue\.increment\(1\)/);
  assert.doesNotMatch(signup,/sliitEmail, password/);
});

test('activation is revocation-aware, server-side and time bounded',()=>{
  assert.equal(executable(activate),executable(azureActivate));
  assert.match(activate,/verifyIdToken\(token, true\)/);
  assert.match(activate,/pending_registrations/);
  assert.match(activate,/expiresAt <= now/);
  assert.match(activate,/REGISTRATION_EXPIRED/);
  assert.match(activate,/student_claims/);
  assert.match(activate,/profiles/);
  assert.match(activate,/FieldValue\.increment\(1\)/);
  assert.match(activate,/Cache-Control', 'no-store, private/);
});

test('expired registration can be restarted without changing Firebase Auth users',()=>{
  assert.equal(restart,azureRestart);
  assert.match(restart,/REGISTRATION_WINDOW_MS = 20 \* 60 \* 1000/);
  assert.match(restart,/verifyIdToken\(token, true\)/);
  assert.match(restart,/pending_registrations/);
  assert.match(restart,/expiresAt: new Date\(expiresAt\)/);
  assert.doesNotMatch(restart,/deleteUser\(/);
  assert.doesNotMatch(restart,/updateUser\(/);
});

test('browser auth uses only server activation and restart APIs',()=>{
  assert.doesNotThrow(()=>new Function(auth));
  assert.match(auth,/postAuthenticated\('\/api\/activate-account'/);
  assert.match(auth,/postAuthenticated\('\/api\/restart-registration'/);
  assert.match(auth,/JSON\.stringify\(\{ studentId: id, password \}\)/);
  assert.match(auth,/20-minute/);
  assert.doesNotMatch(auth,/transaction\.set\(claimRef/);
});

test('auth DOM layer is one-shot and removes manual SLIIT email editing',()=>{
  assert.doesNotThrow(()=>new Function(dom));
  assert.match(dom,/derived\.closest\('label'\)/);
  assert.match(dom,/replaceWith\(identity\)/);
  assert.match(dom,/20 min/);
  assert.match(dom,/verifyRestartBtn/);
  assert.doesNotMatch(dom,/MutationObserver/);
  assert.doesNotMatch(dom,/setInterval/);
});

test('Firestore browser rules cannot bypass server-certified activation',()=>{
  assert.match(rules,/match \/pending_registrations\/\{uid\}/);
  assert.match(rules,/allow read, write: if false/);
  assert.match(rules,/match \/student_claims\/\{studentId\}/);
  assert.match(rules,/allow create, update: if false/);
  assert.match(rules,/match \/profiles\/\{uid\}/);
  assert.match(rules,/allow create: if false/);
});

test('Azure exposes both account lifecycle routes',()=>{
  assert.match(azureIndex,/app\.http\('activate-account'/);
  assert.match(azureIndex,/route: 'activate-account'/);
  assert.match(azureIndex,/app\.http\('restart-registration'/);
  assert.match(azureIndex,/route: 'restart-registration'/);
});

test('mobile premium layer is responsive and low-motion',()=>{
  assert.match(mobileCss,/@media\(max-width:900px\)/);
  assert.match(mobileCss,/min-height:44px/);
  assert.match(mobileCss,/font-size:16px/);
  assert.match(mobileCss,/overflow-x:auto/);
  assert.match(mobileCss,/prefers-reduced-motion:reduce/);
  assert.doesNotMatch(mobileCss,/animation\s*:\s*[^;]*infinite/i);
});

test('mobile signup is compact, scrollable and keeps confirm-password reachable',()=>{
  assert.match(compactCss,/#signupForm/);
  assert.match(compactCss,/overflow-y:auto!important/);
  assert.match(compactCss,/scroll-padding-bottom/);
  assert.match(compactCss,/scroll-margin-bottom:42vh/);
  assert.match(compactCss,/Auth Mobile Compact v8/);
  assert.match(compactCss,/#signupForm>\.password-hint/);
  assert.match(compactCss,/pointer-events:none!important/);
  assert.doesNotMatch(compactCss,/animation\s*:\s*[^;]*infinite/i);
});

test('premium auth v9 adds study imagery without regressing compact signup',()=>{
  assert.match(premiumAuthCss,/Auth Premium v9/);
  assert.match(premiumAuthCss,/study-room\.webp/);
  assert.match(premiumAuthCss,/data-mode="login"/);
  assert.match(premiumAuthCss,/data-mode="signup"/);
  assert.match(premiumAuthCss,/prefers-reduced-motion:reduce/);
  assert.doesNotMatch(premiumAuthCss,/animation\s*:\s*[^;]*infinite/i);
});

test('mobile premium v10 reduces vertical load and fixes remember-control sizing',()=>{
  assert.match(mobilePremiumV10,/Auth Mobile Premium v10/);
  assert.match(mobilePremiumV10,/auth-desktop-premium-v11\.css/);
  assert.match(mobilePremiumV10,/ff-auth-runtime-status/);
  assert.match(mobilePremiumV10,/height:20px!important/);
  assert.match(mobilePremiumV10,/min-height:50px!important/);
  assert.match(mobilePremiumV10,/max\(96px,calc\(72px \+ env\(safe-area-inset-bottom\)\)\)/);
  assert.match(mobilePremiumV10,/pointer-events:none!important/);
  assert.match(mobilePremiumV10,/prefers-reduced-motion: reduce/);
  assert.doesNotMatch(mobilePremiumV10,/animation\s*:\s*[^;]*infinite/i);
});

test('desktop premium v11 removes nested auth scrolling and old overlapping hero slab',()=>{
  assert.match(desktopPremiumV11,/Auth Desktop Premium v11/);
  assert.match(desktopPremiumV11,/@media \(min-width:901px\)/);
  assert.match(desktopPremiumV11,/max-height:none!important/);
  assert.match(desktopPremiumV11,/overflow:visible!important/);
  assert.match(desktopPremiumV11,/\.ff-auth-brandcontent/);
  assert.match(desktopPremiumV11,/background:transparent!important/);
  assert.match(desktopPremiumV11,/\.ff-remember input\[type="checkbox"\]/);
  assert.match(desktopPremiumV11,/pointer-events:none!important/);
  assert.match(desktopPremiumV11,/prefers-reduced-motion:reduce/);
  assert.doesNotMatch(desktopPremiumV11,/animation\s*:\s*[^;]*infinite/i);
});

test('mobile auth viewport recovery is event-driven and keyboard-aware',()=>{
  assert.doesNotThrow(()=>new Function(viewportJs));
  assert.match(viewportJs,/visualViewport/);
  assert.match(viewportJs,/focusin/);
  assert.match(viewportJs,/scrollIntoView/);
  assert.match(viewportJs,/keyboardLikely/);
  assert.doesNotMatch(viewportJs,/MutationObserver/);
  assert.doesNotMatch(viewportJs,/setInterval/);
});

test('service worker advances v68 and treats desktop/mobile auth assets as critical',()=>{
  assert.match(sw,/finalforge-v68-auth-desktop-premium/);
  assert.match(sw,/auth-flow-dom-v1\.js/);
  assert.match(sw,/mobile-premium-v7\.css/);
  assert.match(sw,/auth-mobile-compact-v8\.css/);
  assert.match(sw,/auth-premium-v9\.css/);
  assert.match(sw,/auth-mobile-premium-v10\.css/);
  assert.match(sw,/auth-desktop-premium-v11\.css/);
  assert.match(sw,/auth-mobile-viewport-v1\.js/);
  assert.match(sw,/study-room\.webp/);
  assert.match(sw,/pathname\.startsWith\('\/api\/'\)/);
  assert.match(loader,/auth-mobile-premium-v67/);
  assert.match(loader,/auth-mobile-compact-v8\.css/);
  assert.match(loader,/auth-premium-v9\.css/);
  assert.match(loader,/auth-mobile-premium-v10\.css/);
  assert.match(loader,/auth-mobile-viewport-v1\.js/);
});