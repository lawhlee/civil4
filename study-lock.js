// Serialize synchronous read/modify/write operations across tabs.
const Civil4Lock=(()=>{
 const name='civil4-objective-study-write';
 let database;
 function open(){
  if(!database)database=new Promise((resolve,reject)=>{
   const request=indexedDB.open(name,1);
   request.onupgradeneeded=()=>request.result.createObjectStore('lock');
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error);
  });
  return database;
 }
 async function run(action){
  if(navigator.locks)return navigator.locks.request(name,action);
  let db;
  try{db=await open();}catch{
   // Private browsing may disable both coordination APIs.
   return action();
  }
  return new Promise((resolve,reject)=>{
   const transaction=db.transaction('lock','readwrite');
   const request=transaction.objectStore('lock').get('writer');
   request.onsuccess=()=>{try{action();}catch(error){transaction.abort();reject(error);}};
   transaction.oncomplete=resolve;
   transaction.onabort=()=>reject(transaction.error);
  });
 }
 return {run};
})();
