/* FinalForge IP Challenge Extension v2 — additional source-aligned exam papers. */
(()=>{
  'use strict';
  if(window.FINALFORGE_IP_CHALLENGE_V2)return;
  window.FINALFORGE_IP_CHALLENGE_V2=Object.freeze({version:'2.0.0',scope:'arrays-2d-methods'});

  const mcq=[
    {q:'Parallel arrays customer[], type[] and amount[] contain 6 records. Which loop header processes every record?',o:['for(int i=1;i<=6;i++)','for(int i=0;i<6;i++)','for(int i=0;i<=6;i++)','for(int i=1;i<6;i++)'],a:1,e:'Java arrays start at index 0 and the last valid index is length - 1.'},
    {q:'Which value is the safest initial maximum when all valid transaction amounts are guaranteed to be positive?',o:['-1','Double.MAX_VALUE','amount.length','1000000'],a:0,e:'A small sentinel such as -1 is below every valid positive amount, so the first matching record can replace it.'},
    {q:'Which pair should be updated together when a new category maximum is found?',o:['Only the index','Only the name','Maximum value and the related name','Every array element'],a:2,e:'The maximum value and the record identity must stay synchronized.'},
    {q:'What is the main purpose of using the same index across name[], id[], type[] and amount[]?',o:['To sort the arrays automatically','To represent one logical record','To make arrays two-dimensional','To avoid loops'],a:1,e:'The same index identifies all fields belonging to one record.'},
    {q:"Which condition accepts transaction type P or p?",o:["type[i]=='P'&&type[i]=='p'","type[i]=='P'||type[i]=='p'","type[i]='P'","type[i]!='P'"],a:1,e:'Uppercase and lowercase alternatives are accepted with OR.'},
    {q:'Why is Double.MAX_VALUE useful for a category minimum?',o:['It is guaranteed to be smaller than all values','The first real matching value will normally replace it','It converts double to int','It closes the Scanner'],a:1,e:'A very large sentinel lets the first valid matching amount become the minimum.'},
    {q:'A category has no matching records. What additional idea prevents printing the untouched minimum sentinel?',o:['A boolean or count that confirms a match occurred','Use nested loops','Make the array larger','Change the method to void'],a:0,e:'Track whether the category was found before displaying a minimum or related name.'},
    {q:'To calculate an average Purchase amount safely, what should happen before division?',o:['Check purchaseCount > 0','Set purchaseCount to 0 again','Convert every amount to int','Close Scanner'],a:0,e:'Division should occur only when at least one Purchase record exists.'},
    {q:'Which expression calculates the average of matching amounts?',o:['count / total','total / count','total * count','count - total'],a:1,e:'Average is total divided by the number of matching records.'},
    {q:'Marks must be between 0 and 100 inclusive. Which condition identifies an invalid mark?',o:['mark < 0 || mark > 100','mark >= 0 && mark <= 100','mark == 50','mark > 0 || mark < 100'],a:0,e:'Values below the lower limit or above the upper limit are invalid.'},
    {q:'A 4 x 5 matrix contains how many cells?',o:['9','16','20','25'],a:2,e:'Rows multiplied by columns gives 4 × 5 = 20 cells.'},
    {q:'For char[][] status = new char[4][5], which is the correct inner-loop condition?',o:['j < 4','j <= 5','j < 5','j <= 4'],a:2,e:'The column dimension has length 5, so valid column indexes are 0 to 4.'},
    {q:'Which structure is required to input every element of a 2D array?',o:['One if statement','Two nested loops','One switch only','A returned method only'],a:1,e:'One loop controls rows and another controls columns.'},
    {q:'You need the count of a selected status in each row. When should rowCount be reset?',o:['Once before all rows','At the start of each row','After the whole program','Never'],a:1,e:'Each row needs its own counter beginning from zero.'},
    {q:'To find the row with the most selected statuses, what values should be tracked?',o:['Only the search character','maxRowCount and maxRow index','Only the number of columns','Scanner and String'],a:1,e:'Compare each row count with the best count seen so far and remember the row index.'},
    {q:'Which expression compares matrix characters without case sensitivity?',o:['Character.toUpperCase(grid[i][j])==Character.toUpperCase(search)','grid[i][j].equals(search)','grid[i][j]=search','grid[i][j]!=search'],a:0,e:'Convert both char values to the same case before comparison.'},
    {q:'A search prints every matching [row,column]. What should happen after printing one match?',o:['count++','count=0','break the outer loop','j=0'],a:0,e:'Each printed matching location contributes one to the total.'},
    {q:'How can a row with no Available seats be detected using first-year Java?',o:['Count A/a values in the row and test whether the count is zero','Use recursion','Create another class','Sort the matrix'],a:0,e:'A simple row counter is enough to detect zero available seats.'},
    {q:'A method declared public static double calcFee(...) should usually be called how when its result is needed later?',o:['double fee = calcFee(...);','void fee = calcFee(...);','System.out = calcFee(...);','return calcFee;'],a:0,e:'Store the returned double in a compatible variable.'},
    {q:'A method declared public static void displayReward(double fee) is intended to do what?',o:['Return a double','Display information without returning a value','Create an array automatically','Read every input'],a:1,e:'void means the method performs an action and sends no value back.'},
    {q:'Which main() order best matches the practice-pack method pattern?',o:['Call methods before input','Read input, validate, call returned method, display result, call void method','Return immediately','Only declare arrays'],a:1,e:'Input and validation happen before calculation and display method calls.'},
    {q:'A valid service type is 1 or 2. Which condition rejects other values?',o:['type < 1 || type > 2','type == 1 || type == 2','type >= 1 && type <= 2','type != 1 && type == 2'],a:0,e:'Anything below 1 or above 2 is outside the allowed range.'},
    {q:'A charge includes 2 hours and charges extra only above 2. Which condition starts the extra charge?',o:['hours >= 2','hours > 2','hours < 2','hours == 0'],a:1,e:'Exactly 2 hours is still inside the included amount.'},
    {q:'Why should reward thresholds such as >= 6500, >= 4500, >= 2500 be checked from highest to lowest?',o:['So larger values are not captured by a lower threshold first','Java requires descending numbers','It avoids using else','It converts double to char'],a:0,e:'Descending checks preserve the intended reward categories.'},
    {q:'A discount percentage is 8. Which formula correctly calculates the discount amount from total?',o:['total * 8 / 100.0','total / 8 * 100','total + 8','8 / total'],a:0,e:'Percentage amount equals total × percentage ÷ 100.'},
    {q:'If a returned method has several if/else branches, what must be true for normal valid inputs?',o:['Every valid path eventually returns the declared type','Only the first branch returns','No branch may use return','All branches must print Scanner'],a:0,e:'A non-void method must produce a compatible return value for every valid execution path.'},
    {q:'Which statement best describes validation with a while loop?',o:['Repeat input while the value is invalid','Run exactly once regardless of input','Skip input completely','Convert a 1D array to 2D'],a:0,e:'A validation loop keeps asking until the value satisfies the allowed condition.'},
    {q:'What is the simplest way to list records whose amount is above the overall average after the average is known?',o:['Run another loop and test amount[i] > average','Resize every array','Use nested loops over the same 1D arrays','Set average to zero'],a:0,e:'A second pass keeps the logic simple and preserves the original records.'},
    {q:'A 3 x 5 matrix search needs the column with the most matches. Which approach is suitable?',o:['Maintain a count for each column and compare counts','Only inspect row 0','Sort characters alphabetically','Use one scalar that resets every cell'],a:0,e:'Per-column counts allow the program to identify the column with the greatest number of matches.'},
    {q:'Which Scanner expression reads the first character of the next token?',o:['input.next().charAt(0)','input.nextInt().charAt(0)','input.charAt(0)','input.nextDouble()'],a:0,e:'next() returns a String and charAt(0) takes its first character.'},
    {q:'Why is one input loop followed by one processing loop often recommended for parallel arrays?',o:['It separates data collection from calculations','It is the only legal Java syntax','It eliminates indexes','It prevents Scanner from reading strings'],a:0,e:'Separating responsibilities makes totals, counts and max/min logic easier to reason about.'},
    {q:'Which value indicates a complete scan of a 3 x 4 matrix?',o:['3 cell visits','4 cell visits','7 cell visits','12 cell visits'],a:3,e:'3 rows × 4 columns = 12 positions.'},
    {q:'If the first matching category amount is 450.0 and min starts at Double.MAX_VALUE, what happens?',o:['min becomes 450.0','min stays Double.MAX_VALUE','min becomes 0','The loop stops automatically'],a:0,e:'450.0 is smaller than the sentinel, so the minimum updates.'}
  ];

  const code=[
    {q:'Challenge Coding C1 — Student Printing Wallet. Store 8 transactions with parallel arrays: student name, transaction number, type and amount. Type is Reload (R/r) or Print (P/p). Validate amount > 0. Display totals and counts for both types, highest Reload, lowest Print, average Print amount, and every student whose Print amount is above the Print average.',a:'Use four parallel arrays. Validate during input. Process totals/counts/max/min in a second loop, calculate the Print average only when its count is greater than zero, then run a final loop to list Print records above that average.',e:'This combines the pack’s parallel-array totals/counts/max/min pattern with one safe average and a second-pass filter.'},
    {q:'Challenge Coding C2 — Campus Event Tickets. Store 7 ticket sales using name, ticket ID, category and amount arrays. Category is Student (S/s) or Guest (G/g). Validate amount > 0. Display category totals/counts, highest Guest sale, lowest Student sale, overall average amount and all sales above the overall average.',a:'Use same-index parallel arrays. Keep Student/Guest max/min logic inside the correct branches. Calculate overall total and divide by the fixed record count, then scan again for values above average.',e:'A harder but still first-year parallel-array question.'},
    {q:'Challenge Coding C3 — Assignment and Practical Marks. Store 8 records using student name, registration number, assessment type and mark arrays. Type is Assignment (A/a) or Practical (P/p). Validate 0–100. Display totals/counts, highest Assignment, lowest Practical, average for each type when available, and the number of marks at least 50.',a:'Use a validation loop for marks, separate A/P branches for totals/counts/max/min, then calculate each category average only when its count is not zero.',e:'This remains within the practice-pack patterns of parallel arrays, validation and category statistics.'},
    {q:'Challenge Coding C4 — Pharmacy Daily Audit. Store 6 sales using medicine name, code, category and amount arrays. Category is Prescription (P/p) or OTC (O/o). Validate positive amounts. Display totals/counts, maximum Prescription, minimum OTC, the larger category total and all records below the overall average sale.',a:'Input with validation, calculate category and overall totals in the processing loop, compare category totals, calculate overall average and use another loop for below-average records.',e:'Extends the pharmacy mock without introducing advanced Java.'},
    {q:'Challenge Coding C5 — Computer Lab Status Grid. Use a 4 x 5 char matrix with W (Working), F (Fault) and M (Maintenance). Validate every entered status. Display the grid, search a selected status case-insensitively, print all [row,column] positions and the total, then display the row and column containing the most matches.',a:'Use nested loops for validated input and display. For the search, maintain overall count plus row counts and column counts; compare them to identify the maximum row and column.',e:'This is a direct extension of the matrix search pattern using row/column counting.'},
    {q:'Challenge Coding C6 — Attendance Analysis Grid. Use a 4 x 4 matrix containing P, A or L. Validate input, display the grid, then search one selected status. Print every coordinate, overall count, the count in each row and the first row whose selected-status count is zero.',a:'Use nested loops. Reset rowCount at the start of each row, increment overall and row counts for matches, and remember the first row with rowCount == 0.',e:'Focuses on nested loops, case-insensitive char comparison and row-level logic.'},
    {q:'Challenge Coding C7 — Learning Center Fee Methods. Write double calculateFee(int plan, double hours): plan 1 includes 2 hours for Rs. 800 then Rs. 250 per extra hour; plan 2 includes 3 hours for Rs. 1200 then Rs. 300 per extra hour. Write void displayBenefit(double fee): >= 2200 “Premium Support”, >= 1500 “Revision Pack”, otherwise “Standard Access”. In main(), validate plan 1–2 and hours > 0, call both methods and display the fee.',a:'Validate in main. The returned method selects included hours, base fee and extra rate by plan, adds extra cost only when hours exceeds the included amount, and returns the result. The void method checks reward thresholds from highest to lowest.',e:'Matches the practice pack’s returned calculation method plus void display method structure.'},
    {q:'Challenge Coding C8 — Evening Study Cafe Methods. Write double calculateFinalBill(int time, double total): from 18–20 give 8% for total >= 6000 and 5% for total >= 3000; from 21–23 give 12% and 7% respectively. Write void displayReward(double bill): >= 7000 Free Dessert, >= 5000 Free Drink, >= 3000 Free Snack, otherwise No Reward. Reject time outside 18–23 and total <= 0.',a:'Validate main inputs, determine percentage from time band and total threshold, calculate finalBill = total - total * rate / 100.0, return it, then call the void reward method.',e:'A challenge version of the exact restaurant-discount method pattern in the supplied practice pack.'}
  ];

  const bank=window.EXAMHUB_PRACTICE;
  if(!bank?.ip)return;

  const unique=(base,extra)=>{
    const seen=new Set((base||[]).map(x=>String(x?.q||'').trim()));
    return [...(base||[]),...extra.filter(x=>!seen.has(String(x?.q||'').trim()))];
  };
  bank.ip.mcq=unique(bank.ip.mcq,mcq);
  bank.ip.code=unique(bank.ip.code,code);
  window.FINALFORGE_IP_CHALLENGE_BANK=Object.freeze({mcq,code});

  const baseStart=window.startPracticeExam;
  const baseRender=window.renderPractice;
  const baseSetMod=window.setPracticeMod;
  let decorateQueued=false;

  function isIp(){
    const active=document.querySelector('#practiceModuleTabs .practice-tab.active span');
    const label=String(active?.textContent||'').trim().toUpperCase();
    const expected=String(window.FINALFORGE_DATA?.modules?.ip?.short||'IP').trim().toUpperCase();
    return label===expected;
  }

  function patchTitle(variant,beforeId){
    try{
      const key='finalforge_exam_v4_active';
      const saved=JSON.parse(localStorage.getItem(key)||'null');
      if(!saved||saved.id===beforeId||saved.module!=='ip')return;
      saved.mode='challenge';
      saved.variant=variant;
      saved.title=`IP Challenge Paper ${variant}`;
      localStorage.setItem(key,JSON.stringify(saved));
      const label=document.querySelector('.exam-brand span');
      if(label)label.textContent=`${window.FINALFORGE_DATA?.modules?.ip?.code||'IT1120'} · ${saved.title}`;
    }catch{}
  }

  window.startPracticeExam=function(mode='mock',variant=1){
    if(mode!=='challenge')return baseStart?.(mode,variant);
    if(!isIp())return baseStart?.('generated',variant);
    const key='finalforge_exam_v4_active';
    let beforeId='';
    try{beforeId=JSON.parse(localStorage.getItem(key)||'null')?.id||''}catch{}
    const originalMcq=bank.ip.mcq;
    const originalCode=bank.ip.code;
    const start=((Math.max(1,Number(variant)||1)-1)*2)%code.length;
    bank.ip.mcq=mcq;
    bank.ip.code=[code[start],code[(start+1)%code.length]];
    try{
      const result=baseStart?.('generated',variant);
      patchTitle(variant,beforeId);
      return result;
    }finally{
      bank.ip.mcq=originalMcq;
      bank.ip.code=originalCode;
    }
  };

  function decorate(){
    decorateQueued=false;
    const work=document.querySelector('#practiceWorkbench');
    if(!work||!isIp())return;
    if(document.querySelector('#ffIpChallengeShelf'))return;
    const anchor=document.querySelector('.ff-ip-paper-shelf')||document.querySelector('.practice-actions-grid');
    if(!anchor)return;
    const shelf=document.createElement('section');
    shelf.id='ffIpChallengeShelf';
    shelf.className='ff-ip-challenge-shelf';
    shelf.innerHTML=`
      <div class="ff-ip-challenge-head"><div><span>IP CHALLENGE SERIES</span><h3>Harder exam reasoning, same first-year syllabus</h3><p>28 additional MCQs + 8 source-aligned Java programs focused only on parallel arrays, 2D arrays, methods and validation.</p></div><strong>4 papers</strong></div>
      <div class="ff-ip-challenge-grid">
        ${[1,2,3,4].map(n=>`<article><div><span>Challenge ${String(n).padStart(2,'0')}</span><b>25 MCQ + 2 Java programs</b><small>Fresh selection · 2-hour timer · autosave</small></div><button class="btn primary" type="button" onclick="startPracticeExam('challenge',${n})">Start challenge</button></article>`).join('')}
      </div>`;
    anchor.insertAdjacentElement('afterend',shelf);
  }

  function scheduleDecorate(){
    if(decorateQueued)return;
    decorateQueued=true;
    requestAnimationFrame(()=>requestAnimationFrame(decorate));
  }

  if(typeof baseSetMod==='function')window.setPracticeMod=function(mod){const result=baseSetMod(mod);scheduleDecorate();return result};
  if(typeof baseRender==='function')window.renderPractice=function(...args){const result=baseRender(...args);scheduleDecorate();return result};
  addEventListener('finalforge-after-navigate',event=>{if(event?.detail?.id==='practice')scheduleDecorate()});
  scheduleDecorate();
})();