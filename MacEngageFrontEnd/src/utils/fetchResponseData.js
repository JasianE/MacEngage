

export async function getLiveData(){
    try {
        const data = await fetch(`https://us-central1-macengage2026.cloudfunctions.net/api/live/current?deviceId=handwashpi`, {headers: {
            "Content-Type": "application/json",
        }});
        const result = await data.json();
        
        return result;
    } catch(err){
        console.log(err);
    }
}