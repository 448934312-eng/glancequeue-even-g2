import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const fail=(status,message)=>Object.assign(new Error(message),{status});
export function createBackend({token='',source='',fetcher=fetch,stateFile=null}={}){
 const live=Boolean(token&&source), allowed=new Set();
 let tasks=[{id:'demo-1',title:'Review the final storyboard',due:'Today',revision:'1'},{id:'demo-2',title:'Check the sound mix',due:'Today',revision:'1'},{id:'demo-3',title:'Export the delivery package',due:'Tomorrow',revision:'1'}];
 if(stateFile&&fs.existsSync(stateFile))tasks=JSON.parse(fs.readFileSync(stateFile,'utf8'));
 const save=()=>{if(stateFile){fs.writeFileSync(stateFile+'.tmp',JSON.stringify(tasks));fs.renameSync(stateFile+'.tmp',stateFile);}};
 async function notion(route,method='GET',body){const r=await fetcher('https://api.notion.com/v1/'+route,{method,headers:{Authorization:'Bearer '+token,'Notion-Version':'2025-09-03','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(8000)});if(!r.ok)throw fail(r.status===429?429:502,r.status===429?'Notion rate limit. Wait before retrying.':'Notion request failed. Check connection and permissions.');return r.json();}
 return http.createServer(async(req,res)=>{
  const json=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
  try{
   if(!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host??''))throw fail(403,'Local access only');
   if(req.headers.origin&&!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(req.headers.origin))throw fail(403,'Origin denied');
   if(req.headers['x-glancequeue-client']!=='1')throw fail(403,'Client header required');
   const url=new URL(req.url,'http://localhost');
   if(req.method==='GET'&&url.pathname==='/api/tasks'){
    if(live){let pages=[],cursor;do{const data=await notion('data_sources/'+encodeURIComponent(source)+'/query','POST',{filter:{property:'Done',checkbox:{equals:false}},page_size:100,...cursor?{start_cursor:cursor}:{}});pages.push(...data.results);cursor=data.has_more?data.next_cursor:null;if(pages.length>=500)break;}while(cursor);tasks=pages.filter(p=>p.object==='page').map(p=>({id:p.id,title:Object.values(p.properties).find(v=>v.type==='title')?.title.map(x=>x.plain_text??x.text?.content??'').join('')||'Untitled task',due:p.properties.Due?.date?.start??'',revision:p.last_edited_time}));}
    allowed.clear();tasks.forEach(t=>allowed.add(t.id));return json(200,{mode:live?'Notion':'Demo',tasks:tasks.slice(0,100)});
   }
   const match=/^\/api\/tasks\/([a-zA-Z0-9-]+)\/complete$/.exec(url.pathname);
   if(req.method==='POST'&&match){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>4096)throw fail(413,'Request too large');}let body;try{body=JSON.parse(raw);}catch{throw fail(400,'Invalid JSON');}const id=match[1];if(!allowed.has(id))throw fail(403,'Refresh queue before acting on this task');const task=tasks.find(t=>t.id===id);if(!task)return json(200,{done:true});if(typeof body.revision!=='string'||body.revision!==task.revision)throw fail(409,'Task changed. Refresh and review it again.');
    if(live){const page=await notion('pages/'+id);if(page.parent?.data_source_id?.replaceAll('-','')!==source.replaceAll('-',''))throw fail(403,'Task is outside the configured source');if(!page.properties.Done?.checkbox){if(page.last_edited_time!==body.revision)throw fail(409,'Task changed in Notion. Refresh and review it again.');await notion('pages/'+id,'PATCH',{properties:{Done:{checkbox:true}}});}}
    tasks=tasks.filter(t=>t.id!==id);if(!live)save();return json(200,{done:true});
   }
   throw fail(404,'Not found');
  }catch(error){json(error.status??503,{error:error.status?error.message:'Connection failed. Refresh before retrying.'});}
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const token=process.env.NOTION_TOKEN??'',source=process.env.NOTION_DATA_SOURCE_ID??'';
 if(Boolean(token)!==Boolean(source))throw new Error('Set both NOTION_TOKEN and NOTION_DATA_SOURCE_ID, or neither for demo.');
 const stateFile=path.join(path.dirname(fileURLToPath(import.meta.url)),'.demo-state.json');
 createBackend({token,source,stateFile}).listen(5184,'127.0.0.1',()=>console.log('GlanceQueue backend: http://127.0.0.1:5184 ('+(token?'Notion':'local demo')+')'));
}
