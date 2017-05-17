var tick_time_rem = 31;
var end_tick_time_rem = 6;
var updateTimerDisp = function(sec, lab, form, type) {
  tick_time_rem = tick_time_rem - 1;
  lab.text("Time:" + tick_time_rem);
};
var updateEndTimerDisp = function(sec, lab) {
  end_tick_time_rem = end_tick_time_rem - 1;
  lab.text("loading next card(" + end_tick_time_rem + ")" );
};


var onEndedTimer = function(lab) {
    console.log("end timer");
    get_feedback();
};
