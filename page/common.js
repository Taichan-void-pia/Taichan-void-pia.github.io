// common.js
// BigNum + shared state + helpers

(function(){
  // expose errors to page
  function showError(msg){ const el=document.getElementById('error'); if(el){ el.style.display='block'; el.textContent='エラー: '+msg; } console.error(msg); }

  // BigNum class (軽量)
  class BigNum {
    constructor(m=0,e=0){ this.m=m; this.e=e; this._normalize(); }
    static zero(){ return new BigNum(0,0); }
    static fromNumber(n){
      if (!isFinite(n) || n === 0) return BigNum.zero();
      const sign = n<0?-1:1; n = Math.abs(n);
      const exp = Math.floor(Math.log10(n));
      const mant = n / Math.pow(10, exp);
      return new BigNum(sign * mant, exp);
    }
    static fromObject(o){ if (!o || typeof o.m!=='number' || typeof o.e!=='number') return BigNum.zero(); return new BigNum(o.m, o.e); }
    static fromMantExp(m,e){ return new BigNum(m,e); }
    clone(){ return new BigNum(this.m, this.e); }
    _normalize(){
      if (!isFinite(this.m) || !isFinite(this.e) || this.m === 0){
        if (this.m === 0){ this.e = 0; this.m = 0; return; }
        if (!isFinite(this.m)) this.m = this.m > 0 ? 9.9999999999999 : -9.9999999999999;
      }
      if (this.m === 0){ this.e = 0; return; }
      let sign = this.m < 0 ? -1 : 1;
      let mabs = Math.abs(this.m);
      if (mabs === 0){ this.m = 0; this.e = 0; return; }
      const shift = Math.floor(Math.log10(mabs));
      if (isFinite(shift) && shift !== 0){ mabs = mabs / Math.pow(10, shift); this.e = this.e + shift; }
      if (mabs >= 10){ mabs = mabs / 10; this.e = this.e + 1; }
      this.m = sign * mabs;
    }
    toObject(){ return {m:this.m, e:this.e}; }
    toNumberSafe(){ if (!isFinite(this.m) || !isFinite(this.e)) return NaN; if (this.e > 15 || this.e < -15) return this.m>0?Infinity:-Infinity; return this.m * Math.pow(10, this.e); }
    toString(){ if (this.m === 0) return "0"; if (this.e <=12 && this.e >= -6){ const v=this.toNumberSafe(); if (isFinite(v)) return v.toLocaleString(undefined,{maximumFractionDigits:2}); } return this.m.toFixed(3) + "e" + this.e; }
    addInPlace(other){ if (typeof other === 'number') other = BigNum.fromNumber(other); if (!(other instanceof BigNum)) return; if (this.m === 0){ this.m = other.m; this.e = other.e; return; } if (other.m === 0) return; const diff = this.e - other.e; if (Math.abs(diff) > 15){ if (diff > 0) return; else { this.m = other.m; this.e = other.e; return; } } if (diff >= 0){ const scaled = other.m * Math.pow(10, -diff); this.m = this.m + scaled; } else { const scaled = this.m * Math.pow(10, diff); this.m = other.m + scaled; this.e = other.e; } this._normalize(); }
    subInPlace(other){ if (typeof other === 'number') other = BigNum.fromNumber(other); if (!(other instanceof BigNum)) return; other = new BigNum(-other.m, other.e); this.addInPlace(other); }
    mulInPlace(other){ if (typeof other === 'number'){ if (!isFinite(other) || other === 0){ this.m = 0; this.e = 0; return; } other = BigNum.fromNumber(other); } if (!(other instanceof BigNum)) return; if (this.m === 0 || other.m === 0){ this.m = 0; this.e = 0; return; } this.m = this.m * other.m; this.e = this.e + other.e; this._normalize(); }
    mulByNumber(n){ if (typeof n !== 'number') return; if (!isFinite(n) || n === 0){ this.m = 0; this.e = 0; return; } this.m = this.m * n; this._normalize(); }
    addNumber(n){ this.addInPlace(BigNum.fromNumber(n)); }
    gteNumber(n){ if (typeof n !== 'number') n = Number(n); if (!isFinite(n)) return false; if (n === 0) return this.m >= 0; const bn = BigNum.fromNumber(n); return this.gteBig(bn); }
    gteBig(b){ if (!(b instanceof BigNum)) b = BigNum.fromObject(b); if (this.m === 0 && b.m === 0) return true; if (this.e !== b.e) return this.e > b.e; return Math.abs(this.m) >= Math.abs(b.m); }
    ltBig(b){ if (!(b instanceof BigNum)) b = BigNum.fromObject(b); if (this.e !== b.e) return this.e < b.e; return Math.abs(this.m) < Math.abs(b.m); }
    eqBig(b){ if (!(b instanceof BigNum)) b = BigNum.fromObject(b); return this.e === b.e && Math.abs(this.m - b.m) < 1e-12; }
  }

  // Shared constants / initial state
  const INF_TARGET = BigNum.fromMantExp(1.8,308);
  window.BigNum = BigNum; // expose globally if needed
  window.INF_TARGET = INF_TARGET;

  // make shared state explicit on window
  window.money = BigNum.zero();
  window.baseIncome = BigNum.fromNumber(1);

  // upgrades template kept simple — gen.js will clone/manipulate
  window.upgradesTemplate = [
    { name:"収入アップ", baseRate:0.9, rate:0.9, mult:0, speedMult:1.18, baseCost:12 },
    { name:"効率アップ", baseRate:0.6, rate:0.6, mult:0, speedMult:1.16, baseCost:40 },
    { name:"自動販売機", baseRate:0.45, rate:0.45, mult:0, speedMult:1.14, baseCost:120 },
    { name:"銀行投資", baseRate:0.3, rate:0.3, mult:0, speedMult:1.12, baseCost:520 },
    { name:"AI生成工場", baseRate:0.18, rate:0.18, mult:0, speedMult:1.10, baseCost:2200 },
    { name:"マーケティング", baseRate:0.14, rate:0.14, mult:0, speedMult:1.09, baseCost:12000 },
    { name:"研究所", baseRate:0.11, rate:0.11, mult:0, speedMult:1.085, baseCost:60000 },
    { name:"惑星開発", baseRate:0.08, rate:0.08, mult:0, speedMult:1.07, baseCost:250000 },
    { name:"量子サーバー", baseRate:0.05, rate:0.05, mult:0, speedMult:1.055, baseCost:1200000 },
    { name:"次元コア", baseRate:0.02, rate:0.02, mult:0, speedMult:1.04, baseCost:6000000 }
  ];

  // shared arrays
  window.upgrades = JSON.parse(JSON.stringify(window.upgradesTemplate)).map(u=>{
    u.level = 0; u.progress = 0; u._rateBN = BigNum.fromNumber(u.rate || u.baseRate || 1); u._multBN = BigNum.fromNumber(u.mult||0); u._baseCostBN = BigNum.fromNumber(u.baseCost||1); u.ascendCount=0; u.purchasePenalty=0; u.prestigeLevel={mult:0,rate:0,cost:0}; return u;
  });

  // Important shared variables for UI interpolation (declare here to avoid TDZ / undefined)
  window.prevProgress = new Array(window.upgrades.length).fill(0);
  window.currProgress = new Array(window.upgrades.length).fill(0);
  window.displayMoneyNum = 0;

  // game control
  window.speedMultiplier = 1;
  window.paused = false;

  // prestige / infinity
  window.prestigePoints = 0;
  window.prestigeCount = 0;
  window.lastPrestigeScore = BigNum.zero();
  window.infinityPoints = BigNum.zero(); // BigNum
  window.generatorPoints = 0;
  window.generators = new Array(10).fill(0).map(()=>({count:0,progress:0}));

  // mines / GDP
  window.minesCount = 0;
  window.minesUnlocked = false;
  window.goldenParticles = 0;

  // helpers
  window.fmtSmall = function(n){
    if (typeof n === 'number'){
      if (!isFinite(n)) return "Infinity";
      if (Math.abs(n) >= 1e15) return n.toExponential(2);
      if (Math.abs(n) >= 1e9) return (n/1e9).toFixed(2) + "B";
      if (Math.abs(n) >= 1e6) return (n/1e6).toFixed(2) + "M";
      return Math.floor(n).toLocaleString();
    }
    return String(n);
  };

  window.bigNumLog10 = function(bn){
    if (!(bn instanceof BigNum)) bn = BigNum.fromObject(bn);
    if (bn.m === 0) return -Infinity;
    return bn.e + Math.log10(Math.abs(bn.m));
  };

  // export a simple sanitize for upgrades used by gen.js
  window.sanitizeUpgrades = function(list){
    for (let i=0;i<list.length;i++){
      const u = list[i];
      if (!u || typeof u !== 'object'){ list[i] = JSON.parse(JSON.stringify(window.upgradesTemplate[i])); continue; }
      if (typeof u.mult !== 'number') u.mult = 0;
      if (typeof u.rate !== 'number') u.rate = u.baseRate || window.upgradesTemplate[i].baseRate;
      if (typeof u.baseCost !== 'number') u.baseCost = window.upgradesTemplate[i].baseCost;
      if (typeof u.level !== 'number') u.level = 0;
      if (typeof u.progress !== 'number') u.progress = 0;
      if (!u.prestigeLevel || typeof u.prestigeLevel !== 'object') u.prestigeLevel = {mult:0,rate:0,cost:0};
      if (typeof u.ascendCount !== 'number') u.ascendCount = 0;
      if (typeof u.purchasePenalty !== 'number') u.purchasePenalty = 0;
      u._rateBN = u._rateBN ? BigNum.fromObject(u._rateBN) : BigNum.fromNumber(u.rate);
      u._multBN = u._multBN ? BigNum.fromObject(u._multBN) : BigNum.fromNumber(u.mult);
      u._baseCostBN = u._baseCostBN ? BigNum.fromObject(u._baseCostBN) : BigNum.fromNumber(u.baseCost);
    }
  };

  // basic cost calc (getUpgradeCostBig) used by gen.js
  window.getLevelCap = function(u){ return 100 + (u.ascendCount || 0) * 10; };
  window.costBaseMultVar = 1.15;
  window.getUpgradeCostBig = function(u, extraLevelOffset=0){
    const level = (u.level + extraLevelOffset);
    const factor = Math.pow(window.costBaseMultVar, Math.max(0, level));
    const c = u._baseCostBN.clone();
    c.mulByNumber(factor);
    const penalty = 1 + (u.purchasePenalty || 0);
    c.mulByNumber(penalty);
    // globalPrestige.costMul may be added later in gen.js
    return c;
  };

  // small numeric helpers
  window.isMoneyGreaterThan = function(a,b){
    if (!(a instanceof BigNum)) a = BigNum.fromObject(a);
    if (!(b instanceof BigNum)) b = BigNum.fromObject(b);
    if (a.e !== b.e) return a.e > b.e;
    return Math.abs(a.m) > Math.abs(b.m);
  };

  // Save/load stubs (detailed implementation in gen.js/inf.js will reuse)
  window.saveGameCommon = function(){ /* placeholder */ };

  // expose for other scripts
  window._commonLoaded = true;
})();