var mongoose= require("mongoose");

var addMaterialSchema= mongoose.Schema({
    linkToTopic:{
        type: String,
        required: true},

    Topic:{
        type: String,
        required: true
    }
    
   
    
});

module.exports =mongoose.model("MaterialAdd",addMaterialSchema);