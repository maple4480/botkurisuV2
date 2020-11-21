class Database {
    constructor(SERVICE_ACCOUNT, dbRef) {
        try{
            console.log("initializing database.");

            const admin = require('firebase-admin');
            admin.initializeApp({
                credential: admin.credential.cert(JSON.parse(SERVICE_ACCOUNT)),
                databaseURL: "https://kurisudata.firebaseio.com"
            });
            this.db = admin.database();
            this.userRef = this.db.ref(dbRef);
        }catch(error){
            console.log("Issue initializing database: "+error.message);
        }
    }
    addSong(obj){
        try{
            console.log("Updating database with new song information.");
            var one = this.userRef.child(obj.id);
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
                        console.log("Increasing count of count by 1.");
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
                //Updates the Database
                console.log("Updating database with new data: "+newData);
                one.update(newData,(err)=>{
                    if(err){
                        console.log("Error with update: "+err)
                    }
                    else{
                        console.log("Song added to database.")
                    }
                });
            });
        }catch(error){
            console.log("Error adding song to db: "+error.message);
        }
    }
}

//export Database so other modules can use
exports.Database = Database;