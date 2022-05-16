require('dotenv').config()

// Require packages for project
const express = require('express')
const mysql = require('mysql')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')

// Port number and JWT secret key
const PORT = process.env.PORT
const SECRET_ACCESS_KEY = process.env.SECRET_ACCESS_KEY
const SECRET_REFRESH_KEY = process.env.SECRET_REFRESH_KEY

// Create connection to database
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: '',
    database: 'nodemysql'
})
// Connect to database
db.connect(err => {
    if(err){
        throw err;
    }
    console.log("MySQL Connected");
})

// Setup server and directory of views
const app = express()
app.use(bodyParser.urlencoded({extended: false}))
app.use(cookieParser())
app.use(express.json())
app.set('views', './public/views')
app.set('view engine', 'ejs')

// Redirect To Main Page
app.route('/')
.get((req, res) => {
    var currentDate = new Date();
    var dd = String(currentDate.getDate()).padStart(2, '0');
    var mm = String(currentDate.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = currentDate.getFullYear();

    currentDate = yyyy + "-" + mm + "-" + dd;
    return res.redirect('/main/' + currentDate)
})

//TODO: Make password case sensitive

// Sign In Page Requests
app.route('/signin')
// Render Sign In Page
.get((req, res) => {
    // Render the sign in page with a phrase
    return res.render('signin', {phrase: get_phrase()})
})
// Sign In User
.post((req, res) => {
    var currentDate = new Date();
    var dd = String(currentDate.getDate()).padStart(2, '0');
    var mm = String(currentDate.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = currentDate.getFullYear();

    currentDate = yyyy + "-" + mm + "-" + dd;

    // Get username and password from sign in page
    const user = req.body.user
    const pass = req.body.pass

    // Search database for user and password
    let sql = `SELECT id FROM users WHERE BINARY password = '${pass}' AND username = '${user}'`
    let query = db.query(sql, (err, results) => {
        // If query returns an error
        if(err){
            // Render sign in page with phrase and error
            errormessage = "An Error Occurred!"
            return res.render('signin', {phrase: get_phrase(), errormessage: errormessage})
        } 
        // If query is successful
        else{
            // Ensure there is a user id and get the user id from database
            var id = results.length != [] && results[0].id
            // If user id exists
            if(id){
                // Send user a cookie with JWT containing 
                // access token along with a refresh token
                res.cookie(
                    "access_token", jwt.sign({id: id, user: user, pass: pass}, SECRET_ACCESS_KEY), {maxAge: '1800000',
                    httpOnly: true}
                )
                res.cookie(
                    "refresh_token", jwt.sign({id: id, user: user, pass: pass}, SECRET_REFRESH_KEY), {maxAge: '600000000',
                    httpOnly: true}
                )
                // Render to main
                return res.redirect('/main/' + currentDate)
            }
            // If id doesn't exist
            else{
                // Render sign in page with phrase and error
                errormessage = "No Match Found!"
                return res.render('signin', {phrase: get_phrase(), errormessage: errormessage})
            }
        }
    })
})
// Sign In Page From URL
app.route('/signin/:previousrequest')
.get((req, res) =>{

    let message = req.params.previousrequest

    // Clear user's cookies and send back to sign in page
    res.clearCookie("access_token")
    res.clearCookie("refresh_token")
    // Render the sign in page with a phrase
    if (message == "signedoutfrommain"){
        return res.render('signin', {phrase: get_phrase(), errormessage: "Signed Out Successfully!"})
    }
    else if (message == "notverified"){
        return res.render('signin', {phrase: get_phrase(), errormessage: "You Need To Sign In Again!"})
    }
})


// Sign Up Page Requests
app.route('/signup')
// Render Sign Up Page
.get((req, res) => {
    // Render sign up page
    return res.render('signup')
})
// Sign Up User
.post((req, res) => {
    // Get username, password and email from sign up page
    var user = req.body.user
    var pass = req.body.pass
    var email = req.body.email

    // Search database for user or email
    let sql = `SELECT id from users WHERE username = '${user}' OR email = '${email}'`
    let query = db.query(sql, (err, results) => {
        // If query returns an error
        if(err){
            // Render sign up page with error
            errormessage = "Something Went Wrong!"
            res.render('signup', {errormessage : errormessage})
        }
        // If query is successful
        else{
            // If any results were found from query (meaning such account exists)
            if (results.legnth > 0){
                // Render sign up page with error
                errormessage = "Account Already Exists!"
                return res.render('signup', { errormessage : errormessage})
            }
            // If no results were found from query (meaning no such account exists)
            else{
                // Post user information to MySQL to create account
                let post = {id: 'AUTO INCREMENT', username: user, password: pass, email: email}
                let sql = 'INSERT INTO users SET ?'
                let query = db.query(sql, post, (err, results) => {
                    // If error occurs, most likely means account already exists
                    if(err){
                        errormessage = "Account Already Exists!"
                        return res.render('signup', { errormessage : errormessage})
                    }
                    // Otherwise, user was created and has to sign in
                    else{
                        return res.redirect('/signin')
                    }
                })
            }
        }
    })
});


// Main Page Requests
app.route('/main/:date')
// Render Main Page With Data From Date Parameter
.get(authenticate_user, (req, res) =>{
    // Variables to set user selected date
    var yyyy = req.params.date.split('-')[0]
    var mm = req.params.date.split('-')[1]
    var dd = req.params.date.split('-')[2]
    selectedDate = yyyy + mm + dd

    // Query for data with user selected date and user id
    let sql = `SELECT * FROM foods WHERE date = '${selectedDate}' AND id = '${req.access_token_data.id}' `
    let query = db.query(sql, (err, results) => {
        // If query returns an error
        if(err){
            // Render main page with error
            errormessage = "An Error Occurred While Getting Your Logs! Try Reloading Your Page!"
            return res.render('main', { log: errormessage })
        }
        // If query is successful
        else{
            // Set month variable to three letter abbreviation
            let month = month_from_number(parseInt(mm) - 1)

            // If there are posts for today
            if(results.length > 0){
                return res.render('main', 
                { 
                    logs: results, 
                    day: dd, 
                    month: month, 
                    year: yyyy 
                })
            }
            // Otherwise
            else if (results.length == 0){
                var today = new Date()
                var today = String(today.getDate()).padStart(2, '0');
                // Check if date user queried is not today
                if (dd != today){
                    return res.render('main', 
                    { 
                        log: "There Are No Posts For This Day!", 
                        day: dd,
                        month: month, 
                        year: yyyy 
                    })
                }
                // Otherwise
                else{
                    return res.render('main', 
                    { 
                        log: "There Are No Posts For Today!", 
                        day: dd, 
                        month: month, 
                        year: yyyy 
                    })
                }
            }
        }
    })
})


// TODO: Optimize search process
app.route('/getFood/:food')
// Get Search Results Based On User Search Parameters
.get((req, res) => {
    // User search stored in variable food
    let food = req.params.food
    // Query for data with user searched food
    let sql = `SELECT food FROM fooddb WHERE food LIKE '%${food}%' `
    let query = db.query(sql, (err, results) => {
        // If query returns an error
        if(err){
            return res.send("An Error Occured While Searching For Your Results")
        }
        // If query is successful
        else{
            if (results.length > 0) {
                // Add foods into an array
                let foods = []
                var i = 0
                while ( i < 10 && i < results.length) {
                    foods.push(results[i].food)
                    i += 1
                }
                // Send array to display to user
                return res.send(foods)
            }
            else {
                // Send message to user
                return res.send("No Results Matching Your Search Were Found!")
            }
        }
    })
})


// Get Selected Food Item Data
app.route('/addFood/:food')
// Get the food and its information
.get((req, res) => {
    // User search stored in variable food
    let food = req.params.food
    // Query for data with user searched food
    let sql = `SELECT * FROM fooddb WHERE food = '${food}' `
    let query = db.query(sql, (err, results) => {
        // If query returns an error
        if(err){
            res.send("There was an error")
        }
        // If query is successful
        else{
            res.send(results)
        }
    })
})
.post(authenticate_user, (req, res) => {
    // Set all of the data varaibles for inputting food item
    let id = req.access_token_data.id
    let date = req.body.date.split("-")[0] + req.body.date.split("-")[1] + req.body.date.split("-")[2]
    let food = req.body.food
    let servings = parseInt(req.body.servings)
    if(isNaN(servings)){
        servings = 1
    }
    let calories = parseInt(req.body.calories)
    let fat = parseInt(req.body.fat)
    let protein = parseInt(req.body.protein)
    let carbohydrate = parseInt(req.body.carbohydrate)
    
    // Check if any of the data is invalid

    // Insert data into foods table
    let sql = `INSERT INTO foods(id, date, food, servings, calories, fat, protein, carbohydrate) VALUES ('${id}','${date}','${food}','${servings}','${calories}','${fat}','${protein}','${carbohydrate}')`
    let query = db.query(sql, (err, results) => {
        // If query returns an error
        if(err){
            res.send("error")
        }
        // If query is successful
        else{
            res.send("success")
        }
    })
})


// Delete Log Request
app.route('/deletelog/:food&:date')
.post(authenticate_user, (req, res) => {
    // Set variables to search for row to delete
    let id = req.access_token_data.id
    let food = req.params.food
    let selectedDate = req.params.date
    
    // Search database id, date, and food
    let sql = `DELETE FROM foods WHERE id = '${id}' AND date = '${selectedDate}' AND food = '${food}' LIMIT 1`
    db.query(sql, (err, results) => {
        // If query returns an error
        if(err){
            // Redirect main page
            return res.send("error")
        }
        // If query is successful
        else{
            return res.send("success")
        }
    })
})


// Analytics Page
app.route('/analytics/:month')
.get(authenticate_user, (req, res) => {
    // Initialize all variables
    id = req.access_token_data.id
    
    var currentDate = new Date();
    var yyyy = currentDate.getFullYear();
    date = yyyy + req.params.month

    dates = []
    calories = []
    fats = []
    proteins = []
    carbs = []
    servings = []

    let sql = `SELECT * FROM foods WHERE date LIKE '%${date}%' and id = '${id}' ORDER BY CAST(date as SIGNED INTEGER) ASC`
    let query = db.query(sql, (err, results) => {
        // If query returns an error
        if(err){
            res.end()
        } 
        // If query is successful
        else{
            // Get all data points for every day of selected month
            for (var i = 0; i < results.length; i++) {
                dates.push(parseInt(results[i].date.substring(6,8)))
                servings.push(results[i].servings)
                calories.push(results[i].calories * results[i].servings)
                fats.push(results[i].fat * results[i].servings)
                proteins.push(results[i].protein * results[i].servings)
                carbs.push(results[i].carbohydrate * results[i].servings)
            }
            // Match all dates and their respective information to display total daily info
            for ( var i = 0; i < dates.length; i++) {
                if (dates[i] == dates[i + 1]) {
                    dates.splice(i + 1, 1)

                    calories[i] += calories[i + 1]
                    calories.splice(i + 1, 1)

                    fats[i] += fats[i + 1]
                    fats.splice(i + 1, 1)

                    proteins[i] += proteins[i + 1]
                    proteins.splice(i + 1, 1)

                    carbs[i] += carbs[i + 1]
                    carbs.splice(i + 1, 1)
                }
            }
            // Render Page and send data
            res.render('analytics', {
                dates: dates,
                fats: fats,
                proteins: proteins,
                carbs: carbs,
                servings: servings,
                month: month_from_number(parseInt(req.params.month) - 1)
            })
        }
    })
})


// Log Out Request
app.route('/signout')
.post((req, res) => {
    // Send back to sign in page
    return res.redirect('/signin/signedoutfrommain')
})




/**
 * function: authentication_user
 * 
 * description: middleware to authenticate user through JWT stored in cookies
 * 
 * returns: creates req.access_token_data varaible if user was authenticated
 *          returns to 'signin' page if user JWTs are invalid
 * 
 * note: get user data from function with req.access_token_data.variable
 */
function authenticate_user(req, res, next) {
    // Check if access_token cookie exists
    if (req.cookies.access_token){
        // Then verify access_token
        jwt.verify(req.cookies.access_token, SECRET_ACCESS_KEY, (err, access_token_data) => {
            if (err){
                // Go back to sign in page
                return res.redirect('/signin/notverified')
            }
            else{
                // Preserves access_token_data for the duration
                // of the callback's call function
                req.access_token_data = access_token_data
                return next()
            }
        })
    }
    // Check if refresh_token exists
    else if (req.cookies.refresh_token){
        // Verify refresh_token
        jwt.verify(req.cookies.refresh_token, SECRET_REFRESH_KEY, (err, refresh_token_data) => {
            if(err){
                // Go back to sign in page
                return res.redirect('/signin/notverified')
            }
            else{
                // Get user's data from refresh_token cookie and
                // send new access_token cookie to user
                id = refresh_token_data.id
                user = refresh_token_data.user
                pass = refresh_token_data.pass
                res.cookie(
                    "access_token", jwt.sign({id: id, user: user, pass: pass}, SECRET_ACCESS_KEY), 
                    {maxAge: '1800000'}
                )
                // Preserves access_token_data for the duration
                // of the callback's call function
                req.access_token_data = refresh_token_data
                return next()
            }
        })
    }
    else {
        // Go back to sign in page
        return res.redirect('/signin/notverified')
    }
}
/** 
 * function: get_phrase
 * 
 * description: fuction to generate a phrase for the sign in page
 * 
 * returns: phrase for the sign in page
 */
function get_phrase(){
    // Phrases to be used for sign in page
    const phrases = [
        "The New Way To Eat!", 
        "Be Mindful! Be Conscious!", 
        "Remember To Stick To The Plan!"
    ]
    // Random generation of an integer in 
    // the range of the number of phrases
    var i_of_phrase = Math.random() * phrases.length
    if (i_of_phrase / 10 > 0.5){
        i_of_phrase = Math.ceil(i_of_phrase)
    }
    else{
        i_of_phrase = Math.floor(i_of_phrase)
    }

    return phrases[i_of_phrase]
}
/** 
 * function: month_from_letter
 * 
 * description: fuction to get month abbreviation
 *              from month number (1-Jan, 2-Feb, ...)
 * 
 * returns: string of month abbreviation 
 */
function month_from_number(numOfMonth){
    const monthNames = ["January", "February", "March", "April", "May", "June","July", "August", "September", "October", "November", "December"];
    return monthNames[numOfMonth]
}


app.listen(PORT, () => {
    console.log('Server Started on port 3000')
})