const fs = require('fs');
const list = JSON.parse(fs.readFileSync('delegacoes.json'));
const {
    spawn
} = require('child_process');
const { runInContext } = require('vm');


let current_delegacao = 0;
let num_delegacoes = list.length;
let running = 0;
const limit = process.argv[2];

function doit() {
    if(current_delegacao < num_delegacoes) {
        for(let i = running; i < limit;i++) {
            let delegacao = list[current_delegacao];
            let fetcher = spawn('node', ['fetcher.js', delegacao.name, delegacao.username, delegacao.password]);
            console.log(`START ${delegacao.name}`);
            current_delegacao++;
            running++;
            fetcher.stdout.on('data', (data) => {
                console.log(`INFO ${delegacao.name}: ${data}`);
            });

            fetcher.stderr.on('data', (data) => {
                console.error(`ERR ${delegacao.name}`);
            });

            fetcher.on('close', (code) => {
                console.log(`COMPLETE ${delegacao.name}`);
                running--;
                if(current_delegacao == num_delegacoes) {
                    if(running == 0) {
                        process.exit(1);
                    }
                    else {
                        console.log(`STILL RUNNING ${running} FETCHERS`);
                    }
                }
            });
        }
    }
}

setInterval(doit, process.argv[3]);