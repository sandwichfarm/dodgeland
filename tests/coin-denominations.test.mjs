import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { loadSources } from './source-loader.mjs';

const source=await loadSources(['game','coin-denominations','coin-models','market/catalog']);
after(source.dispose);
const {Game,coinPosition}=await source.import('game');
const {COIN_DENOMINATIONS,coinDenomination,coinDenominationAtRoll,coinDenominationForRow,touchesCoin}=await source.import('coin-denominations');
const {ITEM_CATALOG}=await source.import('market/catalog');
const {coinPickupModel}=await source.import('coin-models');
function arena() {
  const game=new Game(9,'pond','stroll',false,ITEM_CATALOG);
  for(const lane of game.rows.values()) {
    Object.assign(lane,{kind:'meadow',blocked:[],decorations:[],coin:null,speed:0,phase:0,spacing:20,length:4});
    delete lane.coinDenomination; delete lane.actors; delete lane.coinActor;
  }
  game.state='playing'; return game;
}
function buy(game,ids) {
  game.run.advanceScore(100); assert.equal(game.openMarket(),true);
  for(const id of ids) {
    const item=game.run.catalog.get(id);
    game.run.creditCoins(item.price);
    game.run.market.offers=[{id,itemId:id,price:item.price,sold:false}];
    assert.equal(game.run.buy(id).ok,true);
  }
  game.closeMarket(); game.run.market=null;
}
function reward(game,row,id,x=0) {
  const lane=game.rows.get(row); lane.coin=x; lane.coinDenomination=id; return lane;
}

test('pickup names, values and exact exclusive odds match the economy',()=>{
  assert.deepEqual(COIN_DENOMINATIONS.map(({id,name,value,oneIn})=>({id,name,value,oneIn})),[
    {id:'coin',name:'Coin',value:1,oneIn:null},
    {id:'bar',name:'Bigger Bar',value:2,oneIn:35},
    {id:'small-sack',name:'Small Sack',value:5,oneIn:100},
    {id:'big-sack',name:'Big Sack',value:10,oneIn:500},
    {id:'huge-sack',name:'Huge Sack',value:25,oneIn:1234},
  ]);
  let boundary=0;
  for(const item of COIN_DENOMINATIONS.slice(1)) {
    assert.equal(item.probability,1/item.oneIn);
    assert.equal(coinDenominationAtRoll(boundary),item.id);
    boundary+=item.probability;
    assert.equal(coinDenominationAtRoll(boundary-1e-12),item.id);
  }
  assert.equal(coinDenominationAtRoll(boundary),'coin');
  assert.equal(coinDenominationAtRoll(1-Number.EPSILON),'coin');
  assert.ok(Math.abs(COIN_DENOMINATIONS.reduce((sum,item)=>sum+item.probability,0)-1)<1e-12);
  for(const invalid of [-1,1,NaN,Infinity]) assert.throws(()=>coinDenominationAtRoll(invalid));
  // Stratification checks each interval's full width without statistical flakes.
  const samples=1000000, counts=new Map(COIN_DENOMINATIONS.map(item=>[item.id,0]));
  for(let i=0;i<samples;i++) {const id=coinDenominationAtRoll((i+.5)/samples); counts.set(id,counts.get(id)+1);}
  for(const item of COIN_DENOMINATIONS) assert.ok(Math.abs(counts.get(item.id)-samples*item.probability)<=1,`${item.id} retains its requested probability`);
});

test('at zero gravity every denomination requires physical contact and pays its full value once',()=>{
  for(const item of COIN_DENOMINATIONS) {
    const game=arena(), lane=reward(game,0,item.id,1), events=[];
    game.run.effects.coinRadius=0;
    game.onCoin=amount=>events.push(amount);
    game.update(0); assert.equal(game.coins,0); assert.equal(lane.coin,1);
    assert.equal(lane.coinPull,undefined,'zero gravity never attracts larger pickups');
    const edge=item.id==='coin' ? .32 : .2+item.width/2;
    game.x=game.fromX=1-edge-.01; game.update(0); assert.equal(game.coins,0,'visible gap cannot collect');
    game.x=game.fromX=1-edge+.01; game.update(0);
    assert.equal(game.coins,item.value); assert.equal(game.run.wallet,item.value); assert.deepEqual(events,[item.value]);
    assert.equal(lane.coin,null); assert.equal(lane.coinDenomination,undefined); assert.equal(coinPosition(lane,game.time),null);
    game.update(0); assert.deepEqual(events,[item.value]);
  }
  assert.equal(touchesCoin('huge-sack',0,.5),false,'a wide sack does not get an oversized depth hitbox');
});

test('magnet transports each denomination intact and pays only when it arrives',()=>{
  for(const item of COIN_DENOMINATIONS.slice(1)) {
    const game=arena(); buy(game,['magnet']);
    const lane=reward(game,1,item.id), events=[]; game.onCoin=amount=>events.push(amount);
    game.update(0); assert.ok(lane.coinPull); assert.equal(game.coins,0);
    const before=coinPosition(lane,game.time);
    for(let i=0;i<8;i++) game.update(1/120);
    assert.ok(coinPosition(lane,game.time).y<before.y); assert.equal(game.coins,0);
    assert.equal(lane.coinDenomination,item.id);
    game.pause(); const position=coinPosition(lane,game.time); game.update(10);
    assert.deepEqual(coinPosition(lane,game.time),position); game.resume();
    for(let i=0;i<360;i++) game.update(1/120);
    assert.equal(game.coins,item.value); assert.equal(game.run.wallet,item.value); assert.deepEqual(events,[item.value]);
    assert.equal(lane.coin,null); assert.equal(game.attractedCoins.size,0);
  }
});

test('platform pickups apply denomination, terrain bonus and multiplier exactly once',()=>{
  const game=arena(); buy(game,['river-coins','coin-multiplier']);
  const lane=reward(game,0,'huge-sack'); Object.assign(lane,{kind:'river',coinActor:0});
  const events=[]; game.onCoin=amount=>events.push(amount);
  const expected=Math.floor((25+game.run.effects.riverCoinBonus)*game.run.effects.coinMultiplier);
  game.update(0);
  assert.equal(game.state,'playing'); assert.equal(game.coins,expected); assert.equal(game.run.wallet,expected); assert.deepEqual(events,[expected]);
  game.update(0); assert.deepEqual(events,[expected]);
});

test('card-created rewards use the same deterministic denomination roll without altering old seeds',()=>{
  for(const schema of [1,2,3]) {
    const game=Game.fromSeed(`ph${schema}-00000009-pond-s-n`,ITEM_CATALOG);
    game.state='playing'; buy(game,['coin-chance','river-coins']);
    let enhanced=0, rare=0;
    for(let score=100;score<5000;score+=30) {
      game.maxY=score; game.ensureRows();
      for(const lane of game.rows.values()) if(lane.coin!==null) {
        enhanced++;
        if(schema<3) assert.equal(lane.coinDenomination,undefined);
        else {
          const expected=coinDenominationForRow(game.runSeed.seed,lane.index);
          assert.equal(lane.coinDenomination??'coin',expected);
          if(expected!=='coin') rare++;
        }
      }
    }
    assert.ok(enhanced>100); if(schema===3) assert.ok(rare>20);
  }
});

test('larger wallet values survive earnings and become an exact death spill',()=>{
  const game=arena(); reward(game,0,'huge-sack'); game.update(0);
  game.setCharacter('sunny'); game.end('Splash','water');
  assert.equal(game.state,'dead'); assert.equal(game.coins,25); assert.equal(game.run.wallet,0);
  assert.equal(game.deathSpill.drops.filter(drop=>drop.kind==='coin').reduce((sum,drop)=>sum+drop.amount,0),25);
});

test('pickup models have distinct sizes and valid geometry within their footprints',()=>{
  const sizes=COIN_DENOMINATIONS.map(item=>{
    const model=coinPickupModel(item.id);
    assert.ok(model.length>1);
    for(const voxel of model) {
      assert.ok([voxel.x,voxel.y,voxel.z,voxel.w,voxel.d,voxel.h].every(Number.isFinite));
      assert.ok(voxel.w>0 && voxel.d>0 && voxel.h>0);
      assert.ok(Math.abs(voxel.x)+voxel.w/2<=item.width/2+1e-9);
      assert.ok(Math.abs(voxel.y)+voxel.d/2<=item.depth/2+.03,'seals and rope extend only slightly from the bag');
    }
    return {width:item.width,height:Math.max(...model.map(v=>v.z+v.h))};
  });
  for(let i=1;i<sizes.length;i++) assert.ok(sizes[i].width>sizes[i-1].width);
  assert.ok(sizes[4].height>sizes[3].height && sizes[3].height>sizes[2].height);
  assert.equal(coinDenomination().value,1,'existing rewards default to one coin');
});
