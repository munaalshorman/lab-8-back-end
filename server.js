'use strict';
//---------------- Application Dependencies------------
require('dotenv').config();
const express=require('express');
const cors= require('cors');
const superagent=require('superagent');
const pg =require('pg');


//----------------- Application Setup------------------
const app=express();
const PORT=process.env.PORT;

app.use(cors());



//error handeller
app.use('*',(request,response)=>{
    response.status(404).send('not found');
});

app.use((error,request,response)=>{
    response.status(500).send(error);
});





//port listening
app.listen(PORT,()=>console.log(`app is listening on ${PORT}`));

