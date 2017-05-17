var express = require("express");
var bodyParser = require('body-parser');
var app = express();
var fs = require('fs');
var rp = require('request-promise');
var _ = require('underscore');
var IP = process.argv.slice(2)[0];
if (!IP) {
  console.log("no IP arg");
  process.exit(1);

}
console.log("IP is", IP);
var global_data = JSON.parse(fs.readFileSync('./data/es-en-medium.vocab.questions.js', 'utf8'));
var global_col_headers = _.map(global_data["0"], function(row) {
  return row.cats.join(', ').replace('Simple-', '');
});
var global_cat_grid = {};
var global_lemcat2pair = {};
var global_pair2questions = {};

for (var row_key in global_data) {
  global_cat_grid[row_key] = {};
  for (var col_key in global_data[row_key]) {
    pair_obj = global_data[row_key][col_key];
    global_cat_grid[row_key][col_key] = {
      lemcat: row_key + ', ' + pair_obj.cats.join(', '),
      'isTest': pair_obj.isTest
    };
    global_lemcat2pair[global_cat_grid[row_key][col_key].lemcat] = pair_obj.l1_str + ',' + pair_obj.l2_str;
    global_pair2questions[pair_obj.l1_str + ',' + pair_obj.l2_str] = pair_obj.questions;
  }
}

app.set('port', process.env.PORT || 8001);
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public/'));
app.set('views', __dirname + '/views');
app.set('view engine', 'pug');

app.get('/practice_selection', function(req, res) {
  var lemcat = req.query.lemcat;
  var questions = global_pair2questions[global_lemcat2pair[lemcat]];
  var categories = _.map(questions, function(q) {
    return q.confusers_cats.join(',');
  });
  res.render('practice_selection', {
    title: 'Select Question',
    categories: categories,
    lemcat: lemcat
  });
});

app.get('/reveal', function(req, res) {
  var pair = global_lemcat2pair[req.query.lemcat];
  var q = global_pair2questions[pair][0];
  var phrase_pair = {
    'l1_str': q.l1_str,
    'l2_str': q.l2_str
  };
  res.render('reveal', {
    title: 'Reveal',
    phrase_pair: phrase_pair
  });
});

app.get('/practice', function(req, res) {
  var practice_choice = JSON.parse(req.query.practice_choice);
  console.log(practice_choice);
  var lemcat = practice_choice.lemcat;
  var confusers_cats = _.sample(practice_choice.confusers_cats);
  var practice_type = _.sample(practice_choice.practice_type);
  var direction = _.sample(practice_choice.direction);
  var questions = global_pair2questions[global_lemcat2pair[lemcat]];
  var q = _.find(questions, function(q) {
    return q.confusers_cats.join(',') == confusers_cats;
  });
  var con_answer;
  var mc_q = {};
  if (direction == 'f2e') {
    con_answer = _.shuffle(q.l1_confusers).slice(0, 4);
    con_answer = con_answer.concat([q.l1_str]);
    mc_q.prompt_str = q.l2_str;
  } else {
    con_answer = _.shuffle(q.l2_confusers).slice(0, 4);
    con_answer = con_answer.concat([q.l2_str]);
    mc_q.prompt_str = q.l1_str;
  }
  con_answer = _.shuffle(con_answer);
  mc_q.confusers_with_answer = con_answer;
  res.render(practice_type, {
    title: 'Practice Question',
    direction: direction,
    question: mc_q,
    question_str: JSON.stringify(mc_q),
    IP: IP
  });
});

app.get('/', function(req, res) {
  var col_headers = _.map(global_data["0"], function(row) {
    return row.cats.join(', ').replace('Simple-', '');
  });
  res.render('pair_selection', {
    title: 'Select Training Pair',
    headers: global_col_headers,
    message: global_cat_grid
  });
});

app.get('/back', function(req, res) {
  var col_headers = _.map(global_data["0"], function(row) {
    return row.cats.join(', ').replace('Simple-', '');
  });
  res.render('pair_selection', {
    title: 'Select Training Pair',
    headers: global_col_headers,
    message: global_cat_grid
  });
});

var server = app.listen(app.get('port'), function() {
  console.log("Listening on port %s...", server.address().port);
});

var http = require('http').Server(app);
var io = require('socket.io').listen(server);
http.listen(8001, "127.0.0.1");

io.on('connection', function(socket) {
  var clientId = socket.id;
  console.log("connected to client..." + clientId);

  socket.on('checkUserTestAnswer', function(msg) {
    var q = JSON.parse(msg.question);
  });

  socket.on('checkUserAnswer', function(msg) {
    var q = JSON.parse(msg.question);
    var prompt_str = q.prompt_str;
    var user_answer = msg.user_answer;
    var check_pair;
    if (msg.direction == 'f2e'){
      //prompt is foreign
      check_pair  = user_answer + ',' + q.prompt_str;
    }else{
      //prompt is english
      check_pair  = q.prompt_str + ',' + user_answer;
    }
    var feedback;
    if (_.has(global_pair2questions, check_pair)){
      feedback = {'result': 'correct', 'symbol': '✔'};
    }else{
      feedback = {'result': 'wrong', 'symbol': '✘'};
    }
    console.log(feedback);
    io.to(clientId).emit('user_answer_feedback', feedback);

  });
});
