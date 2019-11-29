'use strict'
///////////////// dapendencies////////////////////
require('dotenv').config();
const express=require('express');
const cors =require('cors');
const superagent = require('superagent')
const PORT = process.env.PORT;
const pg = require('pg');
const server = express();
const client = new pg.Client(process.env.DATABASE_URL);
server.use(cors());
client.on('error', err => console.error(err));


///////////////////////////////////

server.get('/location', locationHandler);
server.get('/weather', weatherHanddler);
server.get('/events', eventHanddler);
//////////////////////////////////////

/////////////location//////////////////

function locationHandler(request, response) {
  getLocation(request.query.data)
  console.log('request.query.data : ', request.query.data)
    .then(data => response.status(200).json(data))
    .catch((error) => errorHandler(error, request, response));
}

///////// data from API for location /////
function getLocation(city) {
  let SQL = 'SELECT * FROM location WHERE search_query = $1 ';
  let values = [city];
  return client.query(SQL, values)
    .then(results => {
      if (results.rowCount) {
        return results.rows[0];
      }
      else {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${city}&key=${process.env.GEOCODE_API_KEY}`;

        return superagent.get(url)
          .then(data => cacheLocation(city, data.body));
      }
    });
};
let cache = {};
function cacheLocation(city, data) {
  const location = new Location(data.results[0]);
  let SQL = 'INSERT INTO location (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4) RETURNING *';
  let values = [city, location.formatted_query, location.latitude, location.longitude];
  return client.query(SQL, values)
    .then(results => {
      const savedLocation = results.rows[0];
      cache[city] = savedLocation;
      return savedLocation;
    });
}

////////location constructor function////////
function Location(city, data) {
  this.formatted_query = data.results[0].formatted_addresponses;
  this.latitude = data.results[0].geometry.location.lat;
  this.longitude = data.results[0].geometry.location.lng;
}

/////////////weather//////////////////
function weatherHanddler(request, response) {

  getWeather(request.query.data)
    .then(weatherData => response.status(200).json(weatherData));
};
///////   data from API for weather /////
function getWeather(query) {
  const url = `https://api.darksky.net/forecast/${process.env.DARKSKY_API_KEY}/${query.latitude},${query.longitude}`;
  return superagent.get(url)
    .then(data => {
      let weather = data.body;
      return weather.daily.data.map((day) => {
        return new Weather(day);
      });
    });
};

/////////weather constructor function////////

function Weather(day) {

  this.forecast = day.summary;
  this.time = new Date(day.time * 1000).toDateString();

}

/////////////event//////////////////
function eventHanddler(request, response) {
  getEventINFO(request.query.data)
    .then(eventData => response.status(200).json(eventData));
};
/////// data from API for event /////
function getEventINFO(query) {
  const url = `http://api.eventful.com/json/events/search?app_key=${process.env.EVENTBRITE_API_KEY}&location=${query.formatted_query}`;
  return superagent.get(url)
    .then(data => {
      let eventl = JSON.parse(data.text);
      return eventl.events.event.map((day) => {
        return new Event(day);
      });
    });
};



////////Event constructor function////////

function Event(day) {
  this.link = day.url;
  this.name = day.title;
  this.event_date = day.start_time;
  this.summary = day.description

}

////////// Errors////////////////////////
server.use('*', (request, response) => {
  response.status(404).send('Error');
});

server.get('*', (request, response) => {
  response.status(500).send('HAAAAAAAAA');
});
function errorHandler(error, request, response) {
  response.status(500).send(error);
}
/////////////////////////listen to server PORT /////////////////////
client.connect()
  .then(() => {
    server.listen(PORT, () => console.log(`App listening on ${PORT}`))
  });

