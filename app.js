const express = require('express')
const mysql = require('mysql')
const fs = require('fs')
const bodyParser = require('body-parser')
const { get } = require('http')
const port = 3000


// Create connection to database
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: '',
    database: 'nodemysql'
});
// Connect to database
db.connect(err => {
    if(err){
        throw err;
    }
    console.log("MySQL Connected");
});


const app = express()
app.use(bodyParser.urlencoded({ extended: true }))


var gid = 0

var currentdate = new Date()
var dd = String(currentdate.getDate())
var mm = String(currentdate.getMonth())
var yyyy = currentdate.getFullYear()

currentdate = monthsAsLetter(mm) + dd + yyyy


// Main web page (sign in)
app.get('/', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    fs.readFile('public/views/home.html', (err, data) => {
        if(err){
            res.write('Error: File Not Found!')
        } else{
            res.write(data)
        }
        res.end()
    })
});
app.post('/authenticate', (req, res) => {
    // Ensure Username and Password Match
    var user = req.body.user
    var pass = req.body.pass

    let sql = `SELECT id FROM users WHERE password = '${pass}' AND username = '${user}'`
    let query = db.query(sql, (err, results) => {
        if(err){
            res.write("Wrong Username or Password")
            res.end()
        } else{
            if(results.length != 0 && results[0].id != 0){
                gid = getUserId(pass, user)
                res.redirect('/main')
            } else{

                // Implement DOM Maninpulation With JS
                // To Tell User Message Below

                res.write("Wrong Username or Password")
                res.end()
            }
        }
    })
})


// Sign up page
app.get('/signup', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    fs.readFile('public/views/signup.html', (err, data) => {
        if(err){
            res.write('Error: File Not Found!')
        } else{
            res.write(data)
        }
        res.end()
    })
});
app.post('/register', (req, res) => {
    var user = req.body.user
    var pass = req.body.pass
    var mail = req.body.mail

    let sql = `SELECT id FROM users WHERE email = '${mail}'`
    let query = db.query(sql, (err, results) => {
        if(err){

            // Implement DOM Maninpulation With JS
            // To Tell User Message Below
            console.log(err)
            res.write("Email or username in use!")
            res.end()
        } 
        else{
            // Ensure id doesn't exist
            if(results == 0){ 
                let post = {id: 'AUTO INCREMENT', username: user, password: pass, email: mail}
                let sql = 'INSERT INTO users SET ?'
                let query = db.query(sql, post, err => {
                    if(err){
                        res.write("Something Went Wrong!")
                        res.end()
                    }
                })
                gid = getUserId(pass, user)
                res.redirect('/main')
            }
            else{

                // Implement DOM Maninpulation With JS
                // To Tell User Message Below

                res.write("Email in use")
                res.end()
            }
        }
    })
});


// TODO: Make app.post('/addfoodpage', ...){...} 
// and redirect to addfoodpage with user and
// pass in url param
app.get('/addfoodpage', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    fs.readFile('public/views/addfoodpage.html', (err, data) => {
        if(err){
            res.write('Error: File Not Found!')
        } else{
            
            res.write(data)

        }
        res.end()
    })
})
app.post('/addfood', (req, res) => {

    var foodname = req.body.food
    var fat = req.body.fat
    var carbs = req.body.carbs
    var prots = req.body.prots

    var foodentry = "[" + foodname + "," + fat + "," + carbs + "," + prots + "]"

    console.log(gid)
    console.log(foodentry)
    console.log(currentdate)

    // Ensure id exists to use for SQL query

    /*if(gid != 0){ 
        let post = {id: gid, date: currentdate, food: foodentry}
        let sql = 'INSERT INTO foods SET ?'
        let query = db.query(sql, post, err => {
            if(err){
                throw err
                res.end()
            } else {
                res.redirect('/main')
            }
        })
    }
    else{

        // TODO: Redirect to sign in page (User needs to sign in again)

        res.write("User doesn't exist")
        console.log(gid)
        res.end()
    }*/
})


app.get('/main', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    fs.readFile('public/views/main.html', (err, data) => {
        if(err){
            res.write('Error: File Not Found!')
        } else{
            res.write(data)
            // Get foods eaten today
            let sql = `SELECT food FROM foods WHERE date = '${currentdate}' AND id = '${gid}'`
            let query = db.query(sql, (err, results) => {
                if(err){
                    res.write("Couldn't Get Data")
                } else{
                    console.log(results)
                }
            })
        }
        res.end()
    })
})


function getUserId(pass, user){
    let sql = `SELECT id FROM users WHERE password = '${pass}' AND username = '${user}'`
    let query = db.query(sql, (err, results) => {
        if(err){
            throw err
        } else{
            console.log(results[0].id)
            return results[0].id
        }
    })
}
function monthsAsLetter(numOfMonth){
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun","Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return monthNames[numOfMonth]
}

app.listen(port, () => {
    console.log('Server Started on port 3000')
})