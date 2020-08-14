const fs = require('fs');
const list = JSON.parse(fs.readFileSync('delegacoes.json'));
const {
    spawn
} = require('child_process');


list.forEach(delegacao => {
    let fetcher = spawn('node', ['fetcher.js', delegacao.name, delegacao.username, delegacao.password]);
    fetcher.stdout.on('data', (data) => {
        console.log(`${delegacao.name}: ${data}`);
    });

    fetcher.stderr.on('data', (data) => {
        console.error(`${delegacao.name} (ERR): ${data}`);
    });

    fetcher.on('close', (code) => {
        console.log(`${delegacao.name} concluido`);
    });
});