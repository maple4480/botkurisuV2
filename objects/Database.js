export default class Database {
    constructor(db_ref){
        this.db_ref = db_ref;
    }

    DB_add(obj){
        console.log("Updating database with new song information.");
        var one = this.db_ref.child(obj.id);
        var count =1;
        console.log("Scanning database for song ID: "+obj.id);
    
        //Check if url exists already in database if so just increment count by 1 otherwise 0
        one.once("value", function(snapshot) {
            //If it does exist it will return a snapshot.val().url with correct URL otherwise.. it will contain null
            console.log("Database found: "+snapshot.val() );
            if(snapshot.val() ){
                console.log("It exists in the database.");
                console.log("Current count is: "+snapshot.val().count);
    
                if( snapshot.val().count > 0 ){
                    console.log("Increasing count of count by 1:"+snapshot.val().count);
                    count = snapshot.val().count +1
                    console.log("count is now set to: "+count);
                }
            }
            else{ //Null goes here
                console.log("It does not exist in the database. Defaulting count to 1.");
            }
            var newData = {
                id: obj.id,
                title: obj.title,
                url: obj.url,
                count: count
            }
            //console.log("newData is: "+ newData);
            var two = this.db_ref.child(obj.id);
            //Updates the Database
            console.log("Updating database with new data: "+newData);
            two.update(newData,(err)=>{
                if(err){
                    console.log("Error with update: "+err)
                }
                else{
                    console.log("Song added to database.")
                }
            });
        });
    }

}