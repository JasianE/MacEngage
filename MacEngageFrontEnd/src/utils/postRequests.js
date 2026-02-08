
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