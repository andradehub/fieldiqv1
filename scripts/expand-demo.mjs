import {createDatabase} from '../server/db.mjs';
import {seedDemoExtra} from '../server/demo-extra.mjs';
const db=await createDatabase();try{if(!db.demo)throw Error('Esta operação é exclusiva de uma base demonstrativa.');const result=await db.transaction(tx=>seedDemoExtra(tx,process.env.DEMO_PASSWORD??'tk2026'));console.log(JSON.stringify(result));}finally{await db.close();}
