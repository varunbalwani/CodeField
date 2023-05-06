var mongoose=    require("mongoose");
var Localstrategy=require("passport-local-mongoose");

var UserSchema = new mongoose.Schema({
    username:{
        type: String
    },

    password:{
        type: String
    },

    role:{
        type: String,
        default:'normal'
    },

    
    col:[
        {
            link:String,
            rating:String,
            platform:String,
            qname:String
        }
    ]
});

UserSchema.plugin(Localstrategy);
module.exports =mongoose.model("User",UserSchema);