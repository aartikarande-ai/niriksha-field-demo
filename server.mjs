import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(ROOT, 'data');
const RECORDS_FILE = path.join(DATA_DIR, 'records.json');
const PORT = Number(process.env.PORT || 8080);
const sessions = new Map();
const pendingOtps = new Map();
const loginAttempts = new Map();
const demoOtp = process.env.DEMO_OTP || '246810';
const allowedOrigins = new Set([
  'https://localhost',
  'capacitor://localhost',
  ...(process.env.CORS_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean)
]);

const mime = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon' };
const json = (res, status, body, extra={}) => { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extra}); res.end(JSON.stringify(body)); };
function cookies(req){return Object.fromEntries((req.headers.cookie||'').split(';').map(x=>x.trim()).filter(Boolean).map(x=>{const i=x.indexOf('=');return [x.slice(0,i),decodeURIComponent(x.slice(i+1))]}))}
function sessionFor(req){const token=cookies(req).niriksha_session;return token?sessions.get(token):null}
function sessionCookie(req,token,maxAge){
  const forwardedProto=String(req.headers['x-forwarded-proto']||'http').split(',')[0].trim();
  const requestOrigin=`${forwardedProto}://${req.headers.host}`;
  const crossOrigin=Boolean(req.headers.origin&&req.headers.origin!==requestOrigin);
  const secure=process.env.NODE_ENV==='production'||forwardedProto==='https';
  const sameSite=crossOrigin?'None':'Strict';
  return `niriksha_session=${token}; HttpOnly; SameSite=${sameSite}; Path=/; Max-Age=${maxAge};${secure?' Secure;':''}`;
}
async function body(req){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>1_000_000)throw new Error('Request body too large')}return raw?JSON.parse(raw):{}}
async function readRecords(){try{return JSON.parse(await fs.readFile(RECORDS_FILE,'utf8'))}catch{return []}}
let writeQueue=Promise.resolve();
function writeRecords(records){writeQueue=writeQueue.then(async()=>{await fs.mkdir(DATA_DIR,{recursive:true});const tmp=RECORDS_FILE+'.tmp';await fs.writeFile(tmp,JSON.stringify(records,null,2),'utf8');await fs.rename(tmp,RECORDS_FILE)});return writeQueue}
function recordDigest(record){const fields={id:record.id,operator:record.operator,subject:record.subject,date:record.date,createdAt:record.createdAt,site:record.site,location:record.location||null,note:record.note||'',status:record.status,confidence:record.confidence,imageHash:record.imageHash||''};return crypto.createHash('sha256').update(JSON.stringify(fields)).digest('hex')}
function validRecord(r){return r&&typeof r==='object'&&typeof r.id==='string'&&r.id.length<80&&typeof r.subject==='string'&&r.subject.length<120&&typeof r.site==='string'&&r.site.length<240&&['Positive','Negative','Inconclusive'].includes(r.status)&&typeof r.imageHash==='string'&&r.imageHash.length<=128}

const server=http.createServer(async(req,res)=>{
  try{
    const origin=req.headers.origin;
    if(origin&&allowedOrigins.has(origin)){
      res.setHeader('Access-Control-Allow-Origin',origin);
      res.setHeader('Access-Control-Allow-Credentials','true');
      res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers','Content-Type');
      res.setHeader('Vary','Origin');
    }
    if(req.method==='OPTIONS'){
      if(!origin||!allowedOrigins.has(origin))return json(res,403,{error:'App origin is not allowed.'});
      res.writeHead(204);return res.end();
    }
    const url=new URL(req.url,'http://localhost');
    if(req.method==='GET'&&url.pathname==='/api/health')return json(res,200,{ok:true,service:'Niriksha demo backend',mode:'prototype'});
    if(req.method==='POST'&&url.pathname==='/api/auth/login'){
      const ip=req.socket.remoteAddress||'unknown',now=Date.now(),entry=loginAttempts.get(ip)||{count:0,until:now+900000};
      if(now>entry.until){entry.count=0;entry.until=now+900000} if(entry.count>=10){loginAttempts.set(ip,entry);return json(res,429,{error:'Too many demo sign-in attempts. Try again later.'})}
      entry.count++;loginAttempts.set(ip,entry);
      const b=await body(req),operator=String(b.operatorId||'').trim().slice(0,40);
      if(!/^[A-Za-z0-9_-]{2,40}$/.test(operator)||b.password!=='demo1234')return json(res,401,{error:'Check the demo operator ID and password.'});
      pendingOtps.set(operator,{expires:now+5*60_000,attempts:0});
      return json(res,200,{ok:true,operatorId:operator,otp:demoOtp,expiresInSeconds:300,demoOnly:true});
    }
    if(req.method==='POST'&&url.pathname==='/api/auth/verify-otp'){
      const b=await body(req),operator=String(b.operatorId||''),challenge=pendingOtps.get(operator);
      if(!challenge||Date.now()>challenge.expires||challenge.attempts>=5){pendingOtps.delete(operator);return json(res,401,{error:'Code expired. Sign in again.'})}
      challenge.attempts++;
      if(String(b.otp||'')!==demoOtp)return json(res,401,{error:'Incorrect demo code.'});
      pendingOtps.delete(operator);const token=crypto.randomBytes(32).toString('base64url');sessions.set(token,{operator,expires:Date.now()+8*60*60_000});
      return json(res,200,{ok:true,operatorId:operator,demoOnly:true},{'Set-Cookie':sessionCookie(req,token,28800)});
    }
    if(req.method==='GET'&&url.pathname==='/api/auth/me'){
      const s=sessionFor(req);return s&&s.expires>Date.now()?json(res,200,{operatorId:s.operator,demoOnly:true}):json(res,401,{error:'Sign in required.'});
    }
    if(req.method==='POST'&&url.pathname==='/api/auth/logout'){
      const token=cookies(req).niriksha_session;sessions.delete(token);return json(res,200,{ok:true},{'Set-Cookie':sessionCookie(req,'',0)});
    }
    if(url.pathname.startsWith('/api/')){
      const s=sessionFor(req);if(!s||s.expires<Date.now())return json(res,401,{error:'Sign in required.'});
      if(req.method==='GET'&&url.pathname==='/api/records'){
        const all=await readRecords();return json(res,200,{records:all.filter(r=>r.operator===s.operator)});
      }
      if(req.method==='POST'&&url.pathname==='/api/records'){
        const r=await body(req);if(!validRecord(r))return json(res,400,{error:'Record fields are invalid.'});
        r.operator=s.operator;r.backendDigest=recordDigest(r);r.storage='server-demo';
        const all=await readRecords();if(all.some(x=>x.id===r.id))return json(res,409,{error:'That record ID already exists.'});
        all.unshift(r);await writeRecords(all);return json(res,201,{record:r});
      }
      if(req.method==='POST'&&url.pathname==='/api/records/verify'){
        const {id}=await body(req),all=await readRecords(),r=all.find(x=>x.id===id&&x.operator===s.operator);
        if(!r)return json(res,404,{error:'Record not found.'});const valid=r.backendDigest===recordDigest(r);
        return json(res,200,{valid,recordId:r.id,mode:'server-demo-digest',note:'A server-side digest check for the prototype; not a digital signature or production chain of custody.'});
      }
      return json(res,404,{error:'API route not found.'});
    }
    if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'Method not allowed.'});
    const requested=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);const file=path.resolve(ROOT,'.'+requested);
    if(!file.startsWith(ROOT+path.sep))return json(res,403,{error:'Forbidden.'});
    const content=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:content);
  }catch(error){console.error(error);json(res,error instanceof SyntaxError?400:500,{error:error instanceof SyntaxError?'Invalid JSON request.':'Backend error.'})}
});

server.listen(PORT,'0.0.0.0',()=>console.log(`Niriksha demo backend running at http://localhost:${PORT}`));
