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
            this.currencyRef = this.db.ref(dbRef+"_currency");
        }catch(error){
            console.log("Issue initializing database: "+error.message);
        }
    }
    getTopSongs(){
        try{
            console.log("Trying to get top songs...");
            var queryRef = this.userRef.orderByChild('/count').limitToFirst(10);
            queryRef.on("value",function(querySnap){
                var songList = [];
                querySnap.forEach(function(snapshot){
                    //Add snapshot.title to songList
                    songList.push(snapshot.title);
                });
                return songList;
            });
        }catch(error){
            console.log("Error getting top songs from DB: "+error.message);
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
    async getCurrency(id){
        try{
            console.log("Updating database with new currency");
            var one = this.currencyRef.child(id);
            var currentTot = 0;
            console.log("Scanning database for user ID: "+id);
        
            //Check if user exists
            await one.once("value", function(snapshot) {
                //If it does exist it will return a snapshot.val().url with correct URL otherwise.. it will contain null
                console.log("Database found: "+snapshot.val() );
                if(snapshot.val() ){
                    console.log("It exists in the database.");
                    console.log("Current currency amount is: "+snapshot.val().total);
                    currentTot = snapshot.val().total;
                }
                else{ //Null goes here
                    console.log("It does not exist in the database.");
                }
            });
            return currentTot;
        }catch(error){
            console.log("Error adding currency to db: "+error.message);
        }
    }
    async addCurrency(id, amount,addSub){ //obj = {id}
        var updatedTotal = amount;
        try{
            console.log("Updating database with new currency");
            var one = this.currencyRef.child(id);
            
            console.log("Scanning database for user ID: "+id);
        
            //Check if user exists
            await this.currencyRef.child(id).once("value", function(snapshot) {
                //If it does exist it will return a snapshot.val().url with correct URL otherwise.. it will contain null
                console.log("Database found: "+snapshot.val() );
                if(snapshot.val() ){
                    console.log("It exists in the database.");
                    console.log("Current currency amount is: "+snapshot.val().total);
                    console.log("Does addSub exist: "+addSub);
                    if(addSub!==undefined){
                        updatedTotal=snapshot.val().total - updatedTotal;
                    }else{
                        updatedTotal+=snapshot.val().total;
                    }
                    console.log("Will update the total to: "+updatedTotal);
                }
                else{ //Null goes here
                    console.log("It does not exist in the database.");
                }
                var newData = {
                    id: id,
                    total: updatedTotal
                }
                //Updates the Database
                console.log("Updating database with new data: id-"+newData.id+" total-"+newData.total);
                one.update(newData,(err)=>{
                    if(err){
                        console.log("Error with update: "+err)
                    }
                    else{
                        console.log("Currency added to database.")
                    }
                });
            });
            return updatedTotal;
        }catch(error){
            console.log("Error adding currency to db: "+error.message);
        }        
    }
    setDailyDate(id,date){
        console.log("Setting the lastdailydate to: "+date);
        var newData = {
            id: id,
            lastDailyDate: date
        }
        //Updates the Database
        console.log("Updating database with new data: id-"+newData.id+" date-"+newData.lastDailyDate);
        this.currencyRef.child(id).update(newData,(err)=>{
            if(err){
                console.log("Error with update: "+err)
            }
            else{
                console.log("Currency added to database.")
            }
        });
    }
    async getLastDailyDate(id){
        try{
            console.log("Scanning database for user ID: "+id);
            //Check if user exists
            let foundDate = null;
            await this.currencyRef.child(id).once("value", function(snapshot) {
                //If it does exist it will return a snapshot.val().url with correct URL otherwise.. it will contain null
                console.log("Database found: "+snapshot.val() );
                if(snapshot.val() ){
                    console.log("It exists in the database.");
                    console.log("Last daily date: "+snapshot.val().lastDailyDate);
                    if(snapshot.val().lastDailyDate){
                        console.log("Return lastdailydate");
                        foundDate= snapshot.val().lastDailyDate;
                    }
                }
                else{ //Null goes here
                    console.log("It does not exist in the database.");
                }
            });
            if(foundDate){
                console.log("Found a date and returning: "+foundDate);
                return foundDate;
            }
            return null;
        }catch(error){
            console.log("Error getting date from db: "+error.message);
        }   
    }
}

//export Database so other modules can use
exports.Database = Database;