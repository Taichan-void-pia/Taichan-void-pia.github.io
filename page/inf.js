// inf.js
(function(){
  if (!window._commonLoaded) { console.error('common.js must be loaded first'); return; }

  const BigNum = window.BigNum;
  const INF_TARGET = window.INF_TARGET;

  // basic state hooks
  window.generatorPoints = window.generatorPoints || 0;
  window.generators = window.generators || new Array(10).fill(0).map(()=>({count:0,progress:0}));
  window.minesCount = window.minesCount || 0;
  window.minesUnlocked = window.minesUnlocked || false;
  window.goldenParticles = window.goldenParticles || 0;
  window.infinityPoints = window.infinityPoints || BigNum.zero();
  window.infinityChallenges = window.infinityChallenges || [];

  // default challenge list if absent (simple fallback)
  if (!Array.isArray(window.infinityChallenges) || window.infinityChallenges.length === 0){
    window.infinityChallenges = [
      { id:'C1', name:'厳格な節約', desc:'開始時に収入がリセット。報酬: final income ×1.20', reqIP:0, active:false, completed:false, reward:{type:'finalMult', value:1.20} },
      { id:'C2', name:'発電制限', desc:'開始時にアップグレード効果が -30%。報酬: ジェネ効率 +10%', reqIP:0, active:false, completed:false, reward:{type:'genEffAdd', value:0.10} },
    ];
  }

  // render Infinity shop UI (called by gen.js too)
  function renderInfinityShop(){
    const shop = document.getElementById('infinityShop');
    if (!shop) return;
    shop.innerHTML = '';

    const ipCard = document.createElement('div'); ipCard.className='card';
    ipCard.innerHTML = `<div><strong>無限ポイント(IP): ${window.infinityPoints.toString()}</strong></div><div class="small">GP: ${window.generatorPoints.toFixed(4)}　 GDP: ${window.goldenParticles.toFixed(3)}</div>`;
    shop.appendChild(ipCard);

    // Generators
    const genContainer = document.createElement('div'); genContainer.className='card col';
    genContainer.innerHTML = `<div><strong>Generators (G1〜G10) — IPで購入</strong></div><div class="small">G1はGPを生成。G2..G10は下位ジェネレーターを増やします。</div>`;
    const genBaseCost = [1,3,10,30,100,300,1000,3000,10000,30000];
    const genCostScale = window.genCostScale || 2.2;
    for (let t=0;t<10;t++){
      const g = window.generators[t];
      const base = genBaseCost[t];
      const nextCost = Math.ceil(base * Math.pow(genCostScale, (g.count||0)));
      const line = document.createElement('div'); line.style.display='flex'; line.style.gap='8px'; line.style.alignItems='center';
      line.innerHTML = `<div style="flex:1"><strong>G${t+1}</strong> — 所持: <span id="gcount${t}">${g.count}</span></div><div class="small">次: ${nextCost} IP</div>`;
      const buyBtn = document.createElement('button'); buyBtn.className='btn btn-small'; buyBtn.textContent='Buy ×1';
      buyBtn.addEventListener('click', ()=> buyGenerator(t,1));
      const buy5 = document.createElement('button'); buy5.className='btn btn-small'; buy5.textContent='Buy ×5';
      buy5.addEventListener('click', ()=> buyGenerator(t,5));
      line.appendChild(buyBtn); line.appendChild(buy5);
      genContainer.appendChild(line);
    }
    shop.appendChild(genContainer);

    // Mines
    const mineCard = document.createElement('div'); mineCard.className='card';
    mineCard.innerHTML = `<div><strong>Mines</strong> — 所持: <span id="mineCount">${window.minesCount}</span></div>
      <div class="small">${window.minesUnlocked ? 'Mine はジェネレーター効率を +5%（累積）します。GDPを生成します。' : 'Mines は Skill 50 を購入すると解放されます（ここはロック中）。'}</div>
      <div class="small">次のコスト: <span id="mineNextCost">${Math.ceil(5 * Math.pow(2.0, window.minesCount))}</span> IP</div>
      <div style="margin-top:6px"><button id="buyMine1" class="btn btn-small" ${window.minesUnlocked ? '' : 'disabled'}>Buy ×1</button> <button id="buyMine5" class="btn btn-small" ${window.minesUnlocked ? '' : 'disabled'}>Buy ×5</button></div>`;
    shop.appendChild(mineCard);
    setTimeout(()=>{
      const b1 = document.getElementById('buyMine1');
      const b5 = document.getElementById('buyMine5');
      if (b1) b1.addEventListener('click', ()=> buyMine(1));
      if (b5) b5.addEventListener('click', ()=> buyMine(5));
    },0);

    // Skill area (delegated to gen.js? but implement here)
    // If gen.js rendered skill area, this will not duplicate because gen.js called renderPrestigeShop only
    // Let's create skill area here as well if needed
    // ... omitted for brevity (we can move skill UI here later)

    // Challenges
    const chCard = document.createElement('div'); chCard.className='card col';
    chCard.innerHTML = `<div><strong>Infinity チャレンジ</strong></div><div class="small">完了数による IP 倍率: 1個→2倍 ... 9個→18倍</div>`;
    (window.infinityChallenges || []).forEach(c => {
      const line = document.createElement('div');
      line.style.display='flex'; line.style.gap='8px'; line.style.alignItems='center'; line.style.marginTop='6px';
      line.innerHTML = `<div style="flex:1"><strong>${c.name}</strong> — ${c.desc}</div><div class="small">Req IP: ${c.reqIP}</div>`;
      const btnStart = document.createElement('button'); btnStart.className='btn btn-small'; btnStart.textContent = c.active ? '停止' : '開始';
      btnStart.addEventListener('click', ()=> { if (c.active) stopChallenge(c.id); else startChallenge(c.id); });
      const btnComp = document.createElement('button'); btnComp.className='btn btn-small'; btnComp.textContent = c.completed ? '達成済' : '達成';
      btnComp.disabled = c.completed;
      btnComp.addEventListener('click', ()=> completeChallenge(c.id));
      line.appendChild(btnStart); line.appendChild(btnComp);
      chCard.appendChild(line);
    });
    shop.appendChild(chCard);
  }

  // Consumer functions (buying generators, mines)
  function genCostForPurchase(tier, qty){
    const genBaseCost = [1,3,10,30,100,300,1000,3000,10000,30000];
    const genCostScale = window.genCostScale || 2.2;
    let total = 0;
    let cur = window.generators[tier].count || 0;
    for (let k=0;k<qty;k++){
      total += Math.ceil(genBaseCost[tier] * Math.pow(genCostScale, cur + k));
    }
    return total;
  }
  function buyGenerator(tier, qty){
    qty = Number(qty) || 1;
    if (qty <= 0) return;
    const cost = genCostForPurchase(tier, qty);
    if (!window.infinityPoints.gteNumber(cost)){ alert('IPが足りません'); return; }
    window.infinityPoints.subInPlace(BigNum.fromNumber(cost));
    window.generators[tier].count += qty;
    saveGame();
    renderInfinityShop();
    alert(`G${tier+1} を ${qty} 個購入しました（IP -${cost}）`);
  }

  function mineCost(qty){
    let total = 0; let cur = window.minesCount;
    for (let i=0;i<qty;i++){ total += Math.ceil(5 * Math.pow(2.0, cur + i)); }
    return total;
  }
  function buyMine(qty){
    if (!window.minesUnlocked){ alert('Mines はまだ解放されていません（Skill 50）'); return; }
    qty = Number(qty) || 1;
    if (qty <= 0) return;
    const cost = mineCost(qty);
    if (!window.infinityPoints.gteNumber(cost)){ alert('IPが足りません'); return; }
    window.infinityPoints.subInPlace(BigNum.fromNumber(cost));
    window.minesCount += qty;
    saveGame();
    renderInfinityShop();
    alert(`Mine を ${qty} 個購入しました（IP -${cost}）`);
  }

  // Mines generate GDP passively (we just update goldenParticles in simulate step from gen.js)
  // We'll add a small interval to ensure goldenParticles updates (if simulate in gen.js doesn't)
  setInterval(()=> {
    if (window.minesUnlocked && window.minesCount > 0){
      const gdpPerMinePerSec = 0.05;
      window.goldenParticles += window.minesCount * gdpPerMinePerSec * 1.0;
      // no heavy saving
    }
  }, 1000);

  // Challenges handling (simple wrappers)
  function startChallenge(id){
    if (window.infinityChallenges.some(c=>c.active)) { alert('既にチャレンジがアクティブです。まずは解除してください。'); return; }
    const c = window.infinityChallenges.find(x=>x.id===id);
    if (!c) return;
    if (!window.infinityPoints.gteNumber(c.reqIP)){ alert('必要なIPがありません'); return; }
    if (!confirm(`${c.name} を開始しますか？`)) return;
    c.active = true;
    // reset generation
    window.money = BigNum.zero();
    window.baseIncome = BigNum.fromNumber(1);
    window.upgrades = JSON.parse(JSON.stringify(window.upgradesTemplate)).map(u=>{ u.level=0; u.progress=0; u._rateBN=BigNum.fromNumber(u.rate||u.baseRate||1); u._multBN=BigNum.fromNumber(0); u._baseCostBN=BigNum.fromNumber(u.baseCost||1); u.ascendCount=0; u.purchasePenalty=0; u.prestigeLevel={mult:0,rate:0,cost:0}; return u;});
    window.saveGame();
    renderInfinityShop();
    alert('チャレンジ開始: ' + c.name);
  }
  function stopChallenge(id){
    const c = window.infinityChallenges.find(x=>x.id===id);
    if (!c || !c.active) return;
    if (!confirm(`${c.name} を終了しますか？`)) return;
    c.active = false;
    window.saveGame();
    renderInfinityShop();
    alert('チャレンジを解除しました: ' + c.name);
  }
  function completeChallenge(id){
    const c = window.infinityChallenges.find(x=>x.id===id);
    if (!c) return;
    if (c.completed){ alert('既に達成済み'); return; }
    if (!confirm(`${c.name} を完了としてマークしますか？（恒久）`)) return;
    c.completed = true;
    // if all completed -> unlock infinity break
    const total = window.infinityChallenges.filter(x=>x.completed).length;
    if (total >= window.infinityChallenges.length){
      window.infinityBreakUnlocked = true;
      alert('全チャレンジ達成！ Infinity Break を解放しました。');
    }
    window.saveGame();
    renderInfinityShop();
  }

  // save/load (simple)
  function saveGame(){
    try {
      const save = {
        infinityPoints: window.infinityPoints.toObject(),
        generators: window.generators,
        generatorPoints: window.generatorPoints,
        minesCount: window.minesCount,
        goldenParticles: window.goldenParticles,
        infinityChallenges: window.infinityChallenges,
        minesUnlocked: window.minesUnlocked,
        infinityBreakUnlocked: window.infinityBreakUnlocked || false
      };
      localStorage.setItem('idle_inf_save_v1', JSON.stringify(save));
      // still call common save if exists
      if (typeof window.saveGame === 'function') window.saveGame();
    } catch(e){ console.warn('inf save failed', e); }
  }
  window.saveGame = saveGame;

  function loadGame(){
    try {
      const raw = localStorage.getItem('idle_inf_save_v1');
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.infinityPoints) window.infinityPoints = BigNum.fromObject(data.infinityPoints);
      if (Array.isArray(data.generators)) window.generators = data.generators;
      if (typeof data.generatorPoints === 'number') window.generatorPoints = data.generatorPoints;
      if (typeof data.minesCount === 'number') window.minesCount = data.minesCount;
      if (typeof data.goldenParticles === 'number') window.goldenParticles = data.goldenParticles;
      if (Array.isArray(data.infinityChallenges)) window.infinityChallenges = data.infinityChallenges;
      if (typeof data.minesUnlocked === 'boolean') window.minesUnlocked = data.minesUnlocked;
      if (typeof data.infinityBreakUnlocked === 'boolean') window.infinityBreakUnlocked = data.infinityBreakUnlocked;
    } catch(e){ console.warn('inf load failed', e); }
  }
  window.loadGameInf = loadGame;

  // Tab wiring (move Generation/Infinity toggles)
  const tabGen = document.getElementById('tabGen');
  const tabInf = document.getElementById('tabInf');
  const upgradeEl = document.getElementById('upgradeContainer');
  const prestigeEl = document.getElementById('prestigeShop');
  const infinityEl = document.getElementById('infinityShop');
  function showTab(t){
    if (t === 'gen'){
      tabGen.classList.add('active'); tabInf.classList.remove('active');
      upgradeEl.style.display = ''; prestigeEl.style.display = ''; infinityEl.style.display = 'none';
    } else {
      tabGen.classList.remove('active'); tabInf.classList.add('active');
      upgradeEl.style.display = 'none'; prestigeEl.style.display = 'none'; infinityEl.style.display = '';
    }
  }
  tabGen.addEventListener('click', ()=> showTab('gen'));
  tabInf.addEventListener('click', ()=> showTab('inf'));

  // initial render
  loadGame();
  renderInfinityShop();

  // update Infinity shop every ~500ms (keeps IP/GDP counts fresh)
  setInterval(()=>{ renderInfinityShop(); }, 700);

})();