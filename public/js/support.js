var tick_time_rem = 31;
var end_tick_time_rem = 6;
var updateTimerDisp = function(sec, lab, form, type) {
  tick_time_rem = tick_time_rem - 1;
  lab.text("Time:" + tick_time_rem);
};
var updateEndTimerDisp = function(sec, lab) {
  end_tick_time_rem = end_tick_time_rem - 1;
  lab.text("loading next card(" + end_tick_time_rem + ")");
};


var onEndedTimer = function(lab) {
  console.log("end timer");
  get_feedback();
};

$.fn.filterData = function(key, value) {
  return this.filter(function() {
    return $(this).data(key) == value;
  });
};


Array.prototype.shuffle = function() {
  var i = this.length,
    j, temp;
  if (i === 0) return this;
  while (--i) {
    j = Math.floor(Math.random() * (i + 1));
    temp = this[i];
    this[i] = this[j];
    this[j] = temp;
  }
  return this;
};

function Interval(fn, time) {
  var timer = false;
  this.start = function() {
    if (!this.isRunning())
    //timer = setInterval(fn, time);
      timer = setTimeout(fn, time);
  };
  this.stop = function() {
    //clearInterval(timer);
    clearTimeout(timer);
    timer = false;
  };
  this.isRunning = function() {
    return timer !== false;
  };
}

function RemoveAccents(strAccents) {
  var strAccents = strAccents.split('');
  var strAccentsOut = new Array();
  var strAccentsLen = strAccents.length;
  var accents = 'ÀÁÂÃÄÅàáâãäåÒÓÔÕÕÖØòóôõöøÈÉÊËèéêëðÇçÐÌÍÎÏìíîïÙÚÛÜùúûüÑñŠšŸÿýŽž';
  var accentsOut = "AAAAAAaaaaaaOOOOOOOooooooEEEEeeeeeCcDIIIIiiiiUUUUuuuuNnSsYyyZz";
  for (var y = 0; y < strAccentsLen; y++) {
    if (accents.indexOf(strAccents[y]) != -1) {
      strAccentsOut[y] = accentsOut.substr(accents.indexOf(strAccents[y]), 1);
    } else
      strAccentsOut[y] = strAccents[y];
  }
  strAccentsOut = strAccentsOut.join('');
  return strAccentsOut;
}
