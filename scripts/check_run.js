const https = require('https');

function check() {
  https.get('https://github.com/liqinxin374-eng/watermelon-alarm/actions/runs/32235198462', { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      console.log('Status code:', res.statusCode);
      // look for job names and failure info
      const lines = d.split('\n');
      lines.forEach(l => {
        if (l.includes('failed') || l.includes('error') || l.includes('Error') || l.includes('Failed')) {
          if (l.length < 200) console.log('Log line:', l.trim());
        }
      });
    });
  });
}

check();
