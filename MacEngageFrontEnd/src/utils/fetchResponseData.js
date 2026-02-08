

export async function getLiveData(){
    try {
        const data = await fetch("https://jsonplaceholder.typicode.com/todos/1");
        const result = await data.json();
        
        return {time: 3, engagementValue: Math.random() * 100};
    } catch(err){
        console.log(err);
    }
}