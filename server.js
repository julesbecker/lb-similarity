const express = require('express')
const bodyParser = require('body-parser')
var main = require('./main');
const app = express()
var server = require('http').Server(app);
var io = require('socket.io')(server);

app.set('view engine', 'pug')
app.use(express.static('public'))
app.use(require('express-promise')());
app.use(bodyParser.urlencoded({ extended: true }))

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Listening on port ${PORT}!`));

app.get('/', (req, res) => res.render("index"))

app.post('/compare', async function (req, res) {
  await res.render('results', { user1: req.body.user1, user2: req.body.user2});
  const score = await main.go({ username1: req.body.user1, username2: req.body.user2 });
  io.sockets.emit(req.body.user1 + "+" + req.body.user2, score);
})
