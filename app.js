const https = requrie('https');
const fs = require('fs');
const express = require("express");
const bodyParser = require("body-parser");
const favicon = require('serve-favicon');
const path = require('path');
const requestIp = require('request-ip');
const validUrl = require('valid-url');
const mongoose = require('mongoose');
const Joi = require("joi");
const { createHash } = require('crypto');
require('dotenv').config();
const pepper = process.env.PEPPER;

const Schema = mongoose.Schema;
const linkSchema = new Schema({
  ipHash: { type: String, required: true },
  link: { type: String },
  isLink: { type: Boolean, required: true },
  description: { type: String },
  date: { type: Date, default: Date.now },
  }, { collection: 'link' });
const LinkModel = mongoose.model('Link', linkSchema);

const dbUri = process.env.URI;
mongoose.connect(dbUri, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connection.once('open', function () {
  console.log('MongoDB database connection established successfully');
  /* mongoose.connection.db.listCollections().toArray(function (err, names) {
    console.log(names);
  }); */
});

const linkJoiSchema = Joi.object({
  ipHash: Joi.string()
    .hex()
    .min(128)
    .max(128)
    .required(),
  link: Joi.string()
    .allow('')
    .max(160),
  isLink: Joi.boolean()
    .required(),
  description: Joi.string()
    .allow('')
    .max(512),
  date: Joi.date()
    .timestamp()
    .required(),
}).max(6);

const linkIdJoiSchema = Joi.string().hex().min(24).max(24);


const app = express();
app.use(require('helmet')());
app.use(express.static("static"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(favicon(path.join(__dirname, 'static', 'favicon.ico')));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'index.html'));
});

const api = express.Router();
app.use('/api/v1', api);

api.get('/links', (req, res) => {
  const ip = requestIp.getClientIp(req);
  const ipHash = createHash('sha512').update(ip + pepper).digest('hex');
  LinkModel.find(
    { ipHash }, 
    ['_id', 'link', 'isLink', 'description'], 
    (err, docs) => {
      if (err) {
        console.log(err);
      } else {
        res.json(docs);
      }
  });
});

api.post('/newlink', (req, res) => {
  if (
    (req.body.link === undefined)
    || (req.body.link === '' && req.body.description === '')
  ) {
    res.json(null);
    return;
  }

  const ip = requestIp.getClientIp(req);
  const ipHash = createHash('sha512').update(ip + pepper).digest('hex');

  LinkModel.find(
    { ipHash }, 
    ['_id', 'date'], 
    (err, docs) => {
      if (err) {
        console.log(err);
        res.json(null);
        return;
      } else {
        if (docs.length >= 50) {
          res.json(null);
          return;
        }

        saveLink(ipHash, req.body);
      }
  });

  function saveLink(ipHash, body) {
    const recData = {};
    recData.link = body.link ? body.link : '';
    recData.description = body.description ? body.description : '';
    recData.ipHash = ipHash;
    recData.isLink = (validUrl.isWebUri(recData.link)) ? true : false;
    recData.date = new Date();
    const joiVal = linkJoiSchema.validate(recData);
    if (joiVal.error) {
      console.log(joiVal.error);
      res.json(null);
      return;
    }

    const dbData = new LinkModel(recData);
    dbData.save((err, doc) => {
      if (err) {
        console.log(err);
        res.json(null);
      } else {
        res.json({ 
          _id: doc._id, 
          link: doc.link,
          isLink: doc.isLink, 
          description: doc.description 
        });
      }
    });
  }
});

api.put('/editlink', (req, res) => {
  if (
    (req.body.link === undefined)
    || (req.body.link === '' && req.body.description === '')
  ) {
    res.json(null);
    return;
  }

  const ip = requestIp.getClientIp(req);
  const ipHash = createHash('sha512').update(ip + pepper).digest('hex');
  const recData = {};
  recData.link = req.body.link ? req.body.link : '';
  recData.description = req.body.description ? req.body.description : '';
  recData.ipHash = ipHash;
  recData.isLink = (validUrl.isWebUri(recData.link)) ? true : false;
  recData.date = new Date();
  const joiVal = linkJoiSchema.validate(recData);
  if (joiVal.error) {
    console.log(joiVal.error);
    res.json(null);
    return;
  }

  const joiIdVal = linkIdJoiSchema.validate(req.body.id);
  if (joiIdVal.error) {
    console.log(joiVal.error);
    res.json(null);
    return;
  }

  const filtr = { _id: req.body.id, ipHash: ipHash };
  const optn = { returnDocument: 'after' };
  LinkModel.findOneAndUpdate(filtr, recData, optn, (err, doc) => {
    if (err) {
      console.log(err);
      res.json(null);
    } else {
      res.json(doc);
    }
  });
});

api.post('/deletelink', (req, res) => {
  if (!req.body.id) {
    res.json(null);
    return;
  }

  const joiVal = linkIdJoiSchema.validate(req.body.id);
  if (joiVal.error) {
    console.log(joiVal.error);
    res.json(null);
    return;
  }

  const ip = requestIp.getClientIp(req);
  const ipHash = createHash('sha512').update(ip + pepper).digest('hex');
  const filtr = { _id: req.body.id, ipHash: ipHash };
  LinkModel.findOneAndDelete(filtr, (err) => {
    if (err) {
      console.log(err);
      res.json(null);
    } else {
      res.json('ok');
    }
  });
});

api.post('/deleteall', (req, res) => {
  const ip = requestIp.getClientIp(req);
  const ipHash = createHash('sha512').update(ip + pepper).digest('hex');
  LinkModel.deleteMany({ ipHash: ipHash }, (err, result) => {
    if (err) {
      console.log(err);
      res.json(null);
    } else {
      res.json(result.deletedCount);
    }
  });
});

const options = {
  key: fs.readFileSync(''),
  cert: fs.readFileSync('')
};
http.createServer(app).listen(80, () => console.log('server started'));
https.createServer(options, app).listen(443, () => console.log(`secure server started`))