
export async function writeComment(comment){
    try{
        await fetch("http://192", { // non-relational, so just save the document
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                content: comment.content,
                id: comment.id
            })
    })
    } catch(err){
        console.log(err);
    }
}

export async function startMachine(){
    try {
        const response = await fetch("https://us-central1-macengage2026.cloudfunctions.net/api/start", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ "deviceId": "handwashpi" })
        })
        const data = await response.json();
        return data;
    } catch(err){
        console.log(err);
    }
}

export async function endMachine(){
    try {
        const response = await fetch("https://us-central1-macengage2026.cloudfunctions.net/api/end", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ "deviceId": "handwashpi" })
        })
        const data = await response.json();
        return data;
    } catch(err){
        console.log(err);
    }
}