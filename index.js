const Client = require('ssh2').Client;
const readline = require('readline');
const conn = new Client();

function action(data, map) {
    let ret = { cmd: null, once: false, ran: false };
    for (let x in map) {
        if (data.indexOf(x) > -1) {
            ret = map[x];
        }
    }
    return ret;
}

module.exports = {
    init: function({ config, map }) {
        for (let x in map) {
            console.log(x, Array.isArray(map[x]));
            if (Array.isArray(map[x])) {
                map[x].cmd = map[x][0];
                map[x].once = map[x][1] === 'once';
                map[x].ran = false;
            } else {
                const cmd = map[x];
                map[x] = {
                    cmd,
                    once: false,
                    ran: false
                }
            }
        }

        conn.on('ready', function() {
            console.log('Client :: ready');

            conn.shell(function(err, stream) {
                if (err) throw err;
                // create readline interface
                const rl = readline.createInterface(process.stdin, process.stdout)

                stream.on('close', function() {
                    process.stdout.write('Connection closed.')
                    console.log('Stream :: close');
                    conn.end();
                    process.exit(0);
                }).on('data', function(data) {
                    const act = action(data.toString(), map);
                    if (act.cmd) {
                        if ((act.once && !act.ran) || (!act.once)) {
                            stream.write(act.cmd + '\n');
                            act.ran = true;
                        }
                    }
                    process.stdout.write(data);
                }).stderr.on('data', function(data) {
                    process.stderr.write(data);
                });

                rl.on('line', function(d) {
                    stream.write(d.trim() + '\n')
                })

                rl.on('SIGINT', function() {
                    // stop input
                    process.stdin.pause()
                    process.stdout.write('\nEnding session\n')
                    rl.close()
                    // close connection
                    stream.end('exit\n');
                    conn.end();
                    process.exit(0);
                })
            });
        }).connect({
            host: config.host,
            port: 22,
            username: config.username,
            password: config.password // or provide a privateKey
        });
    }
}