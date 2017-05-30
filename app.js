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
var global_fulldata = JSON.parse(fs.readFileSync('./data/es-en-medium.vocab.questions.js', 'utf8'));
var global_fullcol_headers = _.map(global_fulldata["0"], function(row) {
  return row.cats.join(', ').replace('Simple-', '');
});
var global_demodata = JSON.parse(fs.readFileSync('./data/es-en-tiny.vocab.questions.js', 'utf8'));
var global_democol_headers = _.map(global_demodata["0"], function(row) {
  return row.cats.join(', ').replace('Simple-', '');
});

var global_fulllemcat2pair = {};
var global_fullpair2questions = {};
var global_fullquizpairs = [];
var global_fullgroups = {};

var global_demolemcat2pair = {};
var global_demopair2questions = {};
var global_demoquizpairs = [];
var global_demogroups = {};

for (var row_key in global_fulldata) {
  for (var col_key in global_fulldata[row_key]) {
    po = global_fulldata[row_key][col_key];
    for (var po_idx  in po){
      var pair_obj = po[po_idx];
      if (pair_obj.isTest) {
      }else{
        pair_obj.direction = _.sample(['e2f', 'f2e']);
        var lst = global_fullgroups[row_key];
        if (lst === undefined){
          lst = [pair_obj];
        }else{
          lst.push(pair_obj);
        }
        global_fullgroups[row_key] = lst;
      }
      global_fulllemcat2pair[pair_obj.lemcat] = pair_obj.l1_str + ',' + pair_obj.l2_str;
      global_fullpair2questions[pair_obj.l1_str + ',' + pair_obj.l2_str] = pair_obj.questions;
      if (pair_obj.isTest){
        global_fullquizpairs.push(pair_obj);
      }else{
      }
    }
  }
}

for (var row_key in global_demodata) {
  for (var col_key in global_demodata[row_key]) {
    po = global_demodata[row_key][col_key];
    for (var po_idx  in po){
      var pair_obj = po[po_idx];
      if (pair_obj.isTest) {
      }else{
        pair_obj.direction = _.sample(['e2f', 'f2e']);
        var lst = global_demogroups[row_key];
        if (lst === undefined){
          lst = [pair_obj];
        }else{
          lst.push(pair_obj);
        }
        global_demogroups[row_key] = lst;
      }
      global_demolemcat2pair[pair_obj.lemcat] = pair_obj.l1_str + ',' + pair_obj.l2_str;
      global_demopair2questions[pair_obj.l1_str + ',' + pair_obj.l2_str] = pair_obj.questions;
      if (pair_obj.isTest){
        global_demoquizpairs.push(pair_obj);
      }else{
      }
    }
  }
}

app.set('port', process.env.PORT || 8001);
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public/'));
app.set('views', __dirname + '/views');
app.set('view engine', 'pug');

app.get('/quiz', function(req, res) {
  console.log(req.query, 'is the q');
  var isDemo = JSON.parse(req.query.isDemo);
  var reward = parseFloat(req.query.reward);
  global_fullquizpairs = _.shuffle(global_fullquizpairs);
  var quiz_list = [];
  for (var sp_key in (isDemo ? global_demoquizpairs: global_fullquizpairs)) {
    var sp = global_fullquizpairs[sp_key];
    var qq = {};
    var direction = _.sample(['e2f', 'f2e']);
    if (direction == 'f2e') {
      qq.prompt_str = sp.l2_str;
      qq.direction = direction;
    }else{
      qq.prompt_str = sp.l1_str;
      qq.direction = direction;
    }
    qq.full = sp;
    quiz_list.push(qq);
  }
  res.render('quiz',{
      title: 'Quiz',
      quiz_questions: quiz_list,
      reward: reward.toFixed(2)
  });
});

app.get('/practice_selection', function(req, res) {
  var lemcat = req.query.lemcat;
  var questions = global_fullpair2questions[global_fulllemcat2pair[lemcat]];
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
  console.log(req.query.lemcat, 'here');
  console.log(global_fulllemcat2pair);
  var pair = global_fulllemcat2pair[req.query.lemcat];
  var q = global_fullpair2questions[pair][0];
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
  var questions = global_fullpair2questions[global_fulllemcat2pair[lemcat]];
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

/*app.get('/', function(req, res) {
  var col_headers = _.map(global_fulldata["0"], function(row) {
    return row.cats.join(', ').replace('Simple-', '');
  });
  res.render('group_selection', {
    title: 'Select Training Pair',
    headers: global_fullcol_headers,
    message: global_fulldata
  });
});
*/
app.get('/', function(req, res) {
  res.render('index', {
    title: 'Flash Card Training',
  });
});

app.get('/start', function(req, res) {
  var isDemo = JSON.parse(req.query.isDemo);
  var col_headers = _.map(global_fulldata["0"], function(row) {
    return row.cats.join(', ').replace('Simple-', '');
  });
  res.render('card_selection_rand', {
    title: 'Select Training Pair',
    headers: isDemo ? global_democol_headers : global_fullcol_headers,
    groups: isDemo ? global_demogroups : global_fullgroups,
    isDemo: isDemo.toString(),
    reward: 1.0
  });
});

app.get('/back', function(req, res) {
  var col_headers = _.map(global_fulldata["0"], function(row) {
    return row.cats.join(', ').replace('Simple-', '');
  });
  res.render('group_selection', {
    title: 'Select Training Pair',
    headers: global_fullcol_headers,
    message: global_fulldata 
  });
});

var server = app.listen(app.get('port'), function() {
  console.log("Listening on port %s...", server.address().port);
});

//var http = require('http').Server(app);
//var io = require('socket.io').listen(server);
//http.listen(8001, "127.0.0.1");
/*
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
    if (_.has(global_fullpair2questions, check_pair)){
      feedback = {'result': 'correct', 'symbol': '✔'};
    }else{
      feedback = {'result': 'wrong', 'symbol': '✘'};
    }
    console.log(feedback);
    io.to(clientId).emit('user_answer_feedback', feedback);

  });
});
*/
