var express = require('express'),
    bodyParser = require('body-parser'),
    app = express(),
    port = 4222,
    address = "127.0.0.1",
    pg = require("pg");

var user = process.env.POSTGRES_USER,
    password = process.env.POSTGRES_PASSWORD,
    connection = "postgres://" + user + ":" + password + "@localhost/drones";

app.set('title', 'Sheep surveillance');
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', function (req, res) {
    pg.connect(connection, function (err, client, done) {
        if (err) {
            return console.error('error fetching client from pool', err);
        }

        client.query('SELECT * FROM drone_sightings ORDER BY drone_id, seen desc', function (err, result) {
            if (err) {
                console.log(err);
            }

            var drones = {};
            var maxId = -1;
            result.rows.map(function(row) {
                if (drones[row.drone_id] === undefined) {
                    drones[row.drone_id] = { id: row.drone_id, positions: []}
                }

                drones[row.drone_id].positions.push({
                    lat: row.lat,
                    lon: row.lon,
                    timestamp: row.seen
                });
            });

            client.query('SELECT MAX(id) FROM drone_sightings', function (err, result) {
                if (err) {
                    console.log(err);
                }
                var response = {
                    updateID: result.rows[0].max,
                    drones: Object.keys(drones).map(function(key) {
                        return drones[key];
                    })
                };

                res.set('Content-Type', 'application/json');
                res.end(JSON.stringify(response));
                client.end();
            });
        });
    });
});

app.post('/', function(req, res) {
    pg.connect(connection, function (err, client, done) {
        if (err) {
            return console.error('error fetching client from pool', err);
        }

        client.query('INSERT into drone_sightings (lat, lon, drone_id) VALUES($1, $2, $3) returning drone_id', [req.body.lat, req.body.lon, req.body.minor], function (err, result) {
            if (err) {
                console.log(err);
            } else {
                console.log('row inserted with id: ' + result.rows[0].drone_id);
                client.end();
            }
        });
    });
    console.log("Mah bod:", req.body);
    res.end('Thanks for choosing to update drone positions');
});

app.listen(port, address);
console.log('Express server started on %s:%s', address, port);
