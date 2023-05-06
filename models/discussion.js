var mongoose= require("mongoose");

//SCHEMA setup
var discussiondSchema= new mongoose.Schema({
    topic: String,
    question: String,
    author:{
            id:{
                type:mongoose.Schema.Types.ObjectId,
                ref:"User"
                },
            username:String,
            role:String
        },
    comments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment"
        }
    ]
});

//setupsvhema to a model
module.exports=mongoose.model("discussion",discussiondSchema);