module.exports = function (tests, cb) {

  var
  palikka = require('../palikka.js'),
  testsLen = tests.length,
  rss = 0,
  heapTotal = 0,
  heapUsed = 0;

  function bytesToSize(bytes) {

    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes == 0) return 'n/a';
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    if (i == 0) return bytes + ' ' + sizes[i];
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

  console.log('---');
  console.log('START');
  logMemChange();
  console.log('---');

  if (testsLen) {
    for (var i = 0; i < testsLen; i++) {
      tests[i]();
      logMemChange(true);
      console.log('---');
    }
  }

  console.log('END');
  console.log('---');

  if (typeof cb === 'function') {
    cb();
  }

};