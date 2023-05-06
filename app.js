if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const express = require("express")
const app = express();

const mongoose = require("mongoose");
const passport = require("passport");
const Localstrategy = require("passport-local");
const discussion = require("./models/discussion");
const methodoverride = require("method-override");
const comment = require("./models/comment");
const MaterialAdd = require("./models/MaterialAdd");
const flash = require("connect-flash");
const User = require("./models/user");
const suggestion = require("./models/suggestion");
const MongoDBStore = require('connect-mongo');
const seedDB = require("./seed");
const ejsMate = require('ejs-mate');

const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/CodeFarm';
mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    //useCreateIndex: true,
    useUnifiedTopology: true,
    //useFindAndModify: false,
});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public"));
app.use(methodoverride("_method"));
app.use(flash());

//seedDB();
const secret = process.env.SECRET || 'thisshouldbeabettersecret!';
const store = MongoDBStore.create({
    mongoUrl: dbUrl,
    secret,
    touchAfter: 24 * 60 * 60
});

store.on("error", function (e) {
    console.log("SESSION STORE ERROR", e)
})
//passport configuration
app.use(require("express-session")({
    store,
    secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7,
    }
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new Localstrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});




app.get("/", function (req, res) {

    console.log("request for landing page");
    res.render("landing");
});

app.get("/discussions", async function (req, res) {

    console.log("request for discussion page");
    await discussion.find({}, function (err, alldiscussion) {
        if (err) {
            console.log("something went wrong");
        } else {
            res.render("discussion/index", { discussion: alldiscussion });
        }
    });
});
//adding discussion to discussion model
app.post("/discussions", isLoggedIn, async function (req, res) {
    //excess data from the form
    var topic = req.body.topic;
    var question = req.body.question;
    var author = {
        id: req.user._id,
        username: req.user.username
    }
    var newdiscussion = { topic: topic, question: question, author: author };

    //add data to data base
    await discussion.create(newdiscussion, function (err, discuss) {
        if (err) {
            console.log(err);
        } else {
            //redirect the discussions page
            res.redirect("/discussions");
        }
    });
});
//new page to add discussion
app.get("/discussions/new", isLoggedIn, function (req, res) {
    res.render("discussion/new.ejs");
    console.log("Request for form page to add discussion!!");
});

//show rout description of a particular object in brief
app.get("/discussions/:id", async function (req, res) {
    //find the topics with provide id
    await discussion.findById(req.params.id).populate("comments").exec(function (err, founddiscussion) {
        if (err) {
            console.log("something went wrong");
            console.log(err);
        } else {
            //render show tempelate with that id
            res.render("discussion/show.ejs", { discussion: founddiscussion });
        }
    });

});


//edit discussion route
app.get("/discussions/:id/edit", checkdiscussionOwnership, async function (req, res) {
    await discussion.findById(req.params.id, function (err, founddiscussion) {
        res.render("discussion/edit", { discussion: founddiscussion });
    });
});

//update discussion route
app.put("/discussions/:id", checkdiscussionOwnership, async function (req, res) {
    //find and update the correct discussion and redirect
    await discussion.findByIdAndUpdate(req.params.id, req.body.discussion, function (err, updateddiscussion) {
        if (err) {
            res.redirect("/discussions");
        } else {
            res.redirect("/discussions/" + req.params.id);
        }
    })
});

//destroy champground
app.delete("/discussions/:id", checkdiscussionOwnership, async function (req, res) {
    //res.send("you are trying to delet it"); 
    await discussion.findByIdAndRemove(req.params.id, function (err,) {
        if (err) {
            res.redirect("/discussions");
        } else {
            res.redirect("/discussions");
        }
    });
});





app.get("/discussions/:id/comments/new", isLoggedIn, async function (req, res) {
    await discussion.findById(req.params.id, function (err, discussion) {
        if (err) {
            console.log("something went wrong");
        } else {
            res.render("comments/new", { discussion: discussion });
        }
    });
});

app.post("/discussions/:id/comments", isLoggedIn, async function (req, res) {
    await discussion.findById(req.params.id, function (err, discussion) {
        if (err) {
            console.log(err);
            res.redirect("/discussions");
        } else {
            comment.create(req.body.comment, function (err, comment) {
                if (err) {
                    req.flash("error", "Something went wrong,Try again!!");
                    console.log(err);
                } else {
                    comment.author.username = req.user.username;
                    comment.author.id = req.user._id;
                    comment.save();

                    discussion.comments.push(comment);
                    discussion.save();
                    res.redirect("/discussions/" + discussion._id);
                    req.flash("success", "Successfully added Comment");
                    console.log(comment);
                }
            })

        }
    });
});


//=============================================
//comment delet and edit route
//=============================================
//comment form display
app.get("/discussions/:id/comments/:comment_id/edit", checkCommentOwnership, async function (req, res) {
    await comment.findById(req.params.comment_id, function (err, foundcomment) {
        if (err) {
            res.redirect("back");
        } else {
            res.render("comments/edit", { discussion_id: req.params.id, comment: foundcomment });
        }
    })

});
//comment put request
app.put("/discussions/:id/comments/:comment_id", checkCommentOwnership, async function (req, res) {
    await comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function (err, updatedcomment) {
        if (err) {
            req.flash("error", "Something went wrong,Try again!!");
            res.redirect("back");
        } else {
            res.redirect("/discussions/" + req.params.id);
        }
    });
});
//comment delet
app.delete("/discussions/:id/comments/:comment_id", checkCommentOwnership, async function (req, res) {
    //find by id and remove
    await comment.findByIdAndRemove(req.params.comment_id, function (err) {
        if (err) {
            res.redirect("back");
        } else {
            req.flash("success", "Comment deleted");
            res.redirect("/discussions/" + req.params.id);
        }
    });
});




//show register form
app.get("/register", function (req, res) {
    res.render("register");
});

//responsible for user singup logic
app.post("/register", function (req, res) {
    var newUser = new User({ username: req.body.username });

    User.register(newUser, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            req.flash("error", err.message);
            return res.render("register");
        }
        passport.authenticate("local")(req, res, function () {
            //req.flash("success","Welcome to MYSELF "+user.username);
            res.redirect("/");
        });
    });
});

//show login form
app.get("/login", function (req, res) {
    res.render("login");
});
//login logic
//app.post("/ogin",middleware,callback)
app.post("/login", passport.authenticate("local", {
    failureFlash: true,
    failureRedirect: "/login"
}), function (req, res) {
    req.flash('success', 'welcome back');
    const redirectUrl = req.session.returnTo || '/';
    delete req.session.returnTo;
    res.redirect(redirectUrl);

});

//logout
app.get("/logout", function (req, res) {
    req.logOut();
    //req.flash("success","Logged you out!!")
    res.redirect("/");
});


//=================================
//collection
//=================================
app.get("/col/new", isLoggedIn, function (req, res) {
    console.log(req.user);
    res.render("collections/new");
})
app.post("/col", isLoggedIn, function (req, res) {

    var newcol = { link: req.body.link, rating: req.body.rating, platform: req.body.platform, qname: req.body.qname }
    req.user.col.push(newcol);
    req.user.save();
    console.log(req.user);
    res.redirect("/col");

})
app.get("/col", isLoggedIn, function (req, res) {
    res.render("collections/show");
})

//=================================
app.delete("/col/:id", function (req, res) {

    var i = 0, po = 0;
    req.user.col.forEach(function (mycol) {
        if (mycol._id.equals(req.params.id)) {
            req.user.col.splice(i, 1);
            po = 1;
            console.log(req.user);
            req.user.save();
            return res.redirect("/col");
        }
        else {
            i++;
        }
    });
    if (po == 0) {
        console.log("NOT FOUND");
        res.redirect("/col");
    }

});



app.get("/material/addMaterial", isModerator, async function (req, res) {
    console.log("request for addmaterials page");
    await suggestion.find({}, function (err, allsuggestion) {
        if (err) {
            console.log("something went wrong");
        } else {
            res.render("material/addMaterial", { suggestion: allsuggestion });
        }
    });
});

app.post("/material/addMaterial", isModerator, function (req, res) {
    var newmat = { linkToTopic: req.body.link, Topic: req.body.Topic };
    MaterialAdd.create(newmat, function (err, discuss) {
        if (err) {
            console.log(err);
        } else {
            //redirect back to the same page
            res.redirect("/materials");
            console.log(discuss);
        }
    })

});

function isModerator(req, res, next) {
    if (req.isAuthenticated()) {
        if (req.user.role === 'moderator') {
            return next();
        }
        req.flash("error", "You need to be logged in as moderator to do that");
        res.redirect("/materials");
    }
    else {
        req.session.returnTo = req.originalUrl;
        req.flash("error", "You need to be logged in to do that");
        res.redirect("/login");
    }

}




app.get("/material/addsuggestions", isLoggedIn, function (req, res) {
    console.log("request for suggestion page");
    suggestion.find({}, function (err, allsuggestion) {
        if (err) {
            console.log("something went wrong");
        } else {
            res.render("material/addsuggestions", { suggestion: allsuggestion });
        }
    });
});

app.post("/material/addsuggestions", isLoggedIn, function (req, res) {
    var newsug = { text: req.body.suggestion, topic: req.body.topic }
    suggestion.create(newsug, function (err, suggestion) {
        if (err) {
            req.flash("error", "Something went wrong,Try again!!");
            console.log(err);
        } else {
            suggestion.author.username = req.user.username;
            suggestion.author.id = req.user._id;
            suggestion.save();



            res.redirect("/material/addsuggestions");
            req.flash("success", "Successfully added suggestion");
            console.log(suggestion);
        }
    })

});



//comment delet
app.delete("/material/addsuggestions/:suggestion_id", checkSuggestionOwnership, function (req, res) {

    suggestion.findByIdAndRemove(req.params.suggestion_id, function (err) {
        if (err) {
            res.redirect("back");
        } else {
            req.flash("success", "Comment deleted");
            res.redirect("/material/addsuggestions");
        }
    });
});

//====================================
//isloggedin check
//====================================
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
        //console.log(User);
    }
    //console.log();
    req.session.returnTo = req.originalUrl;
    req.flash("error", "You need to be logged in to do that");
    res.redirect("/login");
};


//function check the discussion belongs to owner??
function checkdiscussionOwnership(req, res, next) {
    if (req.isAuthenticated()) {
        discussion.findById(req.params.id, function (err, founddiscussion) {
            if (err) {
                res.redirect("back");
            } else {
                //does the user owned champground
                if (founddiscussion.author.id.equals(req.user._id) || req.user.role === 'moderator') {
                    next();
                }
                //otherwise redirect
                else {
                    req.flash("error", "You dont have permission to do that");
                    res.redirect("back");
                }
            }
        });
    } else {
        req.flash("error", "You dont have permission to do that");
        res.redirect("back");
    }
}

//check comment ownership
function checkCommentOwnership(req, res, next) {
    if (req.isAuthenticated()) {
        comment.findById(req.params.comment_id, function (err, foundComment) {
            if (err) {
                req.flash("error", "Comment not found");
                res.redirect("back");
            } else {
                //does the user owned comment
                if (foundComment.author.id.equals(req.user._id) || req.user.role === 'moderator') {
                    next();
                }
                //otherwise redirect
                else {
                    req.flash("error", "You dont have permission to do that");
                    res.redirect("back");
                }
            }
        });
    } else {
        res.redirect("back");
    }
}


function checkSuggestionOwnership(req, res, next) {
    if (req.isAuthenticated()) {
        suggestion.findById(req.params.suggestion_id, function (err, foundsuggestion) {
            if (err) {
                req.flash("error", "Suggestion not found");
                res.redirect("back");
            } else {
                //does the user owned comment
                if (foundsuggestion.author.id.equals(req.user._id) || req.user.role === 'moderator') {
                    next();
                }
                //otherwise redirect
                else {
                    req.flash("error", "You dont have permission to do that");
                    res.redirect("back");
                }
            }
        });
    } else {
        res.redirect("back");
    }
}


app.get("/materials", function (req, res) {
    var count = 0;
    console.log("request for material page");
    MaterialAdd.find({}, function (err, allmaterial) {
        if (err) {
            console.log("something went wrong")
        }
        else {
            res.render("material", { allmaterial: allmaterial, count: count });
        }
    });
});


const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`listening on port ${port}!!`);
})
