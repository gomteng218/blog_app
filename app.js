var express         = require("express")
    bodyParser      = require("body-parser"),
    mongoose        = require("mongoose"),
    passport        = require("passport"),
    LocalStrategy   = require("passport-local"),
    expressSanitizer= require("express-sanitizer"),
    methodOverride  = require("method-override"),
    User            = require("./models/user"),
    app             = express();


// APP CONFIG
mongoose.connect("mongodb://pil:pilking@ds055525.mongolab.com:55525/pilblog");
//mongoose.connect("mongodb://localhost/blogApp");
app.set("view engine", "ejs");
app.use(express.static("public"));
app.set("port", (process.env.PORT || 3000));
app.use(bodyParser.urlencoded({extended: true}));
app.use(expressSanitizer());
app.use(methodOverride("_method"));


// PASSPORT CONFIG
app.use(require("express-session")({
    secret: "Hello World Yo",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
    res.locals.currentUser = req.user;
    next();
});


// Mongoose model
var blogSchema = new mongoose.Schema({
    title: String,
    image: String,
    content: String,
    created: {
        type: Date,
        default: Date.now
    },
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String
    }
});
var Blog = mongoose.model("Blog", blogSchema);


// RESTful ROUTES

app.get("/", function(req, res){
    res.redirect("/blogs");
});

// INDEX ROUTE
app.get("/blogs", function(req, res){
    Blog.find({}, function(err, blogs){
        if (err){
            console.log("ERROR!");
        } else {
            res.render("index", {blogs: blogs, currentUser: req.user});
        }
    });
});

// NEW ROUTE
app.get ("/blogs/new", isLoggedIn, function(req, res){
    res.render("new");
});
// CREATE ROUTE
app.post("/blogs", isLoggedIn, function(req, res){
    var title = req.body.title;
    var image = req.body.image;
    var content = req.body.content;
    var author = {
        id: req.user._id,
        username: req.user.username
    };
    var newBlog = {title: title, image: image, content: content, author: author};
    // CREATE BLOG
    req.body.blog.content = req.sanitize(req.body.blog.content);
    Blog.create(req.body.blog, function(err, newBlog){
        if(err){
            res.render("new");
        } else {
            console.log(newBlog);
            res.redirect("/blogs");
        }
    });
});

// SHOW ROUTE
app.get("/blogs/:id", function(req, res){
    Blog.findById(req.params.id, function(err, foundBlog){
       if(err){
           res.redirect("/blogs");
       } else {
           res.render("show", {blog: foundBlog});
       }
   });
});

// EDIT ROUTE
app.get("/blogs/:id/edit", isLoggedIn, function(req, res){
    // is user logged in
    if(req.isAuthenticated()){
        Blog.findById(req.params.id, function(err, foundBlog){
            if(err){
                res.redirect("/blogs");
            } else {
                // does user own the blog post? 
               // console.log(foundBlog.author.id);
                //console.log(req.user._id);
                res.render("edit", {blog: foundBlog});
            }
        });
    } else {
        res.send("You need to be logged in to do that!");
    }
        
        // otherwise, redirect
    // if not, redirect
});

// UPDATE ROUTE
app.put("/blogs/:id", isLoggedIn, function(req, res){
    req.body.blog.content = req.sanitize(req.body.blog.content);
    Blog.findByIdAndUpdate(req.params.id, req.body.blog, function(err, updatedBlog){
        if(err){
            res.redirect("/blogs");
        } else {
            res.redirect("/blogs/" + req.params.id);   
        }
    });
});

// DELETE ROUTE
app.delete("/blogs/:id", isLoggedIn, function(req, res){
    // destroy blog
    Blog.findByIdAndRemove(req.params.id, function(err){
        if(err){
            res.redirect("/blogs");
        } else {
            res.redirect("/blogs");
        }
    });
});

// AUTH ROUTES

/* SHOW REGISTER FORM
app.get("/register", function(req, res){
    res.render("register");
});
// HANDLE SIGNUP LOGIC
app.post("/register", function(req, res){
    var newUser = new User({username: req.body.username});
    User.register(newUser, req.body.password, function(err, user){
        if(err){
            console.log(err);
            return res.render("register");
        }
        passport.authenticate("local")(req, res, function(){
            res.redirect("/blogs");
        });
    });
});*/

// SHOW LOGIN FORM
app.get("/login", function(req, res){
    res.render("login");
});

// HANDING LOGIN LOGIC
app.post("/login", passport.authenticate("local", 
    {
        successRedirect: "/blogs",
        failureRedirect: "/login"
    }), function(req, res){  
});

// LOGOUT ROUTE
app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/blogs");
});

function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect("/login");
}

app.listen(app.get("port"), function(){
    console.log("SERVER IS RUNNING", app.get("port"));
});