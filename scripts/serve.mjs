import {loadEnvFile} from 'node:process';
import {resolve} from 'node:path';
import {randomInt} from 'node:crypto';
import {createGuideServer} from '../server/http.mjs';
try{loadEnvFile(resolve(import.meta.dirname,'../.env.local'));}catch(error){if(error.code!=='ENOENT')throw new Error('Could not read .env.local. Check its format.');}
const pairCode=String(randomInt(10000000,100000000));
const apiKey=process.env.MODEL_API_KEY?.trim()??'';
const server=createGuideServer({apiKey,model:process.env.META_MODEL||'muse-spark-1.3',pairCode});
server.listen(4317,'127.0.0.1',()=>{
  console.log('Try My Future: http://127.0.0.1:4317');
  console.log(apiKey?'Muse Spark key configured. An actual question will check model access.':'Muse Spark needs setup: run powershell -File scripts/setup-ai.ps1');
  console.log(`Android USB pairing code: ${pairCode}`);
  console.log('Run adb reverse tcp:4317 tcp:4317, then enter this code in the app’s Glasses settings.');
  console.log('Local demo limit: 100 model requests per server run; 12/minute, 2 concurrent.');
});
