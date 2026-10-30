import {test} from 'node:test';import assert from 'node:assert/strict';
import {sma,ema,rsi,bollinger,parseCsv,csv} from '../src/analysis.ts';
test('SMA and EMA use the correct warm-up period',()=>{assert.deepEqual(sma([1,2,3,4],3),[null,null,2,3]);assert.deepEqual(ema([1,2,3,4],3),[null,null,2,3]);});
test('Wilder RSI handles increasing, decreasing and flat prices',()=>{assert.equal(rsi(Array.from({length:30},(_,i)=>i)).at(-1),100);assert.equal(rsi(Array.from({length:30},(_,i)=>30-i)).at(-1),0);assert.equal(rsi(Array(30).fill(10)).at(-1),50);});
test('Bollinger bands use population standard deviation',()=>{const b=bollinger([1,2,3],3);assert.equal(b.middle[2],2);assert.ok(Math.abs(b.upper[2]!-(2+2*Math.sqrt(2/3)))<1e-10);});
test('CSV sorts dates, validates OHLC and round trips UTC timestamps',()=>{const text='time,open,high,low,close,volume\n2026-10-02,10,12,9,11,100\n2026-10-01,9,11,8,10,120';const c=parseCsv(text);assert.equal(c[0].close,10);assert.deepEqual(parseCsv(csv(c)),c);assert.throws(()=>parseCsv(text.replace(',12,9,',',8,9,')));assert.throws(()=>parseCsv(text.replace('2026-10-02','2026-10-01')));});
