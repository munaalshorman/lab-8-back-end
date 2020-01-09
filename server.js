'use strict'
///////////////// dapendencies////////////////////
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const PORT = process.env.PORT || 3000;
const server = express();
server.use(cors());
const superagent = require('superagent')

///for database
const pg = require('pg');
const client = new pg.Client(process.env.DATABASE_URL);
client.on('error', err => console.error(err));

///////////////////////////////////

server.get('/location', locationHandler);
server.get('/weather', weatherHandler);
server.get('/events', eventHandler);
//////////////////////////////////////

/////////////location//////////////////

function locationHandler(request, response) {
  let SQL = 'select * FROM location WHERE search_query=$1 ';
  let city = request.query.city;
  let values = [city];
  // console.log(values);
  return client.query(SQL, values)
    .then(results => {
      if (results.rowCount) {
        console.log('city in database');
        return response.status(200).json(results.rows[0])
      }
      else { console.log('I need to add city to database'); getLocation(city, response) }
    })
}

function getLocation(city, response) {
  const url = `https://us1.locationiq.com/v1/search.php?key=${process.env.GEOCODE_API_KEY}&q=${city}&format=json&limit=1`;        // console.log(url);
  return superagent.get(url)
    .then(data => {
      console.log('Iam trying add city to DB after getting the data');
      let locationData = new Location(city, data.body);
      let SQL = 'INSERT INTO location(search_query,formatted_query,latitude,longitude) VALUES($1,$2,$3,$4) RETURNING *';
      let values = [city, locationData.formatted_query, locationData.latitude, locationData.longitude];
      return client.query(SQL, values)
        .then(results => {
          console.log('the city added to DB');
          return response.status(200).json(results.rows[0])
        })
        .catch(error => errorHandler(error));
    })

}
////////location constructor function////////
function Location(city, locationData) {
  this.search_query = city;
  this.formatted_query = locationData[0].display_name;
  this.latitude = locationData[0].lat;
  this.longitude = locationData[0].lon;
}

/////////////weather//////////////////
function Weather(day) {
  this.time = new Date(day.time * 1000).toDateString();
  this.forecast = day.summary;
}

function weatherHandler(request, response) {
  let lat = request.query.latitude;
  let lng = request.query.longitude;
  // console.log(request)
  getWeatherData(lat, lng)   //request
    .then((data) => {
      response.status(200).send(data);  //response
    });

}

function getWeatherData(lat, lng) {
  const url = `https://api.darksky.net/forecast/${process.env.DARKSKY_API_KEY}/${lat},${lng}`;
  return superagent.get(url)
    .then((weatherData) => {
      // console.log(weatherData.body.daily.data);
      let weather = weatherData.body.daily.data.map((day) => new Weather(day));
      return weather;
    });
}


/////////////events//////////////////


function eventHandler(request,response) {
  getEvent(request.query)
  // console.log('jjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj',request.query.search_query)
    .then( eventData => response.status(200).json(eventData) );

} 

function getEvent(query) {
  const url = `http://api.eventful.com/json/events/search?app_key=${process.env.EVENTFUL_API_KEY}&location=${query.search_query}`;
   console.log('url eventttttttttttttttttttttttttttttttttttttttttttt :', url ); 
    // console.log('querrrrrrrrrrrrry : \n\n\n\n\n\n ', query );
    // console.log('super agent urllllllllllll' ,superagent.get(url));

    return superagent.get(url)
    .then( data => {   
      // console.log('data 22222222222222222222222222222222222222222222222222222 :/n/n ', data.text );   
      const eventful = JSON.parse(data.text);
      // console.log('eventful ', eventful);
      return eventful.events.event.map( (eventday) => {
        // console.log('eventday : ', eventday);
        return new Eventful(eventday);
      });
    });
}

function Eventful(eventday) {
  this.link = eventday.url;
  this.name = eventday.title;
  this.event_date = eventday.start_time;
  this.summary = eventday.description;

}



////////////////////////// Errors////////////////////////
server.use('*', (request, response) => {
  response.status(404).send('Error');
});

server.get('*', (request, response) => {
  response.status(500).send('HAAAAAAAAA');

});
function errorHandler(error) {
  response.status(500).send(error);
}

/////////////////////////listen to server PORT /////////////////////
client.connect()
  .then(() => {
    server.listen(PORT, () => console.log(`App listening on ${PORT}`))
  })
  .catch(err => {
    throw `PG Startup Error: ${err.message}`;
  });


