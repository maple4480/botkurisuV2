class ClashOfClan{
    constructor(AUTHORIZATION_TOKEN) {
        this.AUTHORIZATION_TOKEN = AUTHORIZATION_TOKEN;
    }
    
    getPlayerInfo(){
        var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

        var tokenReq = new XMLHttpRequest();
        var base = "https://api.clashofclans.com/v1/players/%23Y08GG9L9";

        tokenReq.open("GET", base, true); 

        tokenReq.setRequestHeader("Authorization", "Bearer "+AUTHORIZATION_TOKEN);

        tokenReq.addEventListener("load", ()=>{
            if(tokenReq.status >= 200 && tokenReq.status < 400){
               var response = JSON.parse(tokenReq.responseText);
               return response;
            }
            else{
                console.log("Network error: "+tokenReq.status); 
            }
    
        });//end load function
        tokenReq.send("grant_type=client_credentials");
    }
}
//export ClashOfClan so other modules can use
exports.ClashOfClan = ClashOfClan;