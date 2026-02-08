

export async function getLiveData({sessionId}){
    try {
        const data = await fetch(`https://us-central1-macengage2026.cloudfunctions.net/api/live/${sessionId}`);
        const result = await data.json();
        
        return result;
    } catch(err){
        console.log(err);
    }
}