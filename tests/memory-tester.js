module.exports = function (tests, cb) {

  var
  palikka = require('../palikka.js'),
  testsLen = tests.length,
  sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'],
  rss = 0,
  heapTotal = 0,
  heapUsed = 0;

  function bytesToSize(bytes) {

    if (bytes == 0) {
      return 0;
    }

    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));

    if (i == 0) {
      return bytes + ' ' + sizes[i];
    }

    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];

  }

  function logMemChange(print) {

    var
    mem = process.memoryUsage(),
    rssChange =  Math.abs(rss - mem.rss),
    heapTotalChange = Math.abs(heapTotal - mem.heapTotal),
    heapUsedChange = Math.abs(heapUsed - mem.heapUsed);

    if (print) {
      console.log(' - rss change        ' + (mem.rss >= rss ? '+' : '-') + ' ' + bytesToSize(parseInt(rssChange)));
      console.log(' - heapTotal change  ' + (mem.heapTotal >= heapTotal ? '+' : '-') + ' ' + bytesToSize(parseInt(heapTotalChange)));
      console.log(' - heapUsed change   ' + (mem.heapUsed >= heapUsed ? '+' : '-') + ' ' + bytesToSize(parseInt(heapUsedChange)));
    }

    rss = mem.rss;
    heapTotal = mem.heapTotal;
    heapUsed = mem.heapUsed;

  }

  function start() {

    console.log('---');
    console.log('START');
    logMemChange();
    console.log('---');

  }

  function end() {

    console.log('END');
    console.log('---');

    if (typeof cb === 'function') {
      cb();
    }

  }

  if (!testsLen) {

    console.log('No tests provided');
    cb();

  }
  else {

    start();

    for (var i = 0; i < testsLen; i++) {
      tests[i]();
      logMemChange(true);
      console.log('---');
    }

    end();

  }

};