  
var mongoose= require("mongoose");

var suggestionSchema= mongoose.Schema({
    text:String,
    topic:String,
    time1:{
        type:String,
        default:new Date().toISOString().slice(0,10)
    },
    author:{
        id:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"
        },
        username:String,
        role:String
        }
});

module.exports =mongoose.model("suggestion",suggestionSchema);