  
var mongoose= require("mongoose");

var commentSchema= mongoose.Schema({
    text:String,
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

module.exports =mongoose.model("Comment",commentSchema);