var jaccard = require('jaccard');
var crypto = require('crypto');
var request = require('request-promise');

var memjs = require('memjs')

var mc = memjs.Client.create(process.env.MEMCACHIER_SERVERS, {
  failover: true,  // default: false
  timeout: 1,      // default: 0.5 (seconds)
  keepAlive: true  // default: false
})

// API stuff
var apiKey = process.env.LB_KEY;
var apiSecret = process.env.LB_SECRET;

var timestamp = Math.floor(Date.now() / 1000);

const send = async (cursor, movies, memberID) => {
  const res = await mc.get(memberID);

  if (!(res.value === null)) {
    return JSON.parse(res.value.toString('utf8'))
  }

  const nonce = crypto.randomBytes(16).toString('base64');
  const path = `https://api.letterboxd.com/api/v0/films?nonce=${nonce}&perPage=100&member=${memberID}&apikey=${apiKey}&timestamp=${timestamp}&cursor=${cursor}`;
  const message = 'GET' + "\u0000" + path + "\u0000" + '';
  const signature = crypto.createHmac("sha256", apiSecret).update(message).digest("hex");
  const result = await request.get(path + `&signature=${signature}`);

  json = JSON.parse(result)
  cursor = json.next

  movies = [...movies, ...json.items.map(a => a.id)]

  if (cursor) {
    return send(cursor, movies, memberID);
  } else {

    mc.set(memberID, JSON.stringify(movies), {expires:86400}, function(err, val) {
      if(err != null) {
        console.log('Error setting value: ' + err)
      }
    })

    return movies;
  }
}

const member_search = async (query) => {
  if (query == "") {
    throw new Error("blank name");
  }

  const options = {
    method: 'GET',
    uri: `https://letterboxd.com/${query}/`,
    resolveWithFullResponse: true
  };
  
  const result = await request(options);
  
  return result.headers['x-letterboxd-identifier'];
}

module.exports = {
  go : async (data) => {
    try {
      lids = await Promise.all([member_search(data.username1), member_search(data.username2)]);
    } catch(e) {
      return "username error"
    }

    try {
      movies = await Promise.all([send('start=0', [], lids[0]), send('start=0', [], lids[1])]);
    } catch(e) {
      return "request failed, please try again."
    }

    return jaccard.index(movies[0], movies[1]) //, movies[0].filter(value => -1 !== movies[1].indexOf(value)) [this is intersection]
  }
};