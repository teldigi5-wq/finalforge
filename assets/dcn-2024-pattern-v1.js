/* FinalForge — IE1030 DCN 2024-pattern practice paper.
   This is an original reconstruction of the publicly described 2024 exam pattern.
   It does not reproduce the source paper verbatim. */
(() => {
  'use strict';

  const KEY = 'finalforge_dcn_2024_pattern_v1';
  const TITLE = 'DCN 2024 Pattern Practice Paper';
  const DURATION = 120 * 60;
  const SOURCE_NOTE = 'Original FinalForge reconstruction based on the publicly described 2024 IE1030 pattern.';
  let state = null;
  let timer = 0;

  const $ = s => document.querySelector(s);
  const esc = (value='') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
  const save = () => { if(state && !state.finished){ state.savedAt = Date.now(); localStorage.setItem(KEY, JSON.stringify(state)); } };
  const clear = () => localStorage.removeItem(KEY);
  const uid = i => `dcn24-${String(i).padStart(2,'0')}`;
  const fmtTime = seconds => { seconds=Math.max(0,seconds|0); return [Math.floor(seconds/3600),Math.floor(seconds%3600/60),seconds%60].map(n=>String(n).padStart(2,'0')).join(':'); };

  const mcq = (n,q,o,a,e) => ({id:uid(n),kind:'mcq',section:'Section A · MCQ',marks:1,q,o,a,e,p:[],s:SOURCE_NOTE});
  const written = (n,section,marks,q,p) => ({id:uid(n),kind:'written',section,marks,q,o:[],a:null,e:'',p,s:SOURCE_NOTE});

  const QUESTIONS = [
    mcq(1,'Which statement best describes the main responsibility of the OSI Physical layer?',['It defines signalling, media and bit transmission requirements.','It decides the best route between IP networks.','It manages end-to-end reliability between applications.','It translates domain names into IP addresses.'],0,'The Physical layer concerns raw bit transmission, signalling and the physical medium.'),
    mcq(2,'What is the main purpose of a subnet mask in IPv4 addressing?',['To encrypt the host portion of an address.','To separate the network and host portions of an IPv4 address.','To assign a MAC address to each interface.','To identify the default gateway automatically.'],1,'The subnet mask determines which bits belong to the network prefix and which belong to the host portion.'),
    mcq(3,'A smartwatch connects directly to a phone using Bluetooth over a few metres. Which network type best fits this example?',['WAN','MAN','PAN','Campus network'],2,'Bluetooth connections around one person are a typical Personal Area Network.'),
    mcq(4,'How does classic Ethernet CSMA/CD respond after a collision is detected?',['It permanently blocks the sending host.','It retransmits immediately with no delay.','It waits for a random backoff interval before retransmitting.','It changes the frame into a token.'],2,'CSMA/CD uses collision detection followed by a randomized backoff before another transmission attempt.'),
    mcq(5,'Which identifier is primarily used by the Data Link layer to deliver an Ethernet frame on a local network?',['TCP port','MAC address','DNS name','URL'],1,'Ethernet forwarding inside a LAN is based on MAC addresses.'),
    mcq(6,'Which difference between an Ethernet switch and a hub is correct?',['A hub learns MAC addresses but a switch cannot.','A switch normally forwards a unicast frame only toward the destination port, while a hub repeats traffic out all other ports.','A hub operates at Layer 3 and a switch at Layer 1.','A switch cannot support full-duplex communication.'],1,'A switch makes forwarding decisions using its MAC address table, while a hub simply repeats signals.'),
    mcq(7,'What is a major benefit of using VLANs?',['They physically increase cable length.','They create logical broadcast-domain separation without requiring a completely separate physical switch for every group.','They remove the need for IP addressing.','They replace routing protocols.'],1,'VLANs logically segment a switched network into separate broadcast domains.'),
    mcq(8,'What is the purpose of the CRC/FCS field in an Ethernet frame?',['To assign the source IP address.','To detect frame corruption during transmission.','To choose a routing protocol.','To store the destination TCP port.'],1,'The frame check sequence lets the receiver detect transmission errors.'),
    mcq(9,'Why can VLANs improve network security when designed correctly?',['They automatically encrypt all traffic.','They can separate groups into different broadcast domains and require controlled Layer-3 communication between them.','They hide every MAC address.','They prevent all malware without firewalls.'],1,'Segmentation reduces unnecessary reachability and makes inter-VLAN access controllable.'),
    mcq(10,'A switch receives a frame whose destination MAC address is not in its MAC table. What will it normally do?',['Drop the frame immediately.','Flood the frame out all ports in the same VLAN except the incoming port.','Send the frame only to the default gateway.','Convert the destination MAC into an IP address.'],1,'Unknown unicast traffic is flooded within the relevant VLAN until the switch learns the destination location.'),
    mcq(11,'What is the main function of a router?',['To regenerate electrical signals only.','To forward packets between different IP networks.','To assign Ethernet CRC values.','To replace DNS servers.'],1,'Routers operate at the network layer to move packets between IP networks.'),
    mcq(12,'Why is packet switching usually more efficient for bursty data traffic than a dedicated circuit?',['Every flow receives a permanently reserved path.','Many users can statistically share the same links instead of reserving capacity continuously.','Packets never experience delay.','No addressing is required.'],1,'Packet switching lets multiple traffic flows share network resources dynamically.'),
    mcq(13,'Host A is 192.168.20.34/24 and Host B is 192.168.20.201/24. Which statement is correct?',['They are in different /24 networks.','They are in the same /24 network.','They must use public IP addresses to communicate.','The subnet mask is invalid.'],1,'Both addresses belong to network 192.168.20.0/24.'),
    mcq(14,'What is the purpose of an IPv4 loopback address such as 127.0.0.1?',['To reach the nearest router.','To test the local TCP/IP stack without sending traffic onto the physical network.','To obtain an address from DHCP.','To identify the broadcast address.'],1,'Loopback traffic stays on the local host and is useful for testing the local protocol stack.'),
    mcq(15,'Which description of a MAC address is most accurate?',['A logical Layer-3 address used for routing across the Internet.','A Layer-2 hardware/interface identifier used for local frame delivery.','A human-readable DNS record.','A transport-layer session number.'],1,'MAC addresses are Layer-2 identifiers used by technologies such as Ethernet.'),
    mcq(16,'What is the network address of 172.16.7.18/22?',['172.16.4.0','172.16.6.0','172.16.7.0','172.16.8.0'],0,'A /22 mask is 255.255.252.0, so third-octet networks increase in blocks of 4: 0,4,8,...'),
    mcq(17,'What does VLAN stand for?',['Virtual Local Area Network','Variable Link Access Node','Verified Local Address Network','Virtual Layered Access Number'],0,'VLAN means Virtual Local Area Network.'),
    mcq(18,'Which TCP/IP model layer corresponds most closely to the OSI Transport layer?',['Internet','Transport','Network Access','Application'],1,'Both models have a transport function responsible for end-to-end delivery services.'),
    mcq(19,'In a bus topology, how are stations connected?',['Each device has a dedicated link to every other device.','All devices share a common backbone medium.','Every device connects only to a central switch.','Devices form a closed ring with no shared medium.'],1,'A classic bus topology uses a shared backbone cable.'),
    mcq(20,'Which expansion of CSMA/CD is correct?',['Carrier Sense Multiple Access with Collision Detection','Circuit Switched Multiple Access with Carrier Detection','Carrier Secured Media Access with Collision Division','Collision Sense Multiple Access with Circuit Detection'],0,'CSMA/CD stands for Carrier Sense Multiple Access with Collision Detection.'),
    mcq(21,'Which device normally learns source MAC addresses and builds a forwarding table?',['Hub','Layer-2 switch','Repeater','Modem only'],1,'Switches learn source MAC addresses and associate them with incoming ports.'),
    mcq(22,'What is ARP used for on an IPv4 Ethernet LAN?',['Mapping an IPv4 address to the corresponding local MAC address.','Mapping a domain name to an IPv6 address only.','Assigning TCP port numbers.','Encrypting Ethernet frames.'],0,'ARP resolves a local IPv4 next-hop address to a Layer-2 MAC address.'),
    mcq(23,'Which sequence correctly represents the common DHCP DORA process?',['Discover → Offer → Request → Acknowledge','Discover → Request → Offer → Acknowledge','Offer → Discover → Acknowledge → Request','Request → Discover → Offer → Acknowledge'],0,'DORA stands for Discover, Offer, Request and Acknowledge.'),
    mcq(24,'Which DNS server is responsible for giving authoritative answers for records inside a zone it hosts?',['Recursive resolver only','Authoritative DNS server','DHCP relay','Default gateway'],1,'An authoritative server hosts zone data and returns authoritative answers for names in that zone.'),
    mcq(25,'Which protocol is commonly used by the ping utility?',['ARP only','ICMP','FTP','SMTP'],1,'Ping uses ICMP Echo Request and Echo Reply messages.'),
    mcq(26,'Which IPv6 address is the correctly compressed form of 2001:0db8:0000:0000:0000:0000:0000:0025?',['2001:db8::25','2001::db8::25','2001:db8:0:0:0:0:0:0250','2001:0db8::0000::25'],0,'Leading zeroes in hextets can be removed and one longest sequence of zero hextets can be replaced by ::.'),
    mcq(27,'Which statement correctly compares symmetric and public-key cryptography?',['Symmetric encryption uses the same shared secret for encryption and decryption, while public-key systems use a mathematically related key pair.','Public-key encryption always uses one shared secret key.','Symmetric encryption requires a certificate authority for every packet.','The two methods are identical except for key length.'],0,'Symmetric cryptography uses a shared secret; asymmetric cryptography uses public/private key pairs.'),
    mcq(28,'A TCP segment begins with sequence number 3000 and carries 500 bytes of payload. Assuming no loss, what sequence number should the next segment begin with?',['3001','3499','3500','4000'],2,'TCP sequence numbers count bytes, so the next byte after 500 bytes beginning at 3000 is 3500.'),
    mcq(29,'Which formula is the Shannon capacity expression for an idealized noisy channel?',['C = B log2(1 + S/N)','C = 2B log2(M)','C = S + N + B','C = B / (S/N)'],0,'Shannon capacity is C = B log2(1 + S/N), where S/N is a linear power ratio.'),
    mcq(30,'A /27 IPv4 subnet contains how many total addresses?',['16','30','32','64'],2,'A /27 leaves 5 host bits, so the subnet contains 2^5 = 32 total addresses.'),

    written(31,'Section B · Structured',8,'Explain why ARP mapping is necessary when an IPv4 host wants to send a packet to another device on the same Ethernet LAN. Describe the request/reply process and what information is cached.',[
      'State that Ethernet delivery requires a destination MAC address while applications/IP use an IPv4 destination address.',
      'Explain that the sender first determines whether the destination is local using its IP address and subnet mask.',
      'Describe an ARP Request broadcast asking which host owns the target IPv4 address.',
      'Describe the unicast ARP Reply containing the target interface MAC address.',
      'Mention that the sender stores the mapping temporarily in the ARP cache before sending the Ethernet frame.'
    ]),
    written(32,'Section B · Structured',8,'A new host joins IPv4 network 192.168.40.0/24 and has no IP configuration. For DHCP Discover, Offer, Request and Acknowledge, state the typical source and destination IPv4 addresses used before the client is fully configured, and briefly explain why broadcast communication is needed.',[
      'DHCP Discover: source 0.0.0.0, destination 255.255.255.255.',
      'DHCP Offer: server uses its configured IPv4 address as source; the destination is commonly broadcast when the client is not yet fully configured.',
      'DHCP Request: client commonly uses source 0.0.0.0 and destination 255.255.255.255 while selecting/confirming the offered address.',
      'DHCP ACK: server source is its own IPv4 address; destination may be broadcast or directed to the client depending on client state/flags.',
      'Explain that the client initially does not know its own usable address or the DHCP server address.'
    ]),
    written(33,'Section B · Structured',8,'Describe the role of authoritative DNS servers in the DNS hierarchy. How is an authoritative answer different from a cached answer returned by a recursive resolver?',[
      'Authoritative servers host the official records for zones they are responsible for.',
      'DNS hierarchy delegates authority from root to TLD to lower-level authoritative servers.',
      'A recursive resolver performs lookup work on behalf of a client and may cache previous answers.',
      'An authoritative answer comes from a server with authority for the relevant zone; a cached answer is reused from resolver cache until TTL expiry.',
      'Mention that caching improves performance and reduces repeated upstream queries.'
    ]),
    written(34,'Section B · Structured',10,'Explain the concept of an Autonomous System (AS). Compare an Interior Gateway Protocol (IGP) with an Exterior Gateway Protocol (EGP), and explain how ICMP can assist troubleshooting when packets cannot reach a remote network.',[
      'Define an AS as a group of IP networks/routers under a common administrative policy.',
      'IGPs operate inside an AS, for example OSPF or RIP.',
      'EGPs exchange reachability information between autonomous systems, with BGP as the dominant example.',
      'Explain that routers use routing information to select paths across and between networks.',
      'Explain that ICMP can report problems such as destination unreachable or TTL expiration and supports tools such as ping/traceroute.'
    ]),
    written(35,'Section C · Applied',6,'Compress the IPv6 address 2001:0db8:0000:00c0:0000:0000:0000:0050 into its shortest valid representation, and state the two main IPv6 zero-compression rules you used.',[
      'Correct compressed form: 2001:db8:0:c0::50.',
      'Remove leading zeroes inside each hextet.',
      'Replace one longest consecutive sequence of all-zero hextets with ::.',
      'Do not use :: more than once in a single IPv6 address.'
    ]),
    written(36,'Section C · Applied',10,'Compare symmetric-key and public-key cryptography in terms of keys, performance and common use. Then, for a 3 MHz channel with a linear S/N ratio of 15, calculate the Shannon theoretical maximum capacity in bit/s.',[
      'Symmetric cryptography uses a shared secret key for encryption/decryption and is usually computationally efficient for bulk data.',
      'Public-key cryptography uses public/private key pairs and is commonly used for authentication, signatures and key establishment.',
      'State Shannon: C = B log2(1 + S/N).',
      'Use B = 3,000,000 Hz and S/N = 15, so 1 + S/N = 16 and log2(16) = 4.',
      'Capacity = 3,000,000 × 4 = 12,000,000 bit/s (12 Mb/s theoretical maximum).'
    ]),
    written(37,'Section C · Applied',10,'A TCP sender transmits three consecutive payload segments. The first starts at sequence number 1000 and carries 500 bytes, the second carries 400 bytes, and the third carries 600 bytes. Assuming no SYN/FIN bytes and no loss, determine the starting sequence number of each segment and the cumulative ACK number after all three payloads are received.',[
      'Segment 1 sequence = 1000.',
      'Segment 2 sequence = 1000 + 500 = 1500.',
      'Segment 3 sequence = 1500 + 400 = 1900.',
      'Total payload = 500 + 400 + 600 = 1500 bytes.',
      'Next expected byte / cumulative ACK = 1000 + 1500 = 2500.'
    ]),
    written(38,'Section C · Applied',15,'A company receives IPv4 block 14.24.74.0/24. Using VLSM, allocate subnets for departments needing 60 hosts, 30 hosts and 12 hosts, in that order from the lowest available addresses. For each subnet give the prefix, subnet mask, network address, first usable address, last usable address and broadcast address.',[
      '60 hosts require /26 (64 total, 62 usable), mask 255.255.255.192. Network 14.24.74.0/26, usable 14.24.74.1–14.24.74.62, broadcast 14.24.74.63.',
      '30 hosts require /27 (32 total, 30 usable), mask 255.255.255.224. Network 14.24.74.64/27, usable 14.24.74.65–14.24.74.94, broadcast 14.24.74.95.',
      '12 hosts require /28 (16 total, 14 usable), mask 255.255.255.240. Network 14.24.74.96/28, usable 14.24.74.97–14.24.74.110, broadcast 14.24.74.111.',
      'Allocate largest subnets first to reduce fragmentation and ensure each block starts on a valid boundary.'
    ])
  ];

  function blankState(){
    return {version:1,title:TITLE,createdAt:Date.now(),endAt:Date.now()+DURATION*1000,current:0,answers:{},flags:{},finished:false};
  }

  function answered(q){
    const v=state?.answers?.[q.id];
    return q.kind==='mcq' ? v!==undefined && v!==null : Boolean(String(v||'').trim());
  }
  function answeredCount(){ return QUESTIONS.filter(answered).length; }
  function restoreChrome(){
    ['#practiceHero','#practiceStats','#practiceModuleTabs','#mockLibrary'].forEach(sel=>{ const el=$(sel); if(el) el.hidden=false; });
  }
  function hideChrome(){
    ['#practiceHero','#practiceStats','#practiceModuleTabs','#mockLibrary'].forEach(sel=>{ const el=$(sel); if(el) el.hidden=true; });
  }
  function stopTimer(){ if(timer){ clearInterval(timer); timer=0; } }

  function installCard(){
    const grid=document.querySelector('#practiceWorkbench .practice-actions-grid');
    const active=document.querySelector('#practiceModuleTabs .practice-tab.active small');
    if(!grid || !active || !/IE1030/i.test(active.textContent||'') || grid.querySelector('[data-dcn-2024-pattern]')) return;
    const saved=read();
    const card=document.createElement('article');
    card.className='card practice-action';
    card.dataset.dcn2024Pattern='1';
    card.innerHTML=`<span class="action-icon">24</span><div><div class="kicker">2024 exam pattern</div><h3>DCN 2024 Pattern Paper</h3><p class="muted">30 MCQs + 8 structured/applied questions, 2-hour timer and marking guidance. Original reconstruction; not a verbatim copy.</p></div><button class="btn primary" type="button" onclick="startDcn2024Pattern()">${saved&&!saved.finished?'Resume paper':'Start paper'}</button>`;
    grid.appendChild(card);
  }

  function render(){
    if(!state) return;
    hideChrome();
    const host=$('#practiceWorkbench');
    const q=QUESTIONS[state.current];
    if(!host || !q) return;
    host.innerHTML=`<div class="exam-app">
      <header class="exam-top"><div class="exam-brand"><img src="assets/finalforge-logo-256.webp" alt="FinalForge"><div><b>FinalForge Exam</b><span>IE1030 · ${esc(TITLE)}</span></div></div><div class="exam-save"><i></i> Autosaved</div><button class="btn" type="button" onclick="exitDcn2024Pattern()">Save & exit</button></header>
      <div class="exam-layout">
        <aside class="exam-rail"><div class="exam-clock-label">Time remaining</div><strong class="exam-clock" id="dcn24Clock">${fmtTime(Math.ceil((state.endAt-Date.now())/1000))}</strong><div class="exam-progress"><i style="width:${Math.round(answeredCount()/QUESTIONS.length*100)}%"></i></div><span>${answeredCount()} of ${QUESTIONS.length} answered</span><div class="exam-section-label">Question navigator</div><div class="exam-nav">${QUESTIONS.map((x,i)=>`<button type="button" class="${i===state.current?'current':''} ${answered(x)?'answered':''} ${state.flags[x.id]?'flagged':''}" onclick="goDcn2024Question(${i})" aria-label="Question ${i+1}">${i+1}</button>`).join('')}</div><div class="exam-legend"><span><i class="answered"></i>Answered</span><span><i class="flagged"></i>Review</span><span><i></i>Unanswered</span></div><button class="btn primary exam-submit" type="button" onclick="submitDcn2024Pattern()">Submit final attempt</button></aside>
        <main class="exam-question" id="dcn24Question">${questionHTML(q)}</main>
      </div>
    </div>`;
    bind(); updateTimer(); stopTimer(); timer=setInterval(updateTimer,1000); window.scrollTo({top:0,behavior:'smooth'});
  }

  function questionHTML(q){
    const n=state.current+1, value=state.answers[q.id];
    let input='';
    if(q.kind==='mcq'){
      input=`<div class="exam-options">${q.o.map((o,i)=>`<label class="${Number(value)===i?'selected':''}"><input type="radio" name="dcn24-answer" value="${i}" ${Number(value)===i?'checked':''}><span class="option-letter">${String.fromCharCode(65+i)}</span><span>${esc(o)}</span></label>`).join('')}</div>`;
    }else{
      input=`<label class="exam-answer-label" for="dcn24Written">Your answer</label><textarea id="dcn24Written" class="exam-written" spellcheck="true" placeholder="Structure your answer clearly…">${esc(value||'')}</textarea><span class="exam-local-note">Saved automatically on this device</span>`;
    }
    return `<div class="question-meta"><span>${esc(q.section)} · Question ${n} of ${QUESTIONS.length}</span><b>${q.marks} ${q.marks===1?'mark':'marks'}</b></div><h2>${esc(q.q)}</h2>${input}<div class="exam-question-actions"><button class="btn" type="button" onclick="goDcn2024Question(${n-2})" ${n===1?'disabled':''}>Previous</button><button class="btn flag ${state.flags[q.id]?'active':''}" type="button" onclick="toggleDcn2024Flag()">${state.flags[q.id]?'Marked for review':'Mark for review'}</button>${n<QUESTIONS.length?`<button class="btn primary" type="button" onclick="goDcn2024Question(${n})">Next</button>`:`<button class="btn primary" type="button" onclick="submitDcn2024Pattern()">Finish paper</button>`}</div>`;
  }

  function bind(){
    const q=QUESTIONS[state.current];
    document.querySelectorAll('input[name="dcn24-answer"]').forEach(input=>input.addEventListener('change',e=>{state.answers[q.id]=Number(e.target.value);save();render();}));
    const area=$('#dcn24Written'); if(area) area.addEventListener('input',e=>{state.answers[q.id]=e.target.value;save();});
  }

  function start(){
    const saved=read();
    if(saved && !saved.finished){ state=saved; }
    else { state=blankState(); save(); }
    render();
  }
  function go(index){
    if(!state) return;
    const area=$('#dcn24Written'), q=QUESTIONS[state.current]; if(area) state.answers[q.id]=area.value;
    state.current=Math.max(0,Math.min(QUESTIONS.length-1,Number(index)||0)); save(); render();
  }
  function toggleFlag(){ const q=QUESTIONS[state.current]; state.flags[q.id]=!state.flags[q.id]; save(); render(); }
  function exit(){ save(); stopTimer(); state=null; restoreChrome(); window.renderPractice?.(); setTimeout(installCard,0); }
  function updateTimer(){
    if(!state) return;
    const left=Math.ceil((state.endAt-Date.now())/1000), el=$('#dcn24Clock'); if(el) el.textContent=fmtTime(left);
    if(left<=0){ stopTimer(); finish(true); }
  }
  function submit(){
    const missing=QUESTIONS.length-answeredCount();
    if(!confirm(missing?`Submit with ${missing} unanswered question${missing===1?'':'s'}?`:'Submit your final attempt?')) return;
    finish(false);
  }
  function finish(auto){
    stopTimer();
    if(!state) return;
    let correct=0;
    const total=QUESTIONS.filter(q=>q.kind==='mcq').length;
    QUESTIONS.forEach(q=>{ if(q.kind==='mcq' && Number(state.answers[q.id])===q.a) correct++; });
    state.finished=true; state.finishedAt=Date.now(); clear(); renderResults(auto,correct,total);
  }
  function reviewHTML(q,i){
    const value=state.answers[q.id];
    if(q.kind==='mcq'){
      const ok=Number(value)===q.a;
      return `<article><div class="question-meta"><span>${i+1} · ${esc(q.section)}</span><b>${q.marks} marks</b></div><h3>${esc(q.q)}</h3><div class="review-answer ${ok?'correct':'incorrect'}"><b>${ok?'Correct':'Review this answer'}</b><span>Your answer: ${value===undefined?'Not answered':esc(q.o[value])}</span><span>Correct answer: ${esc(q.o[q.a])}</span><p>${esc(q.e)}</p></div></article>`;
    }
    return `<article><div class="question-meta"><span>${i+1} · ${esc(q.section)}</span><b>${q.marks} marks</b></div><h3>${esc(q.q)}</h3><div class="review-answer written"><b>Self-mark guide</b><span>Your response was saved for this attempt.</span><ul>${q.p.map(p=>`<li>${esc(p)}</li>`).join('')}</ul></div></article>`;
  }
  function renderResults(auto,correct,total){
    const host=$('#practiceWorkbench'); if(!host) return;
    host.innerHTML=`<div class="exam-results"><div class="result-hero"><img src="assets/finalforge-logo-256.webp" alt=""><div><div class="kicker">${auto?'Time finished':'Attempt submitted'}</div><h2>${esc(TITLE)}</h2><p>${answeredCount()} of ${QUESTIONS.length} questions answered · ${correct} of ${total} MCQs correct.</p></div><strong>${Math.round(correct/total*100)}%</strong></div><div class="notice"><strong>2024-pattern reconstruction</strong><div class="muted">This FinalForge paper follows the publicly described 2024 IE1030 topic/format pattern but does not copy the original wording verbatim.</div></div><div class="result-review">${QUESTIONS.map((q,i)=>reviewHTML(q,i)).join('')}</div><div class="exam-result-actions"><button class="btn primary" type="button" onclick="closeDcn2024Results()">Back to practice center</button><button class="btn" type="button" onclick="restartDcn2024Pattern()">Try again</button></div></div>`;
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function closeResults(){ state=null; restoreChrome(); window.renderPractice?.(); setTimeout(installCard,0); }
  function restart(){ clear(); state=blankState(); save(); render(); }

  const observer=new MutationObserver(()=>installCard());
  function boot(){
    const host=$('#practiceWorkbench'); if(host) observer.observe(host,{childList:true,subtree:true});
    document.addEventListener('click',e=>{ if(e.target.closest?.('#practiceModuleTabs')) setTimeout(installCard,0); });
    installCard();
  }

  Object.assign(window,{
    startDcn2024Pattern:start,
    goDcn2024Question:go,
    toggleDcn2024Flag:toggleFlag,
    exitDcn2024Pattern:exit,
    submitDcn2024Pattern:submit,
    closeDcn2024Results:closeResults,
    restartDcn2024Pattern:restart
  });

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
  window.addEventListener('finalforge-ready',()=>setTimeout(boot,0),{once:true});
})();
