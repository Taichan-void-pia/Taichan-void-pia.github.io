// gen.js
(function(){
  if (!window._commonLoaded) { console.error('common.js must be loaded first'); return; }

  const BigNum = window.BigNum;
  const INF_TARGET = window.INF_TARGET;

  // local short-hands to global state
  let money = window.money;
  let baseIncome = window.baseIncome;
  let upgrades = window.upgrades;
  let upgradeUI = []; // element refs
  let displayMoneyNum = window.displayMoneyNum;

  // UI init for generation (creates upgrade cards and wires events)
  function initUI(){
    const container = document.getElementById('upgradeContainer');
    container.innerHTML = '';
    upgradeUI = [];
    upgrades.forEach((u,i)=>{
      const div = document.createElement('div'); div.className = 'upgrade';
      const rateStr = (u._rateBN && u._rateBN.toNumberSafe && isFinite(u._rateBN.toNumberSafe())) ? u._rateBN.toNumberSafe().toFixed(2) : u._rateBN.toString();
      div.innerHTML = `
        <div style="display:flex;justify-content:space-between"><strong>${i+1}. ${u.name}</strong><div class="small">Lv <span id="lvl${i}">0</span>/<span id="cap${i}">100</span></div></div>
        <div class="small">昇天回数: <span id="asc${i}">0</span></div>
        <div class="small">永続 Lv(m/r/c): <span id="pLv${i}">0</span>/<span id="pLvR${i}">0</span>/<span id="pLvC${i}">0</span></div>
        <div class="small">乗数合計: <span id="mult${i}">+0.000</span></div>
        <div class="small">メーター速度: <span id="rate${i}">${rateStr}</span>/s</div>
        <div class="meter"><div id="fill${i}" class="fill" style="transform:scaleX(0)"></div></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center">
          <button id="buy1_${i}" class="btn btn-primary">購入（<span id="cost${i}">0</span>）</button>
          <button id="buy10_${i}" class="btn btn-small">×10</button>
          <button id="buy100_${i}" class="btn btn-small">×100</button>
          <button id="buyMax_${i}" class="btn btn-small">×Max</button>
          <button id="asc_${i}" class="btn btn-small invisible">昇天</button>
        </div>
      `;
      container.appendChild(div);
      upgradeUI[i] = {
        fillEl: document.getElementById('fill'+i),
        lvlEl: document.getElementById('lvl'+i),
        capEl: document.getElementById('cap'+i),
        costEl: document.getElementById('cost'+i),
        multEl: document.getElementById('mult'+i),
        rateEl: document.getElementById('rate'+i),
        ascEl: document.getElementById('asc'+i),
        pLvEl: document.getElementById('pLv'+i),
        pLvREl: document.getElementById('pLvR'+i),
        pLvCEl: document.getElementById('pLvC'+i),
        btn1: document.getElementById('buy1_'+i),
        btn10: document.getElementById('buy10_'+i),
        btn100: document.getElementById('buy100_'+i),
        btnMax: document.getElementById('buyMax_'+i),
        btnAsc: document.getElementById('asc_'+i),
      };
      upgradeUI[i].btn1.addEventListener('click', ()=> buyUpgrade(i,1,false));
      upgradeUI[i].btn10.addEventListener('click', ()=> buyUpgrade(i,10,false));
      upgradeUI[i].btn100.addEventListener('click', ()=> buyUpgrade(i,100,false));
      upgradeUI[i].btnMax.addEventListener('click', ()=> buyUpgrade(i,'max',false));
      upgradeUI[i].btnAsc.addEventListener('click', ()=> tryAscend(i));
    });

    // ensure progress arrays sized
    window.prevProgress = new Array(upgrades.length).fill(0);
    window.currProgress = new Array(upgrades.length).fill(0);
    for (let i=0;i<upgrades.length;i++){ window.prevProgress[i] = upgrades[i].progress || 0; window.currProgress[i] = upgrades[i].progress || 0; }

    renderPrestigeShop();
  }

  // helper functions (using window functions)
  function getMultiplierIncrementBig(u){
    const base = 0.005 * Math.pow(1 + u.level, 0.38);
    const genFactor = 1 + ((window.__genEffBaseFromSkills || 1) - 1) + (window.generatorPoints || 0) * 0.1;
    return BigNum.fromNumber(Math.min(base * genFactor, 1e12));
  }

  function costToBuyBig(u, n){
    if (n <= 0) return BigNum.zero();
    const remaining = Math.max(0, window.getLevelCap(u) - u.level);
    const want = Math.min(n, remaining);
    let total = BigNum.zero();
    for (let k=0;k<want;k++){
      const piece = window.getUpgradeCostBig(u, k);
      total.addInPlace(piece);
    }
    return total;
  }

  function doPurchase(u, idx, n){
    const costBN = costToBuyBig(u, n);
    window.money.subInPlace(costBN);
    const exponent = n * 0.12;
    const multiplier = Math.pow(Math.max(1, u.speedMult), exponent);
    u._rateBN.mulByNumber(multiplier);
    if (u._rateBN.e > 300) u._rateBN = BigNum.fromNumber(1e300);
    u.level += n;
    saveGame();
    updateUI_throttled(true);
  }

  function buyUpgrade(idx, qty, silent){
    const u = upgrades[idx];
    if (u.level >= window.getLevelCap(u)){ if (!silent) alert('このアップグレードは最大Lvです（' + window.getLevelCap(u) + '）'); return; }
    if (qty === 'max'){
      const remaining = window.getLevelCap(u) - u.level;
      let lo = 0, hi = 1;
      while (hi <= remaining && window.money.gteBig(costToBuyBig(u,hi))) hi *= 2;
      hi = Math.min(hi, remaining);
      while (lo + 1 < hi){
        const mid = Math.floor((lo + hi)/2);
        if (window.money.gteBig(costToBuyBig(u, mid))) lo = mid;
        else hi = mid;
      }
      if (lo > 0) doPurchase(u, idx, lo);
      else if (!silent) alert('お金が足りません');
      return;
    }
    const n = Number(qty) || 1;
    const allowed = Math.min(n, window.getLevelCap(u) - u.level);
    if (allowed <= 0){ if (!silent) alert('これ以上購入できません（Lv上限）'); return; }
    const costBN = costToBuyBig(u, allowed);
    if (window.money.gteBig(costBN)) doPurchase(u, idx, allowed);
    else if (!silent) alert('お金が足りません');
  }

  function tryAscend(i){
    const u = upgrades[i];
    if (u.level < window.getLevelCap(u)){ alert('Lv上限に到達してから昇天可能です'); return; }
    if (!confirm(u.name + ' を昇天しますか？')) return;
    u.ascendCount = (u.ascendCount || 0) + 1;
    u.purchasePenalty = (u.purchasePenalty || 0) + 0.25;
    u.level = 0;
    u.progress = 0;
    u._rateBN = BigNum.fromNumber(u.baseRate || 1);
    u._multBN = BigNum.zero();
    saveGame();
    updateUI_throttled(true);
    alert(u.name + ' を昇天しました');
  }

  // UI + throttled update (mirrors previous behaviour)
  let lastUI = 0;
  function updateUI_throttled(force){
    const now = performance.now();
    if (!force && now - lastUI < 100) return;
    lastUI = now;

    // compute total multiplier
    let totalMultBN = BigNum.fromNumber(1);
    for (let i=0;i<upgrades.length;i++){
      const u = upgrades[i];
      const pMult = 0.02 * ((u.prestigeLevel && u.prestigeLevel.mult) || 0);
      const asc = 0.05 * (u.ascendCount || 0);
      const factorBN = BigNum.fromNumber(1);
      factorBN.addInPlace(u._multBN);
      factorBN.addNumber(pMult + asc + (window.globalPrestige ? window.globalPrestige.mAdd || 0 : 0));
      totalMultBN.mulInPlace(factorBN);
    }

    // baseIncome * totalMult
    const rateBN = window.baseIncome.clone();
    rateBN.mulInPlace(totalMultBN);

    // apply prestige boost (if implemented)
    const prestigeMultNum = (window.prestigePoints ? Math.exp(Math.min(700, 0.01 * Math.sqrt(window.prestigePoints))) : 1);
    rateBN.mulByNumber(prestigeMultNum);

    // set display
    const rateEl = document.getElementById('rate');
    const rateDisplayNum = rateBN.toNumberSafe();
    if (rateBN.e > 16 || !isFinite(rateDisplayNum)) rateEl.textContent = rateBN.toString();
    else rateEl.textContent = isFinite(rateDisplayNum) ? rateDisplayNum.toFixed(2) : rateBN.toString();

    document.getElementById('formula').textContent = '収入 = baseIncome × ... （倍速: ' + window.speedMultiplier + (window.paused ? ' 停止中' : '') + '）';

    // update each upgrade UI
    for (let i=0;i<upgrades.length;i++){
      const u = upgrades[i], ui = upgradeUI[i];
      if (!ui) continue;
      ui.lvlEl.textContent = u.level;
      ui.capEl.textContent = window.getLevelCap(u);
      ui.costEl.textContent = window.getUpgradeCostBig(u,0).toString();
      const multNum = u._multBN.toNumberSafe();
      ui.multEl.textContent = '+' + (isFinite(multNum) ? multNum.toFixed(3) : u._multBN.toString());
      const rateClone = u._rateBN.clone();
      rateClone.mulByNumber((window.globalPrestige && window.globalPrestige.rMul) || 1);
      const rateNum = rateClone.toNumberSafe();
      ui.rateEl.textContent = isFinite(rateNum) ? rateNum.toFixed(2) : rateClone.toString();
      ui.ascEl.textContent = u.ascendCount || 0;
      ui.pLvEl.textContent = (u.prestigeLevel && u.prestigeLevel.mult) || 0;
      ui.pLvREl.textContent = (u.prestigeLevel && u.prestigeLevel.rate) || 0;
      ui.pLvCEl.textContent = (u.prestigeLevel && u.prestigeLevel.cost) || 0;

      if (u.level >= window.getLevelCap(u)) ui.btnAsc.classList.remove('invisible'); else ui.btnAsc.classList.add('invisible');
      const canBuy = u.level < window.getLevelCap(u);
      ui.btn1.disabled = !canBuy;
      ui.btn10.disabled = !canBuy;
      ui.btn100.disabled = !canBuy;
      ui.btnMax.disabled = !canBuy;
    }

    // prestige button visibility
    const prestigeBtn = document.getElementById('prestigeBtn');
    const canPrestige = (window.money.gteNumber(1e20) && (window.prestigeCount===0 || window.isMoneyGreaterThan(window.money, window.lastPrestigeScore)));
    if (canPrestige) prestigeBtn.classList.remove('invisible'); else prestigeBtn.classList.add('invisible');

    // Infinity UI elements handled in inf.js but we update basic values
    const inftyFill = document.getElementById('inftyFill');
    const inftyBtn = document.getElementById('gainInfinityBtn');
    const pct = window.bigNumLog10(window.money);
    // compute a percent for display relative to INF_TARGET (simple)
    const pctDisplayed = (window.bigNumLog10(window.money) - window.bigNumLog10(BigNum.fromNumber(1))) / (window.bigNumLog10(INF_TARGET) - window.bigNumLog10(BigNum.fromNumber(1))) * 100;
    if (inftyFill) inftyFill.style.transform = 'scaleX(' + (Math.max(0,Math.min(100,pctDisplayed))/100) + ')';
    const pctEl = document.getElementById('inftyPct');
    if (pctEl) pctEl.textContent = (isFinite(pctDisplayed) ? pctDisplayed.toFixed(6) + '%' : '0%');
    if (!window.money.ltBig(INF_TARGET)) inftyBtn.classList.remove('invisible'); else inftyBtn.classList.add('invisible');

    // IP display (inf.js handles inftyPoints object)
    const ipEl = document.getElementById('inftyPoints');
    if (ipEl) ipEl.textContent = window.infinityPoints.toString();

    // save UI state if needed
  }

  // simulation core (called by render loop in this file)
  const FIXED_DT = 0.05;
  let accumulator = 0;
  let lastTime = performance.now();

  function simulateStep(dt){
    const s = window.speedMultiplier || 1;
    for (let i=0;i<upgrades.length;i++){
      const u = upgrades[i];
      window.prevProgress[i] = window.currProgress[i];
      let progRate = NaN;
      try { progRate = (u._rateBN && typeof u._rateBN.toNumberSafe === 'function') ? u._rateBN.toNumberSafe() : NaN; } catch(e){ progRate = NaN; }
      if (!isFinite(progRate) || progRate <= 0) progRate = (u.baseRate || 0.01);
      progRate *= ((window.globalPrestige && window.globalPrestige.rMul) || 1);
      let incProg = progRate * dt * 100 * s;
      if (!isFinite(incProg)) incProg = 0;
      window.currProgress[i] += incProg;
      if (window.currProgress[i] > 1e9) window.currProgress[i] = 1e9;
      if (window.currProgress[i] >= 100){
        let completed = Math.floor(window.currProgress[i] / 100);
        if (completed > 1000000) completed = 1000000;
        window.currProgress[i] -= completed * 100;
        const incBaseBN = getMultiplierIncrementBig(u);
        incBaseBN.mulByNumber(completed);
        u._multBN.addInPlace(incBaseBN);
        if (u._multBN.e > 300) u._multBN = BigNum.fromNumber(1e300);
      }
      u.progress = window.currProgress[i];
    }

    // compute income add
    let totalMultBN = BigNum.fromNumber(1);
    for (let i=0;i<upgrades.length;i++){
      const u = upgrades[i];
      const pMult = 0.02 * ((u.prestigeLevel && u.prestigeLevel.mult) || 0);
      const asc = 0.05 * (u.ascendCount || 0);
      const factorBN = BigNum.fromNumber(1);
      factorBN.addInPlace(u._multBN);
      factorBN.addNumber(pMult + asc + (window.globalPrestige ? window.globalPrestige.mAdd || 0 : 0));
      totalMultBN.mulInPlace(factorBN);
    }

    const addBN = window.baseIncome.clone();
    addBN.mulInPlace(totalMultBN);

    // apply prestige multiplier placeholder
    const prestigeMultNum = (window.prestigePoints ? Math.exp(Math.min(700, 0.01 * Math.sqrt(window.prestigePoints))) : 1);
    addBN.mulByNumber(prestigeMultNum);

    // apply softcap (simple)
    const softMult = 1.0; // keep simple here or use window.softCap... if present
    addBN.mulByNumber(softMult);

    addBN.mulByNumber(dt * s);
    window.money.addInPlace(addBN);

    // cap if needed (inf.js handles break)
    if (!window.infinityBreakUnlocked && window.money.gteBig(INF_TARGET)) { window.money = INF_TARGET.clone(); }

    // generator simulation handled in inf.js via generatorPoints etc.
  }

  // render loop (interpolates progress meters)
  function renderLoop(){
    const now = performance.now();
    let frameDelta = (now - lastTime) / 1000;
    if (!isFinite(frameDelta) || frameDelta <= 0) frameDelta = 0;
    lastTime = now;
    if (frameDelta > 0.5) frameDelta = 0.5;
    accumulator += frameDelta;
    if (accumulator > 0.5) accumulator = 0.5;

    if (!window.paused){
      while (accumulator >= FIXED_DT){
        simulateStep(FIXED_DT);
        accumulator -= FIXED_DT;
      }
    } else {
      accumulator = 0;
      for (let i=0;i<upgrades.length;i++) window.prevProgress[i] = window.currProgress[i];
    }

    const alpha = FIXED_DT === 0 ? 0 : (accumulator / FIXED_DT);

    // money display
    if (window.money.m === 0){
      window.displayMoneyNum += (0 - window.displayMoneyNum) * 0.12;
      document.getElementById('money').textContent = window.fmtSmall(window.displayMoneyNum);
    } else if (window.money.e <= 12){
      const v = window.money.toNumberSafe();
      if (isFinite(v)){
        window.displayMoneyNum += (v - window.displayMoneyNum) * 0.12;
        document.getElementById('money').textContent = window.fmtSmall(window.displayMoneyNum);
      } else {
        document.getElementById('money').textContent = window.money.toString();
      }
    } else {
      document.getElementById('money').textContent = window.money.toString();
    }

    // progress fills
    for (let i=0;i<upgrades.length;i++){
      const interp = window.prevProgress[i] + (window.currProgress[i] - window.prevProgress[i]) * alpha;
      const w = Math.min(Math.max(interp, 0), 100);
      const el = upgradeUI[i] && upgradeUI[i].fillEl;
      if (el){
        const scale = Math.max(0, Math.min(1, w / 100));
        el.style.transform = 'scaleX(' + scale + ')';
      }
    }

    // UI update
    updateUI_throttled();

    requestAnimationFrame(renderLoop);
  }

  // save & load (simple)
  function saveGame(){
    try {
      const save = {
        money: window.money.toObject(),
        upgrades: window.upgrades.map(u => ({ level:u.level, progress:u.progress, rateBN:u._rateBN.toObject(), multBN:u._multBN.toObject(), ascendCount:u.ascendCount, purchasePenalty:u.purchasePenalty })),
        prestigePoints: window.prestigePoints,
        prestigeCount: window.prestigeCount,
        lastPrestigeScore: window.lastPrestigeScore.toObject(),
        infinityPoints: window.infinityPoints.toObject(),
        generators: window.generators,
        minesCount: window.minesCount,
        goldenParticles: window.goldenParticles,
        speedMultiplier: window.speedMultiplier,
        paused: window.paused
      };
      localStorage.setItem('idle_gen_save_v1', JSON.stringify(save));
    } catch(e){ console.warn('saveGame failed', e); }
  }
  window.saveGame = saveGame;

  function loadGame(){
    try {
      const raw = localStorage.getItem('idle_gen_save_v1');
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.money) window.money = BigNum.fromObject(data.money);
      if (Array.isArray(data.upgrades) && data.upgrades.length === window.upgrades.length){
        data.upgrades.forEach((s,i) => {
          window.upgrades[i].level = Number.isFinite(+s.level)? +s.level : 0;
          window.upgrades[i].progress = Number.isFinite(+s.progress)? +s.progress : 0;
          if (s.rateBN) window.upgrades[i]._rateBN = BigNum.fromObject(s.rateBN);
          if (s.multBN) window.upgrades[i]._multBN = BigNum.fromObject(s.multBN);
          window.upgrades[i].ascendCount = Number.isFinite(+s.ascendCount)? +s.ascendCount : 0;
          window.upgrades[i].purchasePenalty = Number.isFinite(+s.purchasePenalty)? +s.purchasePenalty : 0;
        });
      }
      if (typeof data.prestigePoints === 'number') window.prestigePoints = data.prestigePoints;
      if (typeof data.prestigeCount === 'number') window.prestigeCount = data.prestigeCount;
      if (data.lastPrestigeScore) window.lastPrestigeScore = BigNum.fromObject(data.lastPrestigeScore);
      if (data.infinityPoints) window.infinityPoints = BigNum.fromObject(data.infinityPoints);
      if (Array.isArray(data.generators)) window.generators = data.generators;
      if (typeof data.minesCount === 'number') window.minesCount = data.minesCount;
      if (typeof data.goldenParticles === 'number') window.goldenParticles = data.goldenParticles;
      if (typeof data.speedMultiplier === 'number') window.speedMultiplier = data.speedMultiplier;
      if (typeof data.paused === 'boolean') window.paused = data.paused;
    } catch(e){ console.warn('loadGame failed', e); }
  }
  window.loadGame = loadGame;
  window.saveGame = saveGame; // expose

  // small wiring for UI buttons on generation page
  document.getElementById('prestigeBtn').addEventListener('click', ()=> { if (confirm('プレステージしますか？')) { /* implement in inf.js or here */ alert('プレステージ処理は実装箇所に移動しました'); } });
  document.getElementById('resetBtn').addEventListener('click', ()=>{ if (confirm('完全リセットしますか？')) { localStorage.removeItem('idle_gen_save_v1'); localStorage.removeItem('idle_inf_save_v1'); location.reload(); } });

  // speed controls
  document.getElementById('speedSelect').addEventListener('change', (e)=> { window.speedMultiplier = Math.max(1, Math.min(3, Number(e.target.value))); });
  document.getElementById('speedInc').addEventListener('click', ()=> { window.speedMultiplier = Math.min(3, window.speedMultiplier + 1); document.getElementById('speedSelect').value = window.speedMultiplier; });
  document.getElementById('speedDec').addEventListener('click', ()=> { window.speedMultiplier = Math.max(1, window.speedMultiplier - 1); document.getElementById('speedSelect').value = window.speedMultiplier; });
  document.getElementById('pauseBtn').addEventListener('click', ()=> { window.paused = !window.paused; document.getElementById('pauseBtn').textContent = window.paused ? '再開' : '一時停止'; });

  // Tab wiring is in inf.js to avoid duplication

  // init
  window.sanitizeUpgrades(window.upgrades);
  loadGame();
  initUI();
  requestAnimationFrame(renderLoop);

})();